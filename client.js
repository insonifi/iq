var net = require('net'),
	messages = require('./messages'),
	host = [],
	error;
//var app = require('express')()
//  , server = require('http').createServer(app)
//  , io = require('socket.io').listen(server)
//  , Emitter = require('events').EventEmitter
//  , queue = new Emitter;
/**** Queue ****/
//queue.array = new Array;
//queue.push = function(item) {
//	console.info('[queue] push');
//	this.array.push(item);
//	this.emit('new');
//}
//queue.on('new', function() {
//		io.sockets.emit('msg', queue.shift());
//	});
//queue.shift = function() {
//	console.info('[queue] pop');
//	return this.array.shift();
//}
//queue.send = function(buffer) {
//	this.emit('send', buffer);
//}
///**** HTTP server ****/
//server.listen(8007);

//app.get('/', function (req, res) {
//  res.sendfile(__dirname + '/index.html');
//});
///**** Socket io ****/
//io.sockets.on('connection', function (socket) {
//	socket.emit('welcome', { ver: 'IIDK node 0.1' });
//	var global_socket = socket;
//	//flush queue first
//	var message 
//	while (message = queue.shift()) {
//		socket.emit('msg', message);
//	}
//	socket.on('client', function (data) {
//		queue.send(messages.msgToBuf(data));
//	});
//	
//});
if (process.argv[2]) {
  host = process.argv[2].split(':');
  if (!net.isIP(host[0])) {
    console.error('IP address is ')
  }
} else {
  console.error('No host specified\nclient.js <ip>:<port>');
  process.kill();
}

/**** IIDK connect ****/
var client = net.connect({host: host[0], port: host[1]}, function () {
	var now = new Date(),
	  connect = {
		  msg: 'Event',
		  type: 'SLAVE',
		  id: 'A-PANTELEYEV',
		  action: 'CONNECTED',
		  params: {
		    count: 6,
			  'SOCKET': client.localAddress,
			  'TRANSPORT_TYPE': 'SOCKET',
			  'module': 'node',
			  'TRANSPORT_ID': host[1].slice(1),
			  'time': now.toLocaleTimeString(),
			  'date': now.toISOString().slice(2,10)
		}
	}
	console.log('Connecting to %s:%s', host[0], host[1])
	client.write(messages.toBuf(connect));
	//Event|SLAVE|a-panteleyev.1|CONNECTED|SOCKET<192.168.1.106> TRANSPORT_TYPE<SOCKET> module<iidk_test.exe> TRANSPORT_ID<1030> time<17:24:27> date<12-03-13>
});
client.on('connect', function () {
  console.log('Connected');
});
client.on('end', function () {
  console.error('Connection terminated unexpectedly');
});
client.on('close', function () {
  console.error('Disconnected');
});
client.on('data', function(chunk) {
  client.write(messages.toBuf(messages.toMsg(chunk)))
});
client.on('error', function (err) {
	console.error(err);
});
client.on('timeout', function () {
  console.log('Connection timed out');
})
