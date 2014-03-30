var net = require('net'),
  agent = require('webkit-devtools-agent'),
  http = require('http'),
  messages = require('./lib/messages'),
  Conveyor = require('./lib/conveyor'),
  conveyor = new Conveyor;

console.log('pid', process.pid)
/**** Server ****/
server = net.createServer();
server.listen(process.argv[2] || 21030);
server.on('listening', function () {
  console.log('listening on port', server.address().port);
});

server.on('connection', function (client) {
  var decomposer = new messages.decomposer(),
  composer =  new messages.composer();
  conveyor = new Conveyor;
  client.pipe(decomposer).pipe(conveyor);
  client.on('error', function (err) {
    console.error(err);
  })
})
