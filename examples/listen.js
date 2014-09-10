var iq = require('../iqnode');

iq.listen('iidk');
iq.on({}, function (msg) {
  iq.sendEvent(msg);
})
