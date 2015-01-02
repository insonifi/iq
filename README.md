[![Build Status](https://travis-ci.org/insonifi/iq-node.svg?branch=master)](https://travis-ci.org/insonifi/iq-node) [![Code Climate](https://codeclimate.com/github/insonifi/iq.png)](https://codeclimate.com/github/insonifi/iq)
# iq-node
*iq-node* is a Javascript library, that implements IIDK communication protocol in pure Javascript. Which gives you following powers:
* Connect to *Axxon Intellect* IIDK.
  * Connect and manage multiple servers.
* Bi-directional message exchange.
* Augment *Intellect* with power of *node.js*:
  * Unrestricted Javascript engine.
  * I/O operations, filesystem and network.
  * Asynchronous execution.
  * Develop custom, loadable modules.
  * *npm* packages (e.g. database drivers).
  * Wide platform support (Windows, Linux, Mac OS).
* Pure Javascript, as in "no compiling and easy debugging".
* Perfect for web applications.
  * HTTP support out-of-the-box.

## Installation
```
npm install --save insonifi/iq-node
```

## Usage
First, you need to connect to server:
```javascript
var iq = require('iq-node');
iq.connect({ip: '192.168.123.45', iidk: '1'})
```
Then you, can subscribe a callback, which will fire when defined message is received:
```javascript
iq.on({type: 'MACRO', id: '1', action: 'RUN'}, function (msg) { console.log('%s %s emitted %s message', msg.type, msg.id, msg.action); });
```

More documentation can be found in [wiki] (https://github.com/insonifi/iq-node/wiki).

# License
Library is licensed under [MIT License] (https://github.com/insonifi/iq-node/blob/master/LICENSE.md). Which means you can use it any way you like.
