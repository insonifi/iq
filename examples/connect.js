var iq = require('../lib/iq');

iq.connect({ip: '127.0.0.1', iidk: '1'});
iq.on({}, function () {
  iq.DoReact(this);
})
