/// <reference path="core.js" />
/// <reference path="verlet.js" />

var App = cls(MObject, function (options)
{
    this._domNode = document.createElement('canvas');
    this._context = this._domNode.getContext('2d');
    var points = [];

    for (var i = 0; i < 10; i++)
        points.push(new Ball({ cx: Math.random() * 1000, cy: Math.random() * 1000, r: Math.random() * 100 }));
    var restrictions = [
        this._intersection = new Intersection({ points: [].concat(points) }),
        this._frictionBox = new FrictionBox({ points: [].concat(points), color: 'rgba(0,0,255,0.2)' }),
        this._box = new Box({ points: [], color: 'rgba(255,0,0,0.2)' }),
        this._attraction = new Attractor({ k: 0.05 })
    ];
    this._scene = new Scene({ points: points, restrictions: restrictions });
    App.base.constructor.apply(this, arguments);
    this._domNode.onmousedown = this._onMouseDown.bind(this);
    this._domNode.onmousemove = this._onMouseMove.bind(this);
    this._domNode.onmouseup = this._onMouseUp.bind(this);
    this._onAnimationFrame();
});

App.property('prevT', { value: NaN });
App.property('scene', { value: null })
App.property('intersection', { value: null });
App.property('frictionBox', { value: null });
App.property('box', { value: null });
App.property('attraction', { value: null });
App.property('attractedPoint', { value: null });
App.property('context', { value: null });

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
    get: function () { return this._domNode.width; },
    set: function (value)
    {
        this._domNode.style.width = (this._domNode.width = value) + 'px';
        this._frictionBox.setWidth(value / 2);
        this._box.setLeft(value / 2);
        this._box.setWidth(value / 2);

    }
});
App.property('height', {
    get: function () { return this._domNode.height; },
    set: function (value)
    {
        this._domNode.style.height = (this._domNode.height = value) + 'px';
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
        this._domNode.width = this._domNode.width;//a bit faster than clearRect
        this._scene.render(this._context);
    }
    this._prevT = t;
    setTimeout(this._onAnimationFrame.bind(this), 30);
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
            this._attractedPoint = point
            this._attraction.setPoints([this._attractedPoint]);
            var fp = this._frictionBox.getPoints(), fi = fp.indexOf(this._attractedPoint);
            if (~fi) fp.splice(fi, 1);
            var np = this._box.getPoints(), ni = np.indexOf(this._attractedPoint);
            if (ni !== -1) np.splice(ni, 1);
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
    ((this._attractedPoint.getCx() - this._attractedPoint.getR() > this._frictionBox.getWidth()) ?
        this._box :
        this._frictionBox
        ).getPoints().push(this._attractedPoint);
    this._attraction.setPoints(null);
    this._attractedPoint = null;
});