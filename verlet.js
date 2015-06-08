﻿/// <reference path="core.js" />

var Point = cls(MObject, function (options)
{
    Point.base.constructor.apply(this, arguments);
    if (!options.px)
        this._px = this._cx;
    if (!options.py)
        this._py = this._cy;
});

Point.property('color', { value: '#000000', get: true, set: true });
Point.property('px', { value: 0, get: true, set: true });
Point.property('cx', { value: 0, get: true, set: true });
Point.property('py', { value: 0, get: true, set: true });
Point.property('cy', { value: 0, get: true, set: true });
Point.property('pdt', { value: 0 });

Point.method('update', function (dt)
{
    var cdt = dt / (this._pdt || dt);
    this._pdt = dt;
    this._cx += (-this._px + (this._px = this._cx)) * cdt;
    this._cy += (-this._py + (this._py = this._cy)) * cdt;
});

Point.method('render', function (ctx) { });


var Restriction = cls(MObject, function () { Restriction.base.constructor.apply(this, arguments) });

Restriction.property('points', { value: null, get: true, set: true });

Restriction.method('update');

Restriction.method('render', function (ctx) { });


var Ball = cls(Point, function () { Ball.base.constructor.apply(this, arguments) });

Ball.property('r', { value: 0, get: true, set: true });

Ball.method('render', function (ctx)
{
    ctx.fillStyle = this._color;
    ctx.beginPath();
    ctx.arc(this._cx, this._cy, this._r, 0, Math.PI * 2);
    ctx.fill();
});


var Intersection = cls(Restriction, function () { Intersection.base.constructor.apply(this, arguments) });
Intersection.method('update', function (dt)
{
    if (!this._points)
        return;
    for (var i = 0; i < this._points.length; i++)
    {
        var one = this._points[i];
        var r1 = (one instanceof Ball) ? one.getR() : 0,
            x1 = one.getCx(),
            y1 = one.getCy()
        for (var j = i + 1; j < this._points.length; j++)
        {
            var two = this._points[j];
            var r2 = (two instanceof Ball) ? two.getR() : 0;
            var x2 = two.getCx(),
                y2 = two.getCy();
            var dx = x1 - x2;
            var dy = y1 - y2;
            var dr = Math.sqrt(dx * dx + dy * dy);
            var intDr = dr - r1 - r2;
            if (intDr < 0)
            {
                var m = 0.5 * intDr / dr;
                dx *= m;
                dy *= m;
                one.setCx(x1 - dx);
                one.setCy(y1 - dy);
                two.setCx(x2 + dx);
                two.setCy(y2 + dy);
            }
        }
    }
});

var Box = cls(Restriction, function () { Box.base.constructor.apply(this, arguments) });
Box.property('color', { value: '#000000', get: true, set: true });
Box.property('left', { value: 0, get: true, set: true });
Box.property('top', { value: 0, get: true, set: true });
Box.property('right', { value: 0, get: true, set: true });
Box.property('bottom', { value: 0, get: true, set: true });
Box.property('width', {
    get: function () { return this._right - this._left; },
    set: function (value) { this._right = this._left + value; }
});
Box.property('height', {
    get: function () { return this._bottom - this._top; },
    set: function (value) { this._bottom = this._top + value; }
});

Box.method('update', function (dt)
{
    if (!this._points)
        return;
    for (var i = 0; i < this._points.length; i++)
    {
        var point = this._points[i],
        r = (point instanceof Ball) ? point.getR() : 0;
        if (point.getCx() - r < this._left)
            point.setCx(this._left + r - point.getCx() + r + this._left);
        if (point.getCx() + r > this._right)
            point.setCx(this._right - r - point.getCx() - r + this._right);
        if (point.getCy() - r < this._top)
            point.setCy(this._top + r - point.getCy() + r + this._top);
        if (point.getCy() + r > this._bottom)
            point.setCy(this._bottom - r - point.getCy() - r + this._bottom);
    }
});

Box.method('render', function (ctx)
{
    ctx.fillStyle = this._color;
    ctx.fillRect(this._left, this._top, this.getWidth(), this.getHeight());
});


var FrictionBox = cls(Box, function () { FrictionBox.base.constructor.apply(this, arguments) });

FrictionBox.method('update', function (dt)
{
    if (!this._points)
        return;
    FrictionBox.base.update.apply(this, arguments);
    for (var i = 0; i < this._points.length; i++)
    {
        this._points[i].setPx(this._points[i].getCx());
        this._points[i].setPy(this._points[i].getCy());
    }
});


var Attractor = cls(Restriction, function () { Attractor.base.constructor.apply(this, arguments) });

Attractor.property('x', { value: 0, get: true, set: true });
Attractor.property('y', { value: 0, get: true, set: true });
Attractor.property('k', { value: 1, get: true, set: true });

Attractor.method('update', function (dt)
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


var Scene = cls(MObject, function () { Scene.base.constructor.apply(this, arguments); })
Scene.property('points', { value: null, get: true, set: true });
Scene.property('restrictions', { value: null, get: true, set: true });
Scene.property('relaxation', { value: 10, get: true, set: true });

Scene.method('update', function (dt)
{
    if (this._points)
        for (var i = 0; i < this._points.length; i++)
            this._points[i].update(dt);
    if (this._restrictions)
        for (var j = 0; j < this._relaxation; j++)
            for (var i = 0; i < this._restrictions.length; i++)
                this._restrictions[i].update(dt);
});

Scene.method('render', function (ctx)
{
    if (this._restrictions)
        for (var i = 0; i < this._restrictions.length; i++)
            this._restrictions[i].render(ctx);
    if (this._points)
        for (var i = 0; i < this._points.length; i++)
            this._points[i].render(ctx);
});