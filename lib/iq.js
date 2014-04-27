/* global require, Buffer, module, console, process */
/* jshint -W097 */
'use strict';
var 
ports = {
  'iidk': 21030,
  'slave': 21111,
  'video': 20900,
  'pos': 21012
},
net = require('net'),
server = null,
client = null,
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
_connect = function (ip, port) {
  /**** Client ****/
  client = net.connect({host: ip, port: ports[port]}, function () {
    Conveyor.bindSocket(client);
	  console.log('Connecting to %s:%s', client.remoteAddress, client.remotePort);

	  client.on('connect', function () {
	    var now = new Date();
      console.log('Connected at', now.toISOString());
      Conveyor.send({
		    msg: 'Event',
		    type: 'SLAVE',
		    id: 'HOST',
		    action: 'CONNECTED',
		    params: {
			    'SOCKET': client.localAddress,
			    'TRANSPORT_TYPE': 'SOCKET',
			    'module': 'node',
			    'TRANSPORT_ID': client.remotePort.slice(1),
			    'time': now.toLocaleTimeString(),
			    'date': now.toISOString().slice(2,10)
		    }
    	});
    });
    client.on('end', function () {
      console.error('Connection terminated');
    });
    client.on('close', function () {
      console.error('Disconnected');
    });
    client.on('error', function (err) {
	    console.error(err);
    });
    client.on('timeout', function () {
      console.log('Connection timed out');
    });
  });
};

console.log('pid', process.pid);

module.exports.listen = _listen;
module.exports.connect = _connect;
module.exports.on = Conveyor.onmsg;
module.exports.send = Conveyor.send;
