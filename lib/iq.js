/* global require, Buffer, Promise, module, console, process, setTimeout */
/* jshint -W097 */
/* jshint esnext: true */
'use strict';
const os = require('os');
const net = require('net');
const util = require('util');
const Writable = require('stream').Writable;
const output = require('stream').Readable({objectMode: true});
const Msg = require('./messages');
const Conveyor = require('./conveyor');
const conveyor = new Conveyor();
const PORTS = {
  'iidk': 21030,
  'slave': 21111,
  'video': 20900,
  'map': 21051,
  'pos': 21012,
  'web': 21034
};
const RETRY_TIME = 3000;
// var queue = [];
/**** API ****/
function sendReact(msg) {
  msg.msg = 'React';
  output.push(msg);
}
function sendEvent(msg) {
  msg.msg = 'Event';
  output.push(msg);
}
function toCoreReact(msg) {
  let event = {
      msg: 'Event',
      type: 'CORE',
      action: 'DO_REACT',
      params: {
        source_type: msg.type,
        source_id: msg.id,
        action: msg.action
      }
    };
  let keys = {};
  let key = '';
  let i = 0;
  if (msg.params) {
    keys = Object.keys(msg.params);
    i = keys.length;
    event.params.params = i;
    for (;i--;) {
      key = keys[i];
      event.params['param' + i + '_name'] = key;
      event.params['param' + i + '_val'] = msg.params[key];
    }
  }
  return event;
}
function sendCoreReact(msg) {
  output.push(toCoreReact(msg));
}
/**** Internal *****/
function convert(msg) {
  msg.type = msg.params.objtype || '';
  msg.action = msg.params.objaction || '';
  msg.id = msg.params.objid || '';
  delete msg.params.objtype;
  delete msg.params.objaction;
  delete msg.params.objid;
  return msg;
}
function preprocess(message) {
  if (message.type === 'ACTIVEX' && message.action === 'EVENT') {
    message.msg = 'Event';
    return convert(message);
/*    } else {
      catch(message);*/
  } else {
    return message;
  }
}
function push(msg, encoding, next) {
  process.nextTick(function () {
    conveyor.handle(preprocess(msg));
  });
  next();
}
function bind(socket) {
  const decomposer = new Msg.decomposer();
  const composer = new Msg.composer();
  const input = new Input();
  socket.pipe(decomposer).pipe(input);
  output.pipe(composer).pipe(socket);
}
/*
function catch(msg) {
  // BEGIN_STATE, OBJECT_STATE, END_STATE, OBJECT_CONFIG, END_CONFIG
  var parts = msg.action.slice(0, msg.action.indexOf('_'));
  if (queue.length === 0) {
    return;
  }
  if (parts === 'OBJECT') {
    queue[0].append(convert(msg));
  }
  if (parts === 'END') {
    queue[0].finish(msg);
  }
}
function _getAccumulator(resolve) {
  let list = [];
  return {
    append: function (msg) {
      list.push(msg);
    },
    finish: (function (msg) {
      resolve(list);
      conveyor.unqueue();
      //console.log('[accumulator] got list of', list.length);
    }).bind(this)
  };
}

*/
/*
function get(options) {
  return new Promise(function (resolve, reject) {
    let accumulator = _getAccumulator(resolve);
    if (options.type === undefined) {
      return new Error("[get] Object type is not defined");
    }
    if (options.prop === undefined) {
      return new Error("[get] Property type is not defined");
    }
    console.log(output);
    conveyor.queue(accumulator);
    output.push({
      type: 'CORE',
      action: 'GET_' + options.prop.toUpperCase(),
      params: {
        objtype: options.type,
        objid: options.id || ''
      }
    });
  })
}
*/
/**** Server ****/
function listen(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(PORTS[port]);
    server.on('listening', () =>
              console.log('[listen] Listening on port', server.address().port));
    server.on('connection', (socket) => {
      console.log('[listen] Client %s connected', socket.remoteAddress);
      bind(socket);
      socket.on('error', (err) => {
        console.error('[listen]', err);
        reject(err);
      });
      socket.on('close', () => {
        console.log('[listen] Client disconnected');
      });
    });
    resolve(server);
  });
}
/**** Client ****/
// TODO: keep connected IIDK id and append it as slave_id<> parameter
function connect(options) {
  return new Promise((resolve, reject) => {
    const socket = net.Socket();
    const ip = options.ip || '127.0.0.1';
    const port_name = options.port || 'iidk';
    const port = PORTS[port_name];
    const host_id = options.host || os.hostname().toUpperCase();
    const iidk_id = options.iidk === undefined ? '' : '.' + options.iidk;

    socket.on('connect', () => {
      let now = new Date(),
        connected = {
          type: 'SLAVE',
          id: host_id + iidk_id,
          action: 'CONNECTED',
          params: {
            'SOCKET': socket.localAddress,
            'TRANSPORT_TYPE': 'SOCKET',
            'module': 'node',
            'TRANSPORT_ID': socket.remotePort.toString().slice(1)
          }
        };
      bind(socket);
      console.log('[connect] Connected at', now.toLocaleTimeString());
      sendEvent(connected);
      resolve(socket);
    });
    socket.on('end', () => console.error('[connect] Connection terminated'));
    socket.on('close', () => {
      console.error('[connect] Disconnected');
      setTimeout(connectSocket, RETRY_TIME);
    });
    socket.on('error', (err) => {
      console.error('[connect]', err);
      reject(err);
    });
    socket.on('timeout', () => console.log('[connect] Connection timed out'));
    connectSocket();
    function connectSocket() {
      socket.connect({host: ip, port: port}, () =>
                     console.log('[connect] Connecting to %s:%s', socket.remoteAddress, socket.remotePort));
    }
  });
}
util.inherits(Input, Writable);
function Input(options) {
  if (!(this instanceof Input)) {
    return new Input(options);
  }
  Writable.call(this, options);
  this._writableState.objectMode = true;
}
Input.prototype._write = push;
output._read = function () {};

module.exports.listen = listen;
module.exports.connect = connect;
module.exports.on = (msg, fn) => conveyor.subscribe(msg, fn);
module.exports.sendReact = sendReact;
module.exports.sendCoreReact = sendCoreReact;
module.exports.sendEvent = sendEvent;
//module.exports.get = get;

