var net = require('net'),
  messages = require('./messages');
/**** Server ****/
server = net.createServer();
server.listen(process.argv[2] || 21030);
server.on('listening', function () {
  console.log('listening on port', server.address().port);
});
server.on('connection', function (client) {
  var parser = new messages.parser();
  client.pipe(parser).pipe(process.stdout);
  parser.on('message', function (msg) {
    client.write(messages.serialize(msg));
  });
  client.on('error', function (err) {
    console.error(err);
  })
})
