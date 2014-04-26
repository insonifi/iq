var net = require('net'),
//  agent = require('webkit-devtools-agent'),
  http = require('http'),
  messages = require('./lib/messages'),
  Conveyor = require('./lib/conveyor');
Conveyor.onmsg({type: 'CAM'}, function (msg) {
  
})

Conveyor.onmsg({type: 'CAM', action: 'REC', id: '0'}, function (msg) {
  console.log('send');
  Conveyor.send({
    msg: 'Msg',
    type: 'WTF',
    id: '0',
    action: 'WOW',
    params: {
      count: 1,
      time: (new Date).toISOString()
    }
  });
})

Conveyor.onmsg({type: 'CORE'}, function (msg) {
  //console.log(new Date);
})
console.log('pid', process.pid)
/**** Server ****/
server = net.createServer();
server.listen(process.argv[2] || 21030);
server.on('listening', function () {
  console.log('listening on port', server.address().port);
});

server.on('connection', function (client) {
   Conveyor.bindSocket(client);
  
  client.on('error', function (err) {
    console.error(err);
  })
  client.on('end', function (err) {
    Conveyor.unbindSocket(client);
  })
})
