/* global require, module, process */
/* jshint -W097 */
'use strict';
var
messages = require('./messages'),
Writable = new require('stream').Writable,
Transform = new require('stream').Transform,
util = require('util'),
subscriptions = {},
queue = [],
subscribers = 0,
list = [],
conveyorOut = null,
fqueue = null,
_toString = function () {
  return this[0] + '|' + this[1] + '|' + this[2];
},
_toStr = function () {
  return (this.type || '') + '|' + (this.action || '') + '|' + (this.id || '');
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
  subscribers += 1;
},
_unsubscribe = function (m) {
  var str = _toStr.call(m);
  if (subscriptions[str] !== undefined) {
    delete subscriptions[str];
    subscribers -= 1;
  }
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
    result = [];
  _iter.call(candidates, function () {
    if (subscriptions[this] !== undefined) {
      result = result.concat(subscriptions[this]);
    }
  });
  return result;
},
_convert = function (msg) {
  msg.type = msg.params.objtype || '';
  msg.action = msg.params.objaction || '';
  msg.id = msg.params.objid || '';
  delete msg.params.objtype;
  delete msg.params.objaction;
  delete msg.params.objid;
  return msg;
},
_process = function (msg) {
  var callbacks = _getMatchList.call(list, msg);
  _iter.call(callbacks, function () {
    this(msg);
  });
},
_write = function (msg, enc, next) {
  process.nextTick(_process.bind(null, msg));
  next();
},
_transform = function (chunk, encoding, done) {
  this.push(chunk);
  done();
},
_preprocess = function (chunk, encoding, done) {
  if (chunk.type === 'ACTIVEX') {
    if (chunk.action === 'EVENT') {
      chunk.msg = 'Event';
      
      this.push(_convert(chunk));
    } else {
      _catch(chunk);
    }
  } else {
    this.push(chunk);
  }
  done();
},
_queue = function (fn) {
  queue.push(fn);
  //console.log('[_queue] queue length %s (%s)', queue.length, queue);
},
_unqueue = function () {
  queue.shift();
  //console.log('[_unqueue] queue length %s', queue.length);
},
_catch = function (msg) {
  /* BEGIN_STATE
  OBJECT_STATE
  END_STATE
  OBJECT_CONFIG
  END_CONFIG
  */
  var parts = msg.action.split('_')
  if (queue.length === 0) {
    return;
  }
  if (parts[0] === 'OBJECT') {
    queue[0].append(_convert(msg));
  }
  if (parts[0] === 'END') {
    queue[0].finish(msg);
  }
},
_bind = function (socket) {
  var conveyorIn = new StreamIn(),
    convert = new Convert(),
    decomposer = new messages.decomposer(),
    composer = new messages.composer();
  socket.pipe(decomposer).pipe(convert).pipe(conveyorIn);
  conveyorOut.pipe(composer).pipe(socket);
},
_pushToConveyor = function (msg) {
  conveyorOut.write(msg);
};

util.inherits(StreamIn, Writable);
util.inherits(StreamOut, Transform);
util.inherits(Convert, Transform);
util.inherits(FQueue, Writable);

function StreamIn (options) {
  if (!(this instanceof StreamIn)) {
    return new StreamIn(options);
  }
  
  Writable.call(this, options);
  this._writableState.objectMode = true;
}
function StreamOut (options) {
  if (!(this instanceof StreamOut)) {
    return new StreamOut(options);
  }
  
  Transform.call(this, options);
  this._writableState.objectMode = true;
  this._readableState.objectMode = true;
}
function Convert (options) {
  if (!(this instanceof Convert)) {
    return new Convert(options);
  }
  
  Transform.call(this, options);
  this._writableState.objectMode = true;
  this._readableState.objectMode = true;
}
function FQueue (options) {
  if (!(this instanceof StreamIn)) {
    return new StreamIn(options);
  }
  
  Writable.call(this, options);
  this._writableState.objectMode = true;
}
StreamIn.prototype._write = _write;
StreamOut.prototype._transform = _transform;
Convert.prototype._transform = _preprocess;
FQueue.prototype._write = _catch;

conveyorOut = new StreamOut();
fqueue = new FQueue();
module.exports.bindSocket = _bind;
module.exports.send = _pushToConveyor;
module.exports.onmsg = _subscribe;
module.exports.offmsg = _unsubscribe;
module.exports.queue = _queue;
module.exports.unqueue = _unqueue;

