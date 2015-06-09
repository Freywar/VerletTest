/// <reference path="core.js" />
/// <reference path="verlet.js" />

/// <summary> Main application class. </summary>
var App = cls(MObject, function (options)
{
    this._domNode = Utils.DOM.create('div', 'App');
    this._domNode.onmousedown = this._onMouseDown.bind(this);
    this._domNode.onmousemove = this._onMouseMove.bind(this);
    this._domNode.onmouseup = this._onMouseUp.bind(this);
    window.onunload = this._save.bind(this);
    window.onkeydown = this._onKeyDown.bind(this);

    this._canvas = Utils.DOM.create('canvas', '', this._domNode);
    this._context = this._canvas.getContext('2d');
    this._infoBox = Utils.DOM.create('div', 'Box', this._domNode,'',{left:0});
    this._helpBox = Utils.DOM.create('div', 'Box', this._domNode, [
        'LMB: drag ball',
        'RMB: toggle ball info',
        'F1: toggle help window',
        'F2: show system info',
        'F3: reset'
    ].join('<br />'), {right:0})
  
    this._scene = new V.Scene({
        restrictions: [
            this._damperBox = new V.DamperBox({ points: [], color: 'rgba(0,0,255,0.2)', k: 0.05 }),
            this._box = new V.Box({ points: [], color: 'rgba(255,0,0,0.2)', k: 0.95 }),
            this._attraction = new V.Attraction({ k: 0.05 }),
            this._collision = new V.Collision({ points: [], k: 0.95 })
        ]});

    this._load();
    App.base.constructor.apply(this, arguments);
    if (!this._scene.getPoints())
        this._init();
    this._onAnimationFrame();
});

/// <summary> Main node. </summary>
App.property('domNode', { value: null, get: true });
/// <summary> Canvas node. </summary>
App.property('canvas', { value: null });
/// <summary> Canvas rendering context. </summary>
App.property('context', { value: null });
/// <summary> Info box node. </summary>
App.property('infoBox', { value: null });
/// <summary> Help box node. </summary>
App.property('helpBox', { value: null });
/// <summary> Parent node. </summary>
App.property('parentNode', {
    get: function () { return this._domNode.parentNode; },
    set: function (value)
    {
        if (this._domNode.parentNode)
            this._domNode.parentNode.removeChild(this._domNode);
        if (value)
            value.appendChild(this._domNode);
    }
});
/// <summary> Width in pixels. </summary>
App.property('width', {
    get: function () { return this._canvas.width; },
    set: function (value)
    {
        var m = value / this.getWidth(),
           sm = Math.sqrt(m),
           points = this._scene && this._scene.getPoints();
        if (points)
            for (var i = 0; i < points.length; i++)
            {
                points[i].setCx(points[i].getCx() * m);
                points[i].setPx(points[i].getPx() * m);
                points[i].setR(points[i].getR() * sm)
            }

        this._canvas.style.width = (this._canvas.width = value) + 'px';
        this._damperBox.setWidth(value / 2);
        this._box.setLeft(value / 2);
        this._box.setWidth(value / 2);
    }
});
/// <summary> Height in pixels. </summary>
App.property('height', {
    get: function () { return this._canvas.height; },
    set: function (value)
    {
        var m = value / this.getHeight(),
            sm = Math.sqrt(m),
            points = this._scene && this._scene.getPoints();
        if (points)
            for (var i = 0; i < points.length; i++)
            {
                points[i].setCy(points[i].getCy() * m);
                points[i].setPy(points[i].getPy() * m);
                points[i].setR(points[i].getR() * sm)
            }

        this._canvas.style.height = (this._canvas.height = value) + 'px';
        this._damperBox.setHeight(value);
        this._box.setHeight(value);
    }
});

/// <summary> Main scene. </summary>
App.property('scene', { value: null })
/// <summary> Left damping box. </summary>
App.property('damperBox', { value: null });
/// <summary> Right normal box. </summary>
App.property('box', { value: null });
/// <summary> Attraction to cursor. </summary>
App.property('attraction', { value: null });
/// <summary> Collision restriction. </summary>
App.property('collision', { value: null });
/// <summary> Time at last step. </summary>
App.property('prevT', { value: NaN });

/// <summary> Current selected point. </summary>
App.property('attractedPoint', { value: null });

/// <summary> Current point showed in info box. </summary>
App.property('infoedPoint', { value: null });
/// <summary> General information in info box flag. </summary>
App.property('showSystemInfo', { value: false })

/// <summary> Recreate points. </summary>
App.method('_init', function ()
{
    var points = [],
        width = this._damperBox.getWidth(),
        height = this._damperBox.getHeight(),
        minSize = Math.min(width, height),
        minBallSize = minSize * 0.05,
        maxBallSize = minSize * 0.1,
        area = width * height,
        usedArea = 0;
    while (usedArea < area * 0.6)
    {
        var r = Math.random() * (maxBallSize - minBallSize) + minBallSize;
        points.push(new V.Ball({
            cx: r + Math.random() * (width - 2 * r),
            cy: r + Math.random() * (height - 2 * r),
            r: r,
            color: Utils.Color.random()
        }));
        usedArea += Math.PI * r * r;
    }
    this._scene.setPoints(points);
    this._collision.setPoints([].concat(points));
    this._damperBox.setPoints([].concat(points));
    this._box.setPoints([]);

    for (var i = 0; i < 100; i++)
        this._scene.update(1); //stabilize the system before first render
});

/// <summary> Save to localStorage. </summary>
App.method('_save', function ()
{
    this._onMouseUp();
    if (typeof (Storage) != "undefined")
    {
        var points = this._scene.getPoints();
        localStorage.setItem('verletAppSaveData', JSON.stringify({
            width: this.getWidth(),
            height: this.getHeight(),
            points: points.map(function (a) { return a.serialize() }),
            frictionIndices: this._damperBox.getPoints().map(function (a) { return points.indexOf(a) }),
            normalIndices: this._box.getPoints().map(function (a) { return points.indexOf(a) }),
            infoedIndex: this._infoedPoint ? points.indexOf(this._infoedPoint) : -1,
            showSystemInfo: this._showSystemInfo
        }));
    }
});

/// <summary> Load from localStorage. </summary>
App.method('_load', function ()
{
    var data;
    if (typeof (Storage) != "undefined" && (data = localStorage.getItem('verletAppSaveData')))
    {
        data = JSON.parse(data);
        this.setWidth(data.width);
        this.setHeight(data.height);
        var points = data.points.map(function (a) { return new V.Ball(a) });
        this._collision.setPoints([].concat(points));
        this._damperBox.setPoints(data.frictionIndices.map(function (a) { return points[a] }));
        this._box.setPoints(data.normalIndices.map(function (a) { return points[a] }));
        this._infoedPoint = points[data.infoedIndex];
        this._showSystemInfo = data.showSystemInfo;
        this._scene.setPoints(points);
    }
});

/// <summary> Update info box. </summary>
App.method('_updateInfoBox', function ()
{
    if (this._infoedPoint || this._showSystemInfo)
    {
        this._infoBox.style.display = '';
        var info = '';
        if (this._infoedPoint)
        {
            var vx = this._infoedPoint.getVx(),
                vy = this._infoedPoint.getVy();

            info += [
                 'Color: ' + '<div class="Color" style="background-color:' + this._infoedPoint.getColor() + '" ></div>',
                 'Mass: 1',
                 'Radius: ' + this._infoedPoint.getR().toFixed(2),
                 'Position: (' + this._infoedPoint.getCx().toFixed(2) + '; ' + this._infoedPoint.getCy().toFixed(2) + ')',
                 'Velocity: ' + Math.sqrt(vx * vx + vy * vy).toFixed(2) + ' (' + vx.toFixed(2) + '; ' + vy.toFixed(2) + ')',
                 'Energy: ' + (vx * vx / 2 + vy * vy / 2).toFixed(2) + ' (' + (vx * vx / 2).toFixed(2) + '; ' + (vy * vy / 2).toFixed(2) + ')',
            ].join('<br />');
        }
        if (this._infoedPoint && this._showSystemInfo)
            info += '<br /><br />';
        if (this._showSystemInfo)
        {
            var fex = 0, fey = 0, fe = 0,
                nex = 0, ney = 0, ne = 0,
                vx, vy, v;
            var fp = this._damperBox.getPoints()
            for (var i = 0; i < fp.length; i++)
            {
                vx = fp[i].getVx();
                vy = fp[i].getVx();
                v = fp[i].getV();
                fex += vx * vx / 2;
                fey += vy * vy / 2;
                fe += v * v / 2;
            }
            var np = this._box.getPoints()
            for (var i = 0; i < np.length; i++)
            {
                vx = np[i].getVx();
                vy = np[i].getVx();
                v = np[i].getV();
                nex += vx * vx / 2;
                ney += vy * vy / 2;
                ne += v * v / 2;
            }
            info += [
                'Left part energy: ' + fe.toFixed(2) + ' (' + fex.toFixed(2) + '; ' + fey.toFixed(2) + ')',
                'Right part energy: ' + ne.toFixed(2) + ' (' + nex.toFixed(2) + '; ' + ney.toFixed(2) + ')',
                'Full energy: ' + (ne + fe).toFixed(2) + ' (' + (nex + fex).toFixed(2) + '; ' + (ney + fey).toFixed(2) + ')'
            ].join('<br />');
        }
        this._infoBox.innerHTML = info;
    }
    else
        this._infoBox.style.display = 'none';
});

/// <summary> Animation frame handler. </summary>
App.method('_onAnimationFrame', function ()
{
    var t = new Date();
    this._prevT = this._prevT || t;
    var dt = t - this._prevT;
    if (dt)
    {
        this._scene.update(dt / 1000);
        this._canvas.width = this._canvas.width;//a bit faster than clearRect
        this._scene.render(this._context);
    }
    this._prevT = t;
    this._updateInfoBox();
    setTimeout(this._onAnimationFrame.bind(this), 15);
});

/// <summary> Mouse down handler. </summary>
App.method('_onMouseDown', function (event)
{
    var points = this._scene.getPoints()
    for (var i = 0; i < points.length; i++)
    {
        var point = points[i],
            dx = event.layerX - point.getCx(),
            dy = event.layerY - point.getCy();
        if (dx * dx + dy * dy < point.getR() * point.getR())
        {
            if (event.button === 0)
            {
                this._attractedPoint = point;
                this._attraction.setPoints([this._attractedPoint]);
                var fp = this._damperBox.getPoints(), fi = fp.indexOf(this._attractedPoint);
                if (~fi) fp.splice(fi, 1);
                var np = this._box.getPoints(), ni = np.indexOf(this._attractedPoint);
                if (ni !== -1) np.splice(ni, 1);
            }
            else if (event.button === 2)
                this._infoedPoint = (this._infoedPoint === point) ? null : point;
        }
    }
});

/// <summary> Mouse move handler. </summary>
App.method('_onMouseMove', function (event)
{
    this._attraction.setX(event.layerX);
    this._attraction.setY(event.layerY);
});

/// <summary> Mouse up handler. </summary>
App.method('_onMouseUp', function (event)
{
    if (this._attractedPoint && event.button === 0)
    {
        ((this._attractedPoint.getCx() - this._attractedPoint.getR() > this._damperBox.getWidth()) ?
            this._box :
            this._damperBox
            ).getPoints().push(this._attractedPoint);
        this._attraction.setPoints(null);
        this._attractedPoint = null;
    }
});

/// <summary> Key down handler. </summary>
App.method('_onKeyDown', function (event)
{
    if (event.keyCode === 112)
    {
        this._helpBox.style.display = this._helpBox.style.display ? '' : 'none';
        event.preventDefault();
    }
    else if (event.keyCode === 113)
    {
        this._showSystemInfo = !this._showSystemInfo;
        event.preventDefault();
    }
    else if (event.keyCode === 114)
    {
        this._init();
        event.preventDefault();
    }
});