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
},
/**** Client ****/
_connect = function (ip, port) {
  Conveyor.bindSocket(socket);
  socket.connect({host: ip, port: ports[port]}, function () {
	  console.log('Connecting to %s:%s', socket.remoteAddress, socket.remotePort);
  });
  socket.on('connect', function () {
    var now = new Date();
    console.log('Connected at', now.toISOString());
    Conveyor.send({
      msg: 'Event',
      type: 'SLAVE',
      id: os.hostname(),
      action: 'CONNECTED',
      params: {
        'SOCKET': socket.localAddress,
        'TRANSPORT_TYPE': 'SOCKET',
        'module': 'node',
        'TRANSPORT_ID': socket.remotePort.toString().slice(1),
        'time': now.toLocaleTimeString(),
        'date': now.toISOString().slice(2,10)
      }
    });
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
},
_DoReact = function (msg) {
  msg.type = "React";
  Conveyor.send();
};

console.log('pid', process.pid);

module.exports.listen = _listen;
module.exports.connect = _connect;
module.exports.on = Conveyor.onmsg;
module.exports.send = Conveyor.send;
