var iq = require('../lib/iq'),
    doSomething = function () {},
    catchErr = function (e) { console.log(e); };

iq.connect({ip: '127.0.0.1', iidk: '1', host: 'SERVER'})
.then(doSomething, catchErr);
