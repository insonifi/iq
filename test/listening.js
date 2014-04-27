var iq = require('../lib/iq');

iq.listen('iidk');
iq.on({type: 'CAM', id: '0'}, function () {
  console.log(this);
  iq.send(this);
})
