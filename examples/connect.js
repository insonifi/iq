var iq = require('../lib/iq'),
    catchErr = function (e) { console.log(e); };

iq.connect({ip: '192.168.122.183', iidk: '3', host: 'DUKE-PC'})
.then(function () {
  iq.on({type: 'MACRO'}, function (msg) {
    console.log(msg.type, msg.action);
      iq.sendEvent({
        type: 'WHAT',
        id: 'THE',
        action: 'FUCK',
        params: {
          param: 0
        }
      });
  });
}, catchErr);
