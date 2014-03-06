var net = require('net');
var buffer = new Buffer(8192),
	BEGIN = new Buffer([0xFF, 0xFF, 0x01, 0x00]),
	messages = require('./messages');
var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , Emitter = require('events').EventEmitter
  , queue = new Emitter;
/**** Queue ****/
queue.array = new Array;
queue.push = function(item) {
	console.info('[queue] push');
	this.array.push(item);
	this.emit('new');
}
queue.on('new', function() {
		io.sockets.emit('msg', queue.shift());
	});
queue.shift = function() {
	console.info('[queue] pop');
	return this.array.shift();
}
queue.send = function(buffer) {
	this.emit('send', buffer);
}
/**** HTTP server ****/
server.listen(8007);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
/**** Socket io ****/
io.sockets.on('connection', function (socket) {
	socket.emit('welcome', { ver: 'IIDK node 0.1' });
	var global_socket = socket;
	//flush queue first
	var message 
	while (message = queue.shift()) {
		socket.emit('msg', message);
	}
	socket.on('client', function (data) {
		queue.send(messages.msgToBuf(data));
	});
	
});
/**** IIDK connect ****/
var client = net.connect({host: '127.0.0.0.1', port: 21111}, function () {
	var connect = {
		msg: 'Event',
		type: 'SLAVE',
		id: 'A-PANTELEYEV',
		action: 'CONNECTED',
		params: {
			'SOCKET': '127.0.100.1',
			'TRANSPORT_TYPE': 'SOCKET',
			'module': 'node',
			'TRANSPORT_ID': '1030'
		}
	}
	client.write(messages.msgToBuf(connect));
	//Event|SLAVE|a-panteleyev.1|CONNECTED|SOCKET<192.168.1.106> TRANSPORT_TYPE<SOCKET> module<iidk_test.exe> TRANSPORT_ID<1030> time<17:24:27> date<12-03-13>
});
client.on('data', function(chunk) {
		var begin = 0;
		console.log('Got something');
		if(begin = hasBuffer(BEGIN, chunk))
			console.log('it\'s message');
			queue.push(messages.bufToMsg(chunk.slice(begin)));
	});
client.on('error', function (err) {
	console.log('err', err);
});
/**** IIDK listen ****/
var iidk = net.createServer(function(c) { //'connection' listener
	console.log('---');
	c.on('end', function() {
			console.log('##');
		});
	c.on('data', function(chunk) {
		var begin = 0;
		if(begin = hasBuffer(BEGIN, chunk))
			//console.log('Got message');
			queue.push(messages.bufToMsg(chunk.slice(begin)));
	});
	queue.on('send', function (buffer) {
		c.write(buffer);
	});
});
iidk.listen(process.env.IIDK || 21030, function() { //'listening' listener
  console.log('++');
});

function hasBuffer(searchBuf, buffer) {
    if (!Buffer.isBuffer(searchBuf)) return undefined;
    if (!Buffer.isBuffer(buffer)) return undefined;
	
	startIdx = 0
	for (var i = 0; i < buffer.length; i++) {
		startIdx = i
		if (searchBuf[0] === buffer[i]) break;
	}
	endIdx = startIdx + searchBuf.length
	var j = 0
	var idx = startIdx;
    for (var i = startIdx; i < endIdx;) {
        if (searchBuf[j] !== buffer[i]) return false;
        i++;
        j++;
        idx = i;
    }
    return idx;
};
