/* global require, Buffer, module, console, process */
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
net = require('net'),
server = null,
socket = net.Socket(),
Conveyor = require('./conveyor'),
guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1)
			   .toUpperCase();
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
},
_timestamp = function (msg) {
  var now = new Date();
  if (!msg.params) {
    msg.params = {};
  }
  msg.params.time = now.toLocaleTimeString();
  msg.params.date = now.toISOString().slice(2,10);
  msg.params.fraction = now.getMilliseconds();
  msg.params.guid = guid();
  return msg;
},
/**** API ****/
doReact = function (msg) {
  msg.msg = 'React';
  Conveyor.send(msg);
},
notifyEvent = function (msg) {
  msg.msg = 'Event';
  Conveyor.send(_timestamp(msg));
},
/**** Server ****/
_listen = function (port) {
  server = net.createServer();
  server.listen(ports[port]);
  server.on('listening', function () {
    console.log('Listening on port', server.address().port);
  });

  server.on('connection', function (socket) {
    console.log('Client %s connected', socket.remoteAddress);
    Conveyor.bindSocket(socket);
    socket.on('error', function (err) {
      console.error(err);
    });
    socket.on('close', function () {
      console.log('Client disconnected');
    });
  });
  return server;
},
/**** Client ****/
_connect = function (ip, port) {
  Conveyor.bindSocket(socket);
  socket.connect({host: ip, port: ports[port]}, function () {
	  console.log('Connecting to %s:%s', socket.remoteAddress, socket.remotePort);
  });
  socket.on('connect', function () {
    var now = new Date(),
      connected = {
      type: 'SLAVE',
      id: os.hostname(),
      action: 'CONNECTED',
      params: {
        'SOCKET': socket.localAddress,
        'TRANSPORT_TYPE': 'SOCKET',
        'module': 'node',
        'TRANSPORT_ID': socket.remotePort.toString().slice(1)
      }
    };
    console.log('Connected at', now.toISOString());
    notifyEvent(connected);
  });
  socket.on('end', function () {
    console.error('Connection terminated');
  });
  socket.on('close', function () {
    console.error('Disconnected');
  });
  socket.on('error', function (err) {
    console.error(err);
  });
  socket.on('timeout', function () {
    console.log('Connection timed out');
  });
  return socket;
};

console.log('pid', process.pid);

module.exports.listen = _listen;
module.exports.connect = _connect;
module.exports.on = Conveyor.onmsg;
module.exports.DoReact = doReact;
module.exports.NotifyEvent = notifyEvent;
