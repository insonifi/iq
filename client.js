var net = require('net'),
	messages = require('./messages'),
	host = function () {
	  var host;
    if (process.argv[2]) {
      host = process.argv[2].split(':');
      if (!net.isIP(host[0])) {
        return new Error('No IP address')
      }
      if (!/\d+/.test(host[1])) {
        return new Error('No port')
      }
    } else {
      return new Error('No host specified\nclient.js <ip>:<port>')
    }
    return host
	} ();
	
if (host instanceof Error) {
  console.error(host);
  process.kill();
}

/**** IIDK connect ****/
var client = net.connect({host: host[0], port: host[1]}, function () {
	var now = new Date(),
	  connect = {
		  msg: 'Event',
		  type: 'SLAVE',
		  id: 'HOST',
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
	},
	decomposer = new messages.decomposer(),
  composer =  new messages.composer();
  client.pipe(decomposer).pipe(composer).pipe(client);
  composer.write(connect);
	console.log('Connecting to %s:%s', host[0], host[1]);
	//Event|SLAVE|host.1|CONNECTED|SOCKET<192.168.1.106> TRANSPORT_TYPE<SOCKET> module<iidk_test.exe> TRANSPORT_ID<1030> time<17:24:27> date<12-03-13>
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
client.on('error', function (err) {
	console.error(err);
});
client.on('timeout', function () {
  console.log('Connection timed out');
})
