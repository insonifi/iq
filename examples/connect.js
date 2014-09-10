var iq = require('../iqnode'),
    catchErr = function (e) { console.log(e); };

iq.connect({ip: '127.0.0.1', iidk: '1', host: 'VM490'})
.then(function () {
  iq.on({}, function (msg) {
    iq.sendEvent(msg);
  })
}, catchErr)
.then(function () {
  iq.sendEvent({
    type: 'WHAT',
    id: 'THE',
    action: 'FUCK',
    params: {
      param: 0
    }
  });
}, catchErr)
.then(function () {
  iq.on({type: 'MACRO'}, function (msg) {
    console.log(msg.type, msg.action);
    iq.get({type: 'CAM', prop: 'STATE'}).then(function (list) {
      var i = 0,
        len = list.length;
      for (i = 0; i < len; i += 1) {
        console.log('[state]', list[i].params.state);
      }
    });
  });
});
