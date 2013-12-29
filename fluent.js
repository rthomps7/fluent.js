(function() {

var utils = {
  call_constructor: function(fn, args) {
    var args = utils.args(args);
    args.unshift(fn);
    return new (fn.bind.apply(fn, args))();
  },
  args: function(args) {
    return Array.prototype.slice.call(args, 0);
  }
}

// Establishing stream object
//
// This object is used for created a fluent stream. I made the term up.
// Basically, it allows you to to call a series of functions, the same
// ones you'd call on the fluent object, but be able to repeate this action.
//
// Example:
//   object.do_something()  // does somethign
//   object.stream().do_something()  // does nothing, but ...
//   object.stream().do_something().go()  // does the something, so ...
//   var x = object.stream().do_something()
//   // Now we can do x.go() whenever we want this something to happen
//   // More importantly, we can now create a series of things that happen
//  var x = object.stream().do_x(1, 2).do_y('more_arguments').do_z();
//  x.go()  // will do_x, do_y, do_x
function StreamObject(obj) {
  if (!(this instanceof StreamObject))
    return new utils.call_constructor(StreamObject, arguments);

  this._cache = [];
  this._object = obj;
  this._on_done = Function();
  this._on_start = Function();
}

StreamObject.cache = function(n) {
  return function() {
    this._cache.push({
      value: n,
      args: arguments
    });
    return this;
  }
}

StreamObject.prototype.on = function(action, fn) {
  if (action == 'start') this._on_start = fn;
  else if (action == 'done') this._on_start = fn;
  return this;
}

StreamObject.prototype.go = function() {
  var _this = this._object;
  this._on_start.apply(this._object, arguments);
  this._cache.forEach(function(d) {
    return _this[d.value].apply(_this, d.args);
  });
  this._on_done.apply(this._object, arguments);
  return this;
}

// Creating fluent objects inheritance
//
// Influenced by John Resig's Simple JavaScript Inheritance
function fluent(/* dep1, dep2, ... */) {
  if (!(this instanceof fluent)) {  // Make sure that it's called with `new`
    return new utils.call_constructor(fluent, arguments);
  }

  var _this = this,
      deps = utils.args(arguments);

  // Main fluent object.
  //
  // Would be nice to have this get a name passed from the creator. Not sure
  // what way I want that done yet. So I'm waiting.
  function FluentObject() {
    if (!(this instanceof FluentObject))
      return new utils.call_constructor(FluentObject, arguments);

    var args = arguments,
        _this = this;

    this._vars = {};
    deps.forEach(function(d) {
      if (d.__fluent__) d.apply({ applied: true, _this: _this}, args);
      else d.apply(_this, args);
    });
  }

  FluentObject.prototype.__fluent__ = true;
  FluentObject.prototype._ = FluentObject.prototype.stream = function() {
    return StreamObject(this);
  }

  FluentObject.prototype.var = function(n, d) {
    var _this = this;
    this._vars[n] = {
      value: d,
      pre: function(d) { return d; },
      post: Function()
    }
    this[n] = function(x) {
      if (arguments.length == 0) return _this._vars[n].value;
      _this._vars[n].value = _this._vars[n].pre(x);
      _this._vars[n].post(_this);
      return _this;
    }

    StreamObject.prototype[n] = StreamObject.cache(n);

    return {
      pre: function(fn) {
        _this._vars[n].pre = fn;
        return ret;
      },
      post: function(fn) {
        _this._vars[n].post = fn;
        return ret;
      }
    }
  }

  FluentObject.prototype.vars = function() {
    utils.args(arguments).forEach(function(d) { _this.var(d) });
  }

  FluentObject.prototype.function = function(n, fn) {
    var fn = fn || Function(),
        _this = this;

    this[n] = function() {
      fn.apply(this, arguments);
      return _this;
    }

    StreamObject.prototype[n] = StreamObject.cache(n);
  }

  return FluentObject;
}

// Export object
if (typeof module !== 'undefined' && module !== null) // NodeJS
  module.exports = fluent;
else if (typeof define === "function") // Require JS
  define([], function() { return fluent; });
else this.fluent = fluent;

})();
