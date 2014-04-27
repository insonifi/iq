/* global require, Buffer, module, console, process */
/* jshint -W097 */
'use strict';
var 
messages = require('./messages'),
Writable = new require('stream').Writable,
Transform = new require('stream').Transform,
util = require('util'),
subscriptions = {},
subscribers = 0,
list = [],
conveyorOut = null,
_toString = function () {
  return this[0] + '|' + this[1] + '|' + this[2];
},
_iter = function (fn) {
  var i = this.length;
  for (;i--;) {
    fn.call(this[i]);
  }
},
_subscribe = function (m, fn) {
  var str = (m.type || '') + '|' + (m.action || '') + '|' + (m.id || '');
  if (subscriptions[str] !== undefined) {
    subscriptions[str].push(fn);
  } else {
    subscriptions[str] = [fn];  
  }
  subscribers += 1;
},
_unsubscribe = function () {

},
_mutate = function (m) {
  var vals = [m.type, m.action, m.id],
    mutant = [],
    result = [_toString.call(vals)],
    j,
    i;
  for (j = 0 ; j < 3; j += 1) {
    mutant = vals.slice();
    for (i = j; i < 3;i += 1) {
      mutant[i] = '';
      result.push(_toString.call(mutant));
    }
    for (i = 0; i < j - 1;i += 1) {
      mutant[i] = '';
      result.push(_toString.call(mutant));
    }
  }
  return result;
},
_getMatchList = function (msg) {
  var candidates = _mutate(msg),
    candidate,
    result = [];
  _iter.call(candidates, function () {
    if (subscriptions[this] !== undefined) {
      result = result.concat(subscriptions[this]);
    }
  });
  return result;
},
_process = function (msg) {
  var cb = _getMatchList.call(this, msg),
    i = cb.length;
  _iter.call(cb, function () {
    this.call(msg, msg);
  });
},
_write = function (msg, enc, next) {
  process.nextTick(_process.bind(list, msg));
  next();
},
_transform = function (chunk, encoding, done) {
  this.push(chunk);
  done();
},
_bind = function (socket) {
  var conveyorIn = new StreamIn(),
    decomposer = new messages.decomposer(),
    composer = new messages.composer();
  socket.pipe(decomposer).pipe(conveyorIn);
  conveyorOut.pipe(composer).pipe(socket);
},
_unbind = function (socket) {
  conveyorOut.unpipe(socket);
},
_pushToConveyor = function (msg) {
  conveyorOut.write(msg);
};

util.inherits(StreamIn, Writable);
util.inherits(StreamOut, Transform);

function StreamIn (options) {
  if (!(this instanceof StreamIn))
    return new StreamIn(options);
  
  Writable.call(this, options);
  this._writableState.objectMode = true;
}
function StreamOut (options) {
  if (!(this instanceof StreamOut))
    return new StreamOut(options);
  
  Transform.call(this, options);
  this._writableState.objectMode = true;
  this._readableState.objectMode = true;
}

StreamIn.prototype._write = _write;
StreamOut.prototype._transform = _transform;

conveyorOut = new StreamOut();
module.exports.bindSocket = _bind;
//module.exports.unbindSocket = _unbind;
module.exports.send = _pushToConveyor;
module.exports.onmsg = _subscribe;

