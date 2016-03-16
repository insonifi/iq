'use strict';
var IQServer = require('../lib/iq').Server,
  IQClient = require('../lib/iq').Client,
  iq_server = new IQServer(),
  iq_client = new IQClient(),
  vows = require('vows'),
  assert = require('assert'),
  i = 0,
  generateString = function (len) {
    var output = '';
    for (; len--; ){
      output += '0';
    }
    return output
  };

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});

vows.describe('connection-test').addBatch({
  'Start listener': {
    topic: function () {
      iq_server.listen('iidk')
        .then((socket) => this.callback(null, socket))
        .catch(this.callback);
    },
    'Socket open': function (socket) {
      let address = socket.address();
      assert.isObject(socket);
      assert.equal(address.port, '21030');
    }
  },
  'Connect to listener': {
    topic: function () {
      iq_client.connect({port: 'iidk'})
        .then((socket) => this.callback(null, socket))
        .catch(this.callback);
    },
    'Socket open': function (socket) {
      assert.isObject(socket);
      assert.equal(socket.remoteAddress, '127.0.0.1');
      assert.equal(socket.remotePort, '21030');
    }
  },
  'Test communication:': {
    'Send/receive reaction (Server -> Client)': {
      topic: function () {
        let a_message = {type: 'OBJECT', action: 'ACTION', id: '0'};
        iq_client.on(a_message, (m) => this.callback(null, m));
        iq_server.sendReact(a_message);
      },
      'Received reaction': function (msg) {
        assert.equal(msg.msg, 'React');
        assert.equal(msg.type, 'OBJECT');
        assert.equal(msg.action, 'ACTION');
        assert.equal(msg.id, '0');
        assert.include(msg, 'params');
      }
    },
    'Send Core Reaction (Server -> Client)': {
      topic: function () {
        let c_message = {type: 'OBJECT', action: 'ACTION', id: '2', params: {name0: 'one', name1: 'two'}};
        let core_message = {type: 'CORE', action: 'DO_REACT'};
        iq_client.on(core_message, (m) => this.callback(null, m));
        iq_server.sendCoreReact(c_message);
      },
      'Received Core reaction': function (msg) {
        assert.equal(msg.msg, 'Event');
        assert.equal(msg.type, 'CORE');
        assert.equal(msg.id, '');
        assert.equal(msg.action, 'DO_REACT');
        assert.include(msg, 'params');
        assert.equal(msg.params.param0_name, 'name0');
        assert.equal(msg.params.param0_val, 'one');
        assert.equal(msg.params.param1_name, 'name1');
        assert.equal(msg.params.param1_val, 'two');
        assert.equal(msg.params.params, '2');
        assert.equal(msg.params.source_type, 'OBJECT');
        assert.equal(msg.params.action, 'ACTION');
        assert.equal(msg.params.source_id, '2');
      }
    },
    'Send/receive event (Client -> Server)': {
      topic: function () {
        let b_message = {type: 'OBJECT', action: 'ACTION', id: '1'};
        iq_server.on(b_message, (m) => this.callback(null, m));
        iq_client.sendEvent(b_message);
      },
      'Received event': function (msg) {
        assert.equal(msg.msg, 'Event');
        assert.equal(msg.type, 'OBJECT');
        assert.equal(msg.action, 'ACTION');
        assert.equal(msg.id, '1');
        assert.include(msg, 'params');
      }
    },
    'Receive event from interface (Server -> Client)': {
      topic: function () {
        let iface_message = {type: 'ACTIVEX', action: 'EVENT', params: {objtype: 'OBJECT', objaction: 'ACTION', objid: '2'}};
        let subs_message = {type: 'OBJECT', action: 'ACTION', id: '2'};
        iq_client.on(subs_message, (m) => this.callback(null, m));
        iq_server.sendEvent(iface_message);
      },
      'Compare sent/received message': function (msg) {
        assert.equal(msg.msg, 'Event');
        assert.equal(msg.type, 'OBJECT');
        assert.equal(msg.action, 'ACTION');
        assert.equal(msg.id, '2');
        assert.include(msg, 'params');
      }
    },
    'Long parameters': {
      'up to 8-bit length': {
        topic: function () {
          let param_val = generateString(Math.pow(2, 8) - 2);
          let message = {
            type: 'OBJECT',
            action: 'ACTION',
            id: '3',
            params: {
              param: param_val
            }
          };
          iq_client.on(message, (m) => this.callback(null, m));
          iq_server.sendEvent(message);
        },
        'up to 8-bit length': function (msg) {
          let param_val = generateString(Math.pow(2, 8) - 2);
          assert.equal(msg.params.param.length, param_val.length);
        }
      },
      'up to 16-bit length': {
        topic: function () {
          let param_val = generateString(Math.pow(2, 16) - 2);
          let message = {
            type: 'OBJECT',
            action: 'ACTION',
            id: '4',
            params: {
              param: param_val
            }
          };
          iq_client.on(message, (m) => this.callback(null, m));
          iq_server.sendEvent(message);
        },
        'up to 16-bit length': function (msg) {
          let param_val = generateString(Math.pow(2, 16) - 2)
          assert.equal(msg.params.param.length, param_val.length);
        }
      },
      'more than 16-bit length (32-bit is unachievable due to V8 memory limit)': {
        topic: function () {
          let param_val = generateString(Math.pow(2, 20));
          let message = {
            type: 'OBJECT',
            action: 'ACTION',
            id: '5',
            params: {
              param: param_val
            }
          };
          iq_client.on(message, (m) => this.callback(null, m));
          iq_server.sendEvent(message);
        },
        'more then 16-bit length': function (msg) {
          let param_val = generateString(Math.pow(2, 20))
          assert.equal(msg.params.param.length, param_val.length);
        }
      }
    },
    /*
    'API:': {
      'Get config:': {
        topic: function () {
          iq_server.on({type: 'CORE', action: 'GET_CONFIG'}, (msg) => {
            if (msg.params.objtype !== undefined) {
              iq_server.sendEvent({type: 'ACTIVEX', action: 'OBJECT_CONFIG', params: {objtype: msg.params.objtype, objid: '0'}});
              iq_server.sendEvent({type: 'ACTIVEX', action: 'OBJECT_CONFIG', params: {objtype: msg.params.objtype, objid: '1'}});
              iq_server.sendEvent({type: 'ACTIVEX', action: 'OBJECT_CONFIG', params: {objtype: msg.params.objtype, objid: '2'}});
              iq_server.sendEvent({type: 'ACTIVEX', action: 'END_CONFIG'});
            }
          });
          iq_client.get({type: 'CAM', prop: 'CONFIG'}).then((list) => this.callback(null, list));
        },
        'Got list of 3': function (err, list) {
          assert.lengthOf(list, 3);
          assert.equal(list[0].type, 'CAM');
          assert.equal(list[0].id, '0');
        }
      },
      'Get state:': {
        topic: function () {
          let callback = this.callback;
          iq_server.on({type: 'CORE', action: 'GET_STATE'}, (msg) => {
            if (msg.params.objtype !== undefined) {
              iq_server.sendEvent({type: 'ACTIVEX', action: 'OBJECT_STATE', params: {objtype: msg.params.objtype, objid: '0'}});
              iq_server.sendEvent({type: 'ACTIVEX', action: 'OBJECT_STATE', params: {objtype: msg.params.objtype, objid: '1'}});
              iq_server.sendEvent({type: 'ACTIVEX', action: 'OBJECT_STATE', params: {objtype: msg.params.objtype, objid: '2'}});
              iq_server.sendEvent({type: 'ACTIVEX', action: 'END_STATE'});
            }
          });
          iq_client.get({type: 'CAM', prop: 'STATE'}).then((list) => this.callback(null, list));
        },
        'Got list of 3': function (err, list) {
          assert.lengthOf(list, 3);
          assert.equal(list[0].type, 'CAM');
          assert.equal(list[0].id, '0');
        }
      }
    }

    /**/
  }
}).addBatch({
  'Internal events': {
    'Disconnect': {
      topic: function () {
        iq_client.on({type: 'IQ', action: 'DISCONNECTED'}, (m) => this.callback(null, m));
        iq_client.disconnect();
      },
      'event received': function (msg) {
        assert.include(msg, 'type');
      },
    },
    'Connected': {
      topic: function () {
        iq_client.on({type: 'IQ', action: 'CONNECTED'}, (m) => this.callback(null, m));
        iq_client.connect({port: 'iidk'}).catch(this.callback);
      },
      'event received': function (msg) {
        assert.include(msg, 'type');
      },
    },
  },
}).addBatch({
  'Reconnection': {
    topic: function () {
      const iqConnected = {type: 'IQ', action: 'CONNECTED'};
      iq_client.disconnect();
      iq_client.connect({port: 'iidk', reconnect: true})
        .then(() => iq_client.on(iqConnected, (m) => this.callback(null, m)))
        .then(iq_client.disconnect)
        .catch(this.callback);
    },
    'reconnected': function (msg) {
      assert.include(msg, 'type');
    },
  },
}).export(module);
