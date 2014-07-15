/* global require, Buffer, module, console, process */
/* jshint -W097 */
'use strict';
var 
os = require('os'),
Q = require('q'),
ports = {
  'iidk': 21030,
  'slave': 21111,
  'video': 20900,
  'pos': 21012
},
retry_time = 3000,
net = require('net'),
Conveyor = require('./conveyor'),
/**** API ****/
sendReact = function (msg) {
  msg.msg = 'React';
  Conveyor.send(msg);
},
sendEvent = function (msg) {
  msg.msg = 'Event';
  Conveyor.send(msg);
},
sendCoreReact = function (msg) {
  var event = {
      msg: 'Event',
      type: 'CORE',
      action: 'DO_REACT',
      params: {
        source_type: msg.type,
        id: msg.id,
        action: msg.action
      }
    },
    keys = Object.keys(msg.params),
    i = keys.length,
    key;
  for (;i--;) {
    key = keys[i];
    event.params['param' + i + '_name'] = key;
    event.params['param' + i + '_val'] = msg.params[key];
  }
  Conveyor.send(event);
},
_getAccumulator = function (deferred) {
  var list = [];
  return {
    append: (function (msg) {
      list.push(msg);
    }).bind(this),
    finish: (function (msg) {
      deferred.resolve(list);
      Conveyor.unqueue();
      //console.log('[accumulator] got list of', list.length);
    }).bind(this)
  };
},
get = function (options) {
  var deferred = Q.defer(),
    accumulator = _getAccumulator(deferred);
  if (options.type === undefined) {
    return new Error("[get] Object type is not defined");
  }
  if (options.prop === undefined) {
    return new Error("[get] Property type is not defined");
  }
  Conveyor.queue(accumulator);
  sendEvent({
    type: 'CORE',
    action: 'GET_' + options.prop.toUpperCase(),
    params: {
      objtype: options.type,
      objid: options.id || ''
    }
  });
  return deferred.promise;
},
/**** Server ****/
_listen = function (port) {
  var server = net.createServer(),
    deferred = Q.defer();
  server.listen(ports[port]);
  server.on('listening', function () {
    console.log('[_listen] Listening on port', server.address().port);
  });

  server.on('connection', function (socket) {
    console.log('[_listen] Client %s connected', socket.remoteAddress);
    Conveyor.bindSocket(socket);
    socket.on('error', function (err) {
      console.error('[_listen]', err);
    });
    socket.on('close', function () {
      console.log('[_listen] Client disconnected');
    });
  });
  deferred.resolve(server);
  return deferred.promise;
},
/**** Client ****/
_connect = function (options) {
  var deferred = Q.defer(),
    socket = net.Socket(),
    ip = options.ip || '127.0.0.1',
    port_name = options.port || 'iidk',
    port = ports[port_name],
    host_id = options.host || os.hostname().toUpperCase(),
    iidk_id = options.iidk === undefined ? '' : '.' + options.iidk;
  Conveyor.bindSocket(socket);
  socket.connect({host: ip, port: port}, function () {
    console.log('[_connect] Connecting to %s:%s', socket.remoteAddress, socket.remotePort);
  });
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
    console.log('[_connect] Connected at', now.toLocaleTimeString());
    sendEvent(connected);
    deferred.resolve(socket);
  });
  socket.on('end', function () {
    console.error('[_connect] Connection terminated');
  });
  socket.on('close', function () {
    console.error('[_connect] Disconnected');
    setTimeout(function () {
      _connect(options);
    }, retry_time);
  });
  socket.on('error', function (err) {
    console.error('[_connect]', err);
    deferred.reject(err);
  });
  socket.on('timeout', function () {
    console.log('[_connect] Connection timed out');
  });
  return deferred.promise;
};

module.exports.listen = _listen;
module.exports.connect = _connect;
module.exports.on = Conveyor.onmsg;
module.exports.sendReact = sendReact;
module.exports.sendCoreReact = sendCoreReact;
module.exports.sendEvent = sendEvent;
module.exports.get = get;
