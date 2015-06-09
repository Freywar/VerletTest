/// <reference path="core.js" />

var V = namespace();

/// <summary> Basic point of Verlet engine. </summary>
 V.Point = cls(MObject, function (options)
{
    V.Point.base.constructor.apply(this, arguments);
    if (!options.px)
        this._px = this._cx;
    if (!options.py)
        this._py = this._cy;
 });

/// <summary> Color. </summary>
V.Point.property('color', { value: '#000000', get: true, set: true });
/// <summary> Previous X coordinate. </summary>
V.Point.property('px', { value: 0, get: true, set: true });
/// <summary> Current X coordinate. </summary>
V.Point.property('cx', { value: 0, get: true, set: true });
/// <summary> Previous Y coordinate. </summary>
V.Point.property('py', { value: 0, get: true, set: true });
/// <summary> Current Y coordinate. </summary>
V.Point.property('cy', { value: 0, get: true, set: true });
/// <summary> Speed X component. </summary>
V.Point.property('vx', {
    get: function () { return (this._cx - this._px) / this._dt; },
    set: function (value) { this._px = this._cx - value * this._dt; }
});
/// <summary> Speed Y component. </summary>
V.Point.property('vy', {
    get: function () { return (this._cy - this._py) / this._dt; },
    set: function (value) { this._py = this._cy - value * this._dt; }
});
/// <summary> Speed module. </summary>
V.Point.property('v', {
    get: function () { return Math.sqrt(Math.pow(this.getVx(), 2) + Math.pow(this.getVy(), 2)) }
});
/// <summary> Last step time. </summary>
V.Point.property('dt', { value: 0, get: true, set: true });

/// <summary> Update positions. </summary>
/// <param name="dt" type="Number"> Time since last update in seconds. </param>
V.Point.method('update', function (dt)
{
    var cdt = dt / (this._dt || dt);
    this._dt = dt;
    this._cx += (-this._px + (this._px = this._cx)) * cdt;
    this._cy += (-this._py + (this._py = this._cy)) * cdt;
});

/// <summary> Render. </summary>
/// <param name="ctx" type="CanvasRenderingContext"> Rendering context. </param>
V.Point.method('render', function (ctx) { });

V.Point.method('serialize', function ()
{
    var r = V.Point.base.serialize.apply(this, arguments);
    delete r.vx;
    delete r.vy;
    delete r.v;
    return r;
});

/// <summary> Abstract restriction class. </summary>
V.Restriction = cls(MObject, function () { V.Restriction.base.constructor.apply(this, arguments) });

/// <summary> Array of Points which must satisfy restriction. </summary>
V.Restriction.property('points', { value: null, get: true, set: true });

/// <summary> Resolve restriction. </summary>
/// <param name="dt" type="Number"> Time since last update in seconds. </param>
V.Restriction.method('update');

/// <summary> Render. </summary>
/// <param name="ctx" type="CanvasRenderingContext"> Rendering context. </param>
V.Restriction.method('render', function (ctx) { });


/// <summary> Ball. </summary>
V.Ball = cls(V.Point, function () { V.Ball.base.constructor.apply(this, arguments) });

/// <summary> Radius. </summary>
V.Ball.property('r', { value: 0, get: true, set: true });

V.Ball.method('render', function (ctx)
{
    ctx.beginPath();
    ctx.arc(this._cx, this._cy, this._r, 0, Math.PI * 2);
    ctx.fillStyle = this._color;
    ctx.fill();
    var gx = this._cx * (1 - this._r / 3000),
        gy = this._cy * (1 - this._r / 3000),
        grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, this._r * 1.3);
    grad.addColorStop(0, 'rgba(255,255,255,0.3)');
    grad.addColorStop(0.49, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fill();
});

/// <summary> Collision restriction. </summary>
V.Collision = cls(V.Restriction, function () { V.Collision.base.constructor.apply(this, arguments) });

/// <summary> Impulse preservation coefficient. </summary>
V.Collision.property('k', { value: 1, get: true, set: true });

V.Collision.method('update', function (dt)
{
    if (!this._points)
        return;
    for (var i = 0; i < this._points.length; i++)
    {
        for (var j = i + 1; j < this._points.length; j++)
        {
            var one = this._points[i],
                two = this._points[j],
                r1 = (one instanceof V.Ball) ? one.getR() : 0,
                r2 = (two instanceof V.Ball) ? two.getR() : 0,
                x1 = one.getCx(), y1 = one.getCy(),
                x2 = two.getCx(), y2 = two.getCy(),
                dx = x2 - x1,
                dy = y2 - y1,
                dr = Math.sqrt(dx * dx + dy * dy),
                intDr = dr - r1 - r2;
            if (intDr < 0)
            {
                var m = 0.5 * intDr / dr,
                    vx1 = one.getVx(), vy1 = one.getVy(),
                    vx2 = two.getVx(), vy2 = two.getVy(),
                    vm = this._k * (dx * (vx2 - vx1) + dy * (vy2 - vy1)) / (dr * dr);

                one.setCx(x1 + dx * m);
                one.setCy(y1 + dy * m);
                two.setCx(x2 - dx * m);
                two.setCy(y2 - dy * m);
                one.setVx(vx1 + dx * vm);
                one.setVy(vy1 + dy * vm);
                two.setVx(vx2 - dx * vm);
                two.setVy(vy2 - dy * vm);
            }
        }
    }
});

/// <summary> Box restriction. </summary>
V.Box = cls(V.Restriction, function () { V.Box.base.constructor.apply(this, arguments) });

/// <summary> Color. </summary>
V.Box.property('color', { value: '#000000', get: true, set: true });
/// <summary> Impulse preservation for border collision. </summary>
V.Box.property('k', { value: 1, get: true, set: true });
/// <summary> Left coordinate. </summary>
V.Box.property('left', { value: 0, get: true, set: true });
/// <summary> Top coordinate. </summary>
V.Box.property('top', { value: 0, get: true, set: true });
/// <summary> Right coordinate. </summary>
V.Box.property('right', { value: 0, get: true, set: true });
/// <summary> Bottom coordinate. </summary>
V.Box.property('bottom', { value: 0, get: true, set: true });
/// <summary> Width. </summary>
V.Box.property('width', {
    get: function () { return this._right - this._left; },
    set: function (value) { this._right = this._left + value; }
});
/// <summary> Height. </summary>
V.Box.property('height', {
    get: function () { return this._bottom - this._top; },
    set: function (value) { this._bottom = this._top + value; }
});

V.Box.method('update', function (dt)
{
    if (!this._points)
        return;
    for (var i = 0; i < this._points.length; i++)
    {
        var point = this._points[i],
            r = (point instanceof V.Ball) ? point.getR() : 0,
            x = point.getCx(),
            vx = x - point.getPx(),
            y = point.getCy(),
            vy = y - point.getPy(),
            overflow;

        if ((overflow = this._left - x + r) > 0 || (overflow = this._right - x - r) < 0)
        {
            x += 2 * this._k * overflow;
            point.setCx(x);
            point.setPx(x + vx * this._k);
        }
        if ((overflow = this._top - y + r) > 0 || (overflow = this._bottom - y - r) < 0)
        {
            y += 2 * this._k * overflow;
            point.setCy(y);
            point.setPy(y + vy * this._k);
        }
    }
});

V.Box.method('render', function (ctx)
{
    ctx.fillStyle = this._color;
    ctx.fillRect(this._left, this._top, this.getWidth(), this.getHeight());
});


/// <summary> Box with no inertia inside. </summary>
V.DamperBox = cls(V.Box, function () { V.DamperBox.base.constructor.apply(this, arguments) });

V.DamperBox.method('update', function (dt)
{
    if (!this._points)
        return;
    V.DamperBox.base.update.apply(this, arguments);
    for (var i = 0; i < this._points.length; i++)
    {
        this._points[i].setPx(this._points[i].getCx());
        this._points[i].setPy(this._points[i].getCy());
    }
});

/// <summary> Attraction to defined coordinates. </summary>
V.Attraction = cls(V.Restriction, function () { V.Attraction.base.constructor.apply(this, arguments) });

/// <summary> Attractor X coordinate. </summary>
V.Attraction.property('x', { value: 0, get: true, set: true });
/// <summary> Attractor Y coordinate. </summary>
V.Attraction.property('y', { value: 0, get: true, set: true });
/// <summary> Attraction coefficient. </summary>
V.Attraction.property('k', { value: 1, get: true, set: true });

V.Attraction.method('update', function (dt)
{
    if (!this._points)
        return;
    for (var i = 0; i < this._points.length; i++)
    {
        var point = this._points[i];
        point.setCx(point.getCx() * (1 - this._k) + this._x * this._k);
        point.setCy(point.getCy() * (1 - this._k) + this._y * this._k);
    }
})


/// <summary> Verlet integration system. </summary>
V.Scene = cls(MObject, function () { V.Scene.base.constructor.apply(this, arguments); });

/// <summary> All points in system. </summary>
V.Scene.property('points', { value: null, get: true, set: true });
/// <summary> All restrictions in system. </summary>
V.Scene.property('restrictions', { value: null, get: true, set: true });
/// <summary> Restriction resolving count per step. </summary>
V.Scene.property('relaxation', { value: 10, get: true, set: true });

/// <summary> Update positions and resolve restrictions. </summary>
/// <param name="dt" type="Number"> Time since last update in seconds. </param>
V.Scene.method('update', function (dt)
{
    if (this._points)
        for (var i = 0; i < this._points.length; i++)
            this._points[i].update(dt);
    if (this._restrictions)
        for (var j = 0; j < this._relaxation; j++)
            for (var i = 0; i < this._restrictions.length; i++)
                this._restrictions[i].update(dt);
});

/// <summary> Render. </summary>
/// <param name="ctx" type="CanvasRenderingContext"> Rendering context. </param>
V.Scene.method('render', function (ctx)
{
    if (this._restrictions)
        for (var i = 0; i < this._restrictions.length; i++)
            this._restrictions[i].render(ctx);
    if (this._points)
        for (var i = 0; i < this._points.length; i++)
            this._points[i].render(ctx);
});