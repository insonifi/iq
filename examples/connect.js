var iq = require('../lib/iq');

iq.connect('127.0.0.1','iidk');
iq.on({}, function () {
  iq.DoReact(this);
})
