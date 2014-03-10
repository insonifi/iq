var net = require('net');
  header = new Buffer([0xFF, 0xFF, 0x01, 0x00]),
	messages = require('./messages');
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
/**** Server ****/
var server = net.createServer();
server.listen(process.argv[2] || 21030);
server.on('listening', function () {
  console.log('listening on port', server.address().port);
});
server.on('connection', function (client) {
  console.log('client connected from', client.remoteAddress);
	client.on('end', function() {
		console.log('client disconnected');
	});
	client.on('data', function(chunk) {
	  console.log(messages.toMsg(chunk))
	});
  client.on('error', function(err) {
    console.error(err);
  })
});
