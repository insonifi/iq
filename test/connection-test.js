var iq = require('../lib/iq'),
  vows = require('vows'),
  assert = require('assert'),
  a_message = {type: 'OBJECT', action: 'ACTION', id: '0'},
  b_message = {type: 'OBJECT', action: 'ACTION', id: '1'},
  state = {};
  
vows.describe('connection-test').addBatch({
  'Start listener': {
    topic: function () {
      server = iq.listen('iidk');
      return server;
    },
    'Check socket': function (topic) {
      var address = topic.address();
      assert.isObject(topic);
      assert.equal(address.address, '0.0.0.0');
      assert.equal(address.port, '21030');
    }
  },
  'Connect to listener': {
    topic: function () {
      socket = iq.connect('127.0.0.1', 'iidk');
      return socket;
    },
    'Check socket': function (topic) {
      assert.isObject(topic);
      assert.equal(topic.remoteAddress, '127.0.0.1');
      assert.equal(topic.remotePort, '21030');
    }
  },
  'Test communication': {
    'DoReact': {
      topic: function () {
        var $this = this;
        iq.on(a_message, function (msg) {
          $this.callback(null, msg);
        });
        iq.DoReact(a_message);
      },
      'Compare sent/received message': function (err, msg) {
        assert.equal(msg.msg, 'React');
        assert.equal(msg.type, 'OBJECT');
        assert.equal(msg.action, 'ACTION');
        assert.equal(msg.id, '0');
        assert.isObject(msg.params);
      }
    },
    'NotifyEvent': {
      topic: function () {
        var $this = this;
        iq.on(b_message, function (msg) {
          $this.callback(null, msg);
        });
        iq.NotifyEvent(b_message);
      },
      'Compare sent/received message': function (err, msg) {
        assert.equal(msg.msg, 'Event');
        assert.equal(msg.type, 'OBJECT');
        assert.equal(msg.action, 'ACTION');
        assert.equal(msg.id, '1');
        assert.isObject(msg.params);
        assert.match(msg.params.time, /\d{2}:\d{2}:\d{2}/);
        assert.match(msg.params.date, /\d{2}-\d{2}-\d{2}/);
        assert.match(msg.params.fraction, /\d{1,3}/);
        assert.match(msg.params.guid, /[A-Z0-9]{8}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{12}/);
      }
    }
  }
}).export(module);
process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});
