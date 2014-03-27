var net = require('net'),
  messages = require('./messages');
/**** Server ****/
server = net.createServer();
server.listen(process.argv[2] || 21030);
server.on('listening', function () {
  console.log('listening on port', server.address().port);
});

server.on('connection', function (client) {
  var decomposer = new messages.decomposer(),
  composer =  new messages.composer();
  client.pipe(decomposer)//.pipe(composer).pipe(client);
  decomposer.on('CAM|REC', function (msg) {
    console.log(msg.id);
  })
  
  client.on('error', function (err) {
    console.error(err);
  })
})
