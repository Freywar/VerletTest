/// <reference path="core.js" />
/// <reference path="verlet.js" />

var App = cls(MObject, function (options)
{
    this._domNode = document.createElement('div');
    this._domNode.className += 'App';
    this._canvas = document.createElement('canvas');
    this._context = this._canvas.getContext('2d');
    this._infoBox = document.createElement('div');
    this._infoBox.className += 'Box';
    this._infoBox.style.left = '0';
    this._helpBox = document.createElement('div');
    this._helpBox.className += 'Box';
    this._helpBox.style.right = '0';
    this._helpBox.innerHTML = [
       'LMB: drag ball',
       'RMB: toggle ball info',
       'F1: toggle help window',
       'F2: restart'
    ].join('<br />');

    this._domNode.appendChild(this._canvas);
    this._domNode.appendChild(this._infoBox);
    this._domNode.appendChild(this._helpBox);

    this._load();
    App.base.constructor.apply(this, arguments);
    if (!this._scene.getPoints())
        this._init();
    this._domNode.onmousedown = this._onMouseDown.bind(this);
    this._domNode.onmousemove = this._onMouseMove.bind(this);
    this._domNode.onmouseup = this._onMouseUp.bind(this);
    window.onunload = this._save.bind(this);
    window.onkeydown = this._onKeyDown.bind(this);
    this._onAnimationFrame();
});

App.property('prevT', { value: NaN });
App.property('scene', { value: null })
App.property('intersection', { value: null });
App.property('frictionBox', { value: null });
App.property('box', { value: null });
App.property('attraction', { value: null });
App.property('attractedPoint', { value: null });
App.property('infoedPoint', { value: null })
App.property('context', { value: null });
App.property('infoBox', { value: null });
App.property('helpBox', { value: null });
App.property('canvas', { value: null });

App.property('domNode', { value: null, get: true });
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
App.property('width', {
    get: function () { return this._canvas.width; },
    set: function (value)
    {
        this._canvas.style.width = (this._canvas.width = value) + 'px';
        this._frictionBox.setWidth(value / 2);
        this._box.setLeft(value / 2);
        this._box.setWidth(value / 2);

    }
});
App.property('height', {
    get: function () { return this._canvas.height; },
    set: function (value)
    {
        this._canvas.style.height = (this._canvas.height = value) + 'px';
        this._frictionBox.setHeight(value);
        this._box.setHeight(value);
    }
});

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
                var fp = this._frictionBox.getPoints(), fi = fp.indexOf(this._attractedPoint);
                if (~fi) fp.splice(fi, 1);
                var np = this._box.getPoints(), ni = np.indexOf(this._attractedPoint);
                if (ni !== -1) np.splice(ni, 1);
            }
            else if (event.button === 2)
                this._infoedPoint = (this._infoedPoint === point) ? null : point;
        }
    }
});

App.method('_onMouseMove', function (event)
{
    this._attraction.setX(event.layerX);
    this._attraction.setY(event.layerY);
});

App.method('_onMouseUp', function (event)
{
    if (this._attractedPoint && event.button === 0)
    {
        ((this._attractedPoint.getCx() - this._attractedPoint.getR() > this._frictionBox.getWidth()) ?
            this._box :
            this._frictionBox
            ).getPoints().push(this._attractedPoint);
        this._attraction.setPoints(null);
        this._attractedPoint = null;
    }
});

App.method('_onKeyDown', function (event)
{
    if (event.keyCode === 112)
    {
        this._helpBox.style.display = this._helpBox.style.display ? '' : 'none';
        event.preventDefault();
    }
    else if (event.keyCode === 113)
        this._init();
});

App.method('_init', function ()
{
    var points = [],
        width = this._frictionBox.getWidth(),
        height = this._frictionBox.getHeight(),
        minSize = Math.min(width, height),
        minBallSize = minSize * 0.05,
        maxBallSize = minSize * 0.1,
        area = width * height,
        usedArea = 0;
    while (usedArea < area * 0.6)
    {
        var r = Math.random() * (maxBallSize - minBallSize) + minBallSize;
        points.push(new Ball({
            cx: r + Math.random() * (width - 2 * r),
            cy: r + Math.random() * (height - 2 * r),
            r: r,
            color: Utils.Color.random()
        }));
        usedArea += Math.PI * r * r;
    }
    this._scene.setPoints(points);
    this._intersection.setPoints([].concat(points));
    this._frictionBox.setPoints([].concat(points));
    this._box.setPoints([]);
})

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
            frictionIndices: this._frictionBox.getPoints().map(function (a) { return points.indexOf(a) }),
            normalIndices: this._box.getPoints().map(function (a) { return points.indexOf(a) }),
            infoedIndex: this._infoedPoint ? points.indexOf(this._infoedPoint) : -1
        }));
    }
});

App.method('_load', function ()
{
    var data, points = null,
        restrictions = [
        this._intersection = new Intersection({ points: [] }),
        this._frictionBox = new FrictionBox({ points: [], color: 'rgba(0,0,255,0.2)', k: 0.05 }),
        this._box = new Box({ points: [], color: 'rgba(255,0,0,0.2)', k: 0.95 }),
        this._attraction = new Attractor({ k: 0.05 })
        ];

    if (typeof (Storage) != "undefined" && (data = localStorage.getItem('verletAppSaveData')))
    {
        data = JSON.parse(data);
        this.setWidth(data.width);
        this.setHeight(data.height);
        points = data.points.map(function (a) { return new Ball(a) });
        this._intersection.setPoints([].concat(points));
        this._frictionBox.setPoints(data.frictionIndices.map(function (a) { return points[a] }));
        this._box.setPoints(data.normalIndices.map(function (a) { return points[a] }));
        this._infoedPoint = points[data.infoedIndex];
    }
    this._scene = new Scene({ points: points, restrictions: restrictions });
})

App.method('_updateInfoBox', function ()
{
    if (this._infoedPoint)
    {
        this._infoBox.style.display = '';
        var x = this._infoedPoint.getCx(),
            y = this._infoedPoint.getCy(),
            vx = (x - this._infoedPoint.getPx()) / this._infoedPoint.getPdt(),
            vy = (y - this._infoedPoint.getPy()) / this._infoedPoint.getPdt();
        this._infoBox.innerHTML = [
            'Color: ' + '<div class="Color" style="background-color:' + this._infoedPoint.getColor() + '" ></div>',
            'Mass: 1',
            'Radius: ' + this._infoedPoint.getR().toFixed(2),
            'Position: (' + x.toFixed(2) + '; ' + y.toFixed(2) + ')',
            'Velocity: ' + Math.sqrt(vx * vx + vy * vy).toFixed(2) + ' (' + vx.toFixed(2) + '; ' + vy.toFixed(2) + ')',
            'Energy: ' + (vx * vx / 2 + vy * vy / 2).toFixed(2) + ' (' + (vx * vx / 2).toFixed(2) + '; ' + (vy * vy / 2).toFixed(2) + ')',
        ].join('<br />');
    }
    else
        this._infoBox.style.display = 'none';
})