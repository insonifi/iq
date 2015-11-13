/* global require, Buffer, Promise, module, console, process, setTimeout */
/* jshint -W097 */
'use strict';
var
os = require('os'),
ports = {
  'iidk': 21030,
  'slave': 21111,
  'video': 20900,
  'pos': 21012
},
retry_time = 3000,
net = require('net'),
util = require('util'),
Writable = require('stream').Writable,
output = require('stream').Readable({objectMode: true}),
Msg = require('./messages'),
Conveyor = require('./conveyor'),
queue = [],
/**** API ****/
sendReact = function (msg) {
  msg.msg = 'React';
  output.push(msg);
},
sendEvent = function (msg) {
  msg.msg = 'Event';
  output.push(msg);
},
_toCoreReact = function (msg) {
  var event = {
      msg: 'Event',
      type: 'CORE',
      action: 'DO_REACT',
      params: {
        source_type: msg.type,
        source_id: msg.id,
        action: msg.action
      }
    },
    keys = {},
    key = '',
    i = 0;
  if (msg.params) {
    keys = Object.keys(msg.params);
    i = keys.length;
    for (;i--;) {
      key = keys[i];
      event.params['param' + i + '_name'] = key;
      event.params['param' + i + '_val'] = msg.params[key];
    }
  }
  return event;
},
sendCoreReact = function (msg) {
  output.push(_toCoreReact(msg));
},
/**** Internal *****/
_convert = function (msg) {
  msg.type = msg.params.objtype || '';
  msg.action = msg.params.objaction || '';
  msg.id = msg.params.objid || '';
  delete msg.params.objtype;
  delete msg.params.objaction;
  delete msg.params.objid;
  return msg;
},
_catch = function (msg) {
  // BEGIN_STATE, OBJECT_STATE, END_STATE, OBJECT_CONFIG, END_CONFIG
  var parts = msg.action.slice(0, msg.action.indexOf('_'));
  if (queue.length === 0) {
    return;
  }
  if (parts === 'OBJECT') {
    queue[0].append(_convert(msg));
  }
  if (parts === 'END') {
    queue[0].finish(msg);
  }
},
_preprocess = function (message) {
  if (message.type === 'ACTIVEX' && message.action === 'EVENT') {
    message.msg = 'Event';
    return _convert(message);
/*    } else {
      _catch(message);*/
  } else {
    return message;
  }
},
_process = function (msg, encoding, next) {
  process.nextTick(function () {
    Conveyor.process(_preprocess(msg));
  });
  next();
},
_bind = function (socket) {
  var decomposer = new Msg.decomposer(),
      composer = new Msg.composer(),
      input = new Input();
  socket.pipe(decomposer).pipe(input);
  output.pipe(composer).pipe(socket);
},
/*
_getAccumulator = function (resolve) {
  var list = [];
  return {
    append: function (msg) {
      list.push(msg);
    },
    finish: (function (msg) {
      resolve(list);
      Conveyor.unqueue();
      //console.log('[accumulator] got list of', list.length);
    }).bind(this)
  };
},

*/
/*,
get = function (options) {
  return new Promise(function (resolve, reject) {
    var accumulator = _getAccumulator(resolve);
    if (options.type === undefined) {
      return new Error("[get] Object type is not defined");
    }
    if (options.prop === undefined) {
      return new Error("[get] Property type is not defined");
    }
    console.log(output);
    Conveyor.queue(accumulator);
    output.push({
      type: 'CORE',
      action: 'GET_' + options.prop.toUpperCase(),
      params: {
        objtype: options.type,
        objid: options.id || ''
      }
    });
  })
},
*/
/**** Server ****/
_listen = function (port) {
  return new Promise(function (resolve, reject) {
    var server = net.createServer();
    server.listen(ports[port]);
    server.on('listening', function () {
      console.log('[_listen] Listening on port', server.address().port);
    });
    server.on('connection', function (socket) {
      console.log('[_listen] Client %s connected', socket.remoteAddress);
      _bind(socket);
      socket.on('error', function (err) {
        console.error('[_listen]', err);
        reject(err);
      });
      socket.on('close', function () {
        console.log('[_listen] Client disconnected');
      });
    });
    resolve(server);
  });
},
/**** Client ****/
// TODO: keep connected IIDK id and append it as slave_id<> parameter
_connect = function (options) {
  return new Promise(function (resolve, reject) {
    var socket = net.Socket(),
        ip = options.ip || '127.0.0.1',
        port_name = options.port || 'iidk',
        port = ports[port_name],
        host_id = options.host || os.hostname().toUpperCase(),
        iidk_id = options.iidk === undefined ? '' : '.' + options.iidk;

    socket.on('connect', function () {
      var now = new Date(),
        connected = {
          type: 'SLAVE',
          id: host_id + iidk_id,
          action: 'CONNECTED',
          params: {
            'SOCKET': socket.localAddress,
            'TRANSPORT_TYPE': 'SOCKET',
            'module': 'node',
            'TRANSPORT_ID': socket.remotePort.toString().slice(1)
          }
        };
      _bind(socket);
      console.log('[_connect] Connected at', now.toLocaleTimeString());
      sendEvent(connected);
      resolve(socket);
    });
    socket.on('end', function () {
      console.error('[_connect] Connection terminated');
    });
    socket.on('close', function () {
      console.error('[_connect] Disconnected');
      setTimeout(function () {
        connect();
      }, retry_time);
    });
    socket.on('error', function (err) {
      console.error('[_connect]', err);
      reject(err);
    });
    socket.on('timeout', function () {
      console.log('[_connect] Connection timed out');
    });
    connect();
    function connect() {
      socket.connect({host: ip, port: port}, function () {
        console.log('[_connect] Connecting to %s:%s', socket.remoteAddress, socket.remotePort);
      });
    }
  });
};
util.inherits(Input, Writable);
function Input(options) {
  if (!(this instanceof Input)) {
    return new Input(options);
  }
  Writable.call(this, options);
  this._writableState.objectMode = true;
}
Input.prototype._write = _process;
output._read = function () {};

module.exports.listen = _listen;
module.exports.connect = _connect;
module.exports.on = Conveyor.onmsg;
module.exports.sendReact = sendReact;
module.exports.sendCoreReact = sendCoreReact;
module.exports.sendEvent = sendEvent;
//module.exports.get = get;

