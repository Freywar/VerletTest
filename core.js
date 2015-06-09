//Naming conventions:
//Class
//object._privateMember
//object.publicMember
//object._property
//object.getProperty
//object.setProperty
//new Class({property:value[,...]})

/// <summary> Namespace definition. </summary>
function namespace() { return {} };

/// <summary> Class definition. </summary>
/// <param name="base" type="Function"> Base class. </param>
/// <param name="constructor" type="Function"> Constructor. </param>
/// <returns type="Function"> Class. </returns>
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

/// <summary> Property definition. Creates local private member with same name and getter/setter if necessary. </summary>
/// <param name="cls" type="Function"> Class. </param>
/// <param name="name" type="String"> Name. </param>
/// <param name="description" type="Object">
/// Optional description:
/// {
///	    [value:<default_value>,]
///     [get:true|<getter_function>]
///	    [set:true|<setter_function>}
/// }
/// 'true' creates default getter/setter automatically.
/// </param>
function property(cls, name, description)
{
    var prototype = cls.prototype;
    description = description || {};
    if (description.hasOwnProperty('value'))
        prototype['_' + name] = description.value;
    if (description.get === true)
        prototype['get' + Utils.String.toUpperFirst(name)] = function () { return this['_' + name]; };
    else if (description.get)
        prototype['get' + Utils.String.toUpperFirst(name)] = description.get;
    if (description.set === true)
        prototype['set' + Utils.String.toUpperFirst(name)] = function (value) { this['_' + name] = value; };
    else if (description.set)
        prototype['set' + Utils.String.toUpperFirst(name)] = description.set;
}

/// <summary> Property definition. Creates local private member with same name and getter/setter if necessary. </summary>
/// <param name="cls" type="Function"> Class. </param>
/// <param name="name" type="String"> Name. </param>
/// <param name="func" type="Function"> Method. If not specified abstract method call exception will be created. </param>
/// </param>
function method(cls, name, func)
{
    cls.prototype[name] = func || function () { abstract(name); };
}

/// <summary> Abstract method call exception. </summary>
/// <param name="name" type="String"> Optional method name. </param>
function abstract(name) { throw Error((name || 'This') + ' is an abstract method.'); }


var Utils = {
    extend: function (to, from)
    {
        to = to || {};
        if (from)
            for (var i in from)
                to[i] = from[i];
        return to;
    },
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
        },
        create: function (tagName, className, parentNode, innerHTML, style)
        {
            var result = document.createElement(tagName || 'div');
            result.className += className || '';
            result.innerHTML = innerHTML || result.innerHTML;
            Utils.extend(result.style, style);
            if (parentNode)
                parentNode.appendChild(result);
            return result;
        }
    },
    String: {
        toUpperFirst: function (s)
        {
            return s[0].toUpperCase() + s.slice(1)
        },
        toLowerFirst: function toLowerFirst(s)
        {
            return s[0].toLowerCase() + s.slice(1)
        }
    }
};

/// <summary> Basic object. </summary>
var MObject = cls(Object, function (options)
{
    this._id = ('Object' + (Object.id = (Object.id || 0) + 1));
    if (options)
        for (var i in options)
        {
            var ui = Utils.String.toUpperFirst(i);
            if (this['set' + ui])
                this['set' + ui](options[i]);
            else if ((this[i] instanceof Event) && options[i] instanceof Delegate)
                this[i].add(options[i])
            else throw Error('Unknown member ' + i);
        }
});

/// <summary> Object serialization. </summary>
/// <returns type="Object"> JSON with all properties which have setter and getter. </returns>
MObject.prototype.serialize = function ()
{
    var result = {}, getter;
    for (var i in this)
        if (i.indexOf('set') === 0 && this[getter = i.replace(/^set/, 'get')])
        {
            var r = this[getter]();
            if (r instanceof MObject)
                r = r.serialize();
            result[Utils.String.toLowerFirst(i.replace(/^set/, ''))] = r;
        }
    return result;
};