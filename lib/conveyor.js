/* global require, module, process */
/* jshint -W097 */
'use strict';
var
sep = '\u0000',
subscriptions = {length: 0},
_toString = function () {
  return this[0] + sep + this[1] + sep + this[2];
},
_toStr = function () {
  return (this.type || '') + sep + (this.action || '') + sep + (this.id || '');
},
_iter = function (fn) {
  var i = this.length;
  for (;i--;) {
    fn.call(this[i]);
  }
},
_subscribe = function (m, fn) {
  var str = _toStr.call(m);
  if (subscriptions[str] !== undefined) {
    subscriptions[str].push(fn);
  } else {
    subscriptions[str] = [fn];  
  }
  subscriptions.length += 1;
},
_unsubscribe = function (m) {
  var str = _toStr.call(m);
  if (subscriptions[str] !== undefined) {
    delete subscriptions[str];
    subscriptions.length -= 1;
  }
},
_mutate = function (m) {
  var vals = [m.type, m.action, m.id],
    mutant = [],
    result = {},
    j = 0,
    i = 0,
    addMutant = function (mutant) {
      this[_toString.call(mutant)] = null;
    };
    
  addMutant.call(result, vals);
  for (j = 0 ; j < 3; j += 1) {
    mutant = vals.slice();
    for (i = j; i < 3;i += 1) {
      mutant[i] = '';
      addMutant.call(result, mutant);
    }
    for (i = 0; i < j - 1;i += 1) {
      mutant[i] = '';
      addMutant.call(result, mutant);
    }
  }
  return Object.keys(result);
},
_getMatchList = function (msg) {
  var candidates = _mutate(msg),
    result = [];
  _iter.call(candidates, function () {
    if (subscriptions[this] !== undefined) {
      result = result.concat(subscriptions[this]);
    }
  });
  return result;
},
_process = function (msg) {
  var callbacks = _getMatchList(msg);
  _iter.call(callbacks, function () {
    this(msg);
  });
};
module.exports.onmsg = _subscribe;
module.exports.offmsg = _unsubscribe;
module.exports.process = _process;
