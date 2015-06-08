function cls(base, constructor)
{
    var f = new Function();
    f.prototype = base.prototype;
    constructor.prototype = new f();
    constructor.prototype.constructor = constructor;
    constructor.base = base.prototype;
    constructor.property = property.bind(this, constructor);
    constructor.method = method.bind(this, constructor);
    return constructor;
}

function property(cls, name, description)
{
    var prototype = cls.prototype;
    description = description || {};
    if (description.hasOwnProperty('value'))
        prototype['_' + name] = description.value;
    if (description.get === true)
        prototype['get' + toUpperFirst(name)] = function () { return this['_' + name]; };
    else if (description.get)
        prototype['get' + toUpperFirst(name)] = description.get;
    if (description.set === true)
        prototype['set' + toUpperFirst(name)] = function (value) { this['_' + name] = value; };
    else if (description.set)
        prototype['set' + toUpperFirst(name)] = description.set;
}

function method(cls, name, description)
{
    cls.prototype[name] = description || function () { abstract(name); };
}

function abstract(name) { throw Error((name || 'This') + ' is an abstract method.'); }

var Utils = {
    Color: {
        random: function ()
        {
            return 'rgb(' + [(Math.random() * 255) | 0, (Math.random() * 255) | 0, (Math.random() * 255) | 0].join(',') + ')';
        }
    },
    DOM: {
        getScreenSize: function ()
        {
            var w = window,
                d = document,
                e = d.documentElement,
                g = d.getElementsByTagName('body')[0],
                x = w.innerWidth || e.clientWidth || g.clientWidth,
                y = w.innerHeight || e.clientHeight || g.clientHeight;
            return { x: x, y: y };
        }

    }
};

function toUpperFirst(s)
{
    return s[0].toUpperCase() + s.slice(1)
};

function toLowerFirst(s)
{
    return s[0].toLowerCase() + s.slice(1)
}

var MObject = cls(Object, function (options)
{
    this._id = ('Object' + (Object.id = (Object.id || 0) + 1));
    if (options)
        for (var i in options)
        {
            var ui = toUpperFirst(i);
            if (this['set' + ui])
                this['set' + ui](options[i]);
            else if ((this[i] instanceof Event) && options[i] instanceof Delegate)
                this[i].add(options[i])
            else throw Error('Unknown member ' + i);
        }
});

MObject.prototype.serialize = function ()
{
    var result = {}, getter;
    for (var i in this)
        if (i.indexOf('set') === 0 && this[getter = i.replace(/^set/, 'get')])
        {
            var r = this[getter]();
            if (r instanceof MObject)
                r = r.serialize();
            result[toLowerFirst(i.replace(/^set/, ''))] = r;
        }
    return result;
};