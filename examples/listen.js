var iq = require('../lib/iq');

iq.listen('iidk');
iq.on({}, function (msg) {
  iq.sendEvent(msg);
})
