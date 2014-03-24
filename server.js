var net = require('net'),
  messages = require('./messages');
/**** Server ****/
server = net.createServer();
server.listen(process.argv[2] || 21030);
server.on('listening', function () {
  console.log('listening on port', server.address().port);
});

server.on('connection', function (client) {
  var parser = new messages.parser(),
  assembler =  new messages.assembler();
  client.pipe(parser).pipe(assembler).pipe(client);
  
  client.on('error', function (err) {
    console.error(err);
  })
})
