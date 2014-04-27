var iq = require('../lib/iq');

iq.listen('iidk');
iq.on({type: 'CAM', action: 'REC'}, function () {
  iq.send(this);
})
