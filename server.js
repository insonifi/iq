var net = require('net'),
//  agent = require('webkit-devtools-agent'),
  http = require('http'),
  messages = require('./lib/messages'),
  Conveyor = require('./lib/conveyor'),
  conveyor = new Conveyor;

conveyor.onmsg({type: 'CAM'}, function (msg) {
  //console.log('wtf!!!');
})

conveyor.onmsg({type: 'CAM', action: 'REC'}, function (msg) {
  //console.log('recording?');
})

conveyor.onmsg({type: 'CORE'}, function (msg) {
  //console.log(new Date);
})
t1 = new Date()
for (var i = 10000; i--;) {
  (function (i) {
    conveyor.onmsg({type: 'CAM', id: i}, function (msg) {
      //console.log('got cam', i);
    })
  }) (i)
}
console.log((new Date) - t1);
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
