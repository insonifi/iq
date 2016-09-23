/* global require, Buffer, Promise, module, console, process, setTimeout */
/* jshint -W097 */
/* jshint esnext: true */
'use strict';
const os = require('os');
const net = require('net');
const util = require('util');
const Writable = require('stream').Writable;
const Readable = require('stream').Readable;
const Msg = require('./messages');
const Conveyor = require('./conveyor');
const PORTS = {
  'iidk': 21030,
  'slave': 21111,
  'video': 20900,
  'map': 21051,
  'pos': 21012,
  'web': 21034
};
const RETRY_TIME = 3000;
const DISCONNECT = {type: 'IQ', action: 'DISCONNECT'};
/**** API ****/
function factorySendReact(output) {
  return (msg) => {
    msg.msg = 'React';
    output.push(msg);
  };
}
function factorySendEvent(output) {
  return (msg) => {
    msg.msg = 'Event';
    output.push(msg);
  };
}
function factorySendCoreReact(output) {
  return (msg) => output.push(toCoreReact(msg));
}
/**** Internal *****/
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
function bind(pipeline, socket) {
  socket.pipe(pipeline.decomposer, {end: false});
  pipeline.composer.pipe(socket, {end: false});
}
function unbind(pipeline, socket) {
  socket.unpipe(pipeline.decomposer);
  pipeline.composer.unpipe(socket);
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
function Server () {
  const pipeline = new Pipeline();
  const conveyor = pipeline.conveyor; 

  this.listen = function listen(port) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();

      server.listen(PORTS[port]);
      server.on('listening', () => resolve(server));
      server.on('connection', (socket) => {
        bind(pipeline, socket);
        socket.on('error', (err) => {
          reject(err);
        });
        socket.on('close', () => {
          unbind(pipeline, socket);
        });
      });
    });
  };
  this.on = conveyor.subscribe.bind(conveyor);
  this.off = conveyor.unsubscribe.bind(conveyor);
  this.sendReact = factorySendReact(pipeline.output);
  this.sendCoreReact = factorySendCoreReact(pipeline.output);
  this.sendEvent = factorySendEvent(pipeline.output);
}
/**** Client ****/
// TODO: keep connected IIDK id and append it as slave_id<> parameter
function Client () {
  const pipeline = new Pipeline();
  const conveyor = pipeline.conveyor;

  this.connect = function connect(options) {
    return new Promise((resolve, reject) => {
      const socket = net.Socket();
      const ip = options.ip || '127.0.0.1';
      const port_name = options.port || 'iidk';
      const port = PORTS[port_name];
      const host_id = options.host || os.hostname().toUpperCase();
      const reconnect = options.reconnect || false;
      const iidk_id = options.hasOwnProperty('iidk') ? '.' + options.iidk : '';
      const iqConnected = {
        type: 'IQ',
        action: 'CONNECTED',
      };
      const iqDisconnected = {
        type: 'IQ',
        action: 'DISCONNECTED',
      };
      const connectSocket = () => socket.connect({host: ip, port: port});

      socket.on('connect', () => {
        let connected = {
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
        bind(pipeline, socket);
        this.sendEvent(connected);
        resolve(socket, 'connected');
        conveyor.handle(iqConnected);
      });
      socket.on('end', () => reject('terminated'));
      socket.on('close', (hasError) => {
        if (hasError || reconnect) {
          setTimeout(connectSocket, RETRY_TIME);
        }
        unbind(pipeline, socket);
        conveyor.handle(iqDisconnected);
      });
      socket.on('error', function (err) {
        setTimeout(connectSocket, RETRY_TIME);
        if (!reconnect) {
          reject(err);
        }
      });
      socket.on('timeout', function (err) {
        setTimeout(connectSocket, RETRY_TIME);
        if (!reconnect) {
          reject('timeout');
        }
      });
      conveyor.subscribe(DISCONNECT, () => socket.end());
      connectSocket();
    });
  };
  this.disconnect = function disconnect() {
    conveyor.handle(DISCONNECT);
  };
  this.on = conveyor.subscribe.bind(conveyor);
  this.off = conveyor.unsubscribe.bind(conveyor);
  this.sendReact = factorySendReact(pipeline.output);
  this.sendCoreReact = factorySendCoreReact(pipeline.output);
  this.sendEvent = factorySendEvent(pipeline.output);
}

util.inherits(Input, Writable);
function Input(options) {
  if (!(this instanceof Input)) {
    return new Input(options);
  }
  Writable.call(this, options);
  this._writableState.objectMode = true;
  this.conveyor = new Conveyor();
  this._write = (msg, encoding, next) => {
    process.nextTick(() => this.conveyor.handle(preprocess(msg)));
    next();
  };
}
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
    //    } else {
    //      catch(message);
  } else {
    return message;
  }
}

/* Construct pipeline */
function Pipeline() {
  const input = new Input();
  const output = new Readable({objectMode: true});
  const decomposer = new Msg.decomposer();
  const composer = new Msg.composer();

  output._read = () => {};  
  output.pipe(composer, {end: false});
  decomposer.pipe(input, {end: false});

  this.output = output;
  this.conveyor = input.conveyor;
  this.decomposer = decomposer;
  this.composer = composer;
}

module.exports.Client = Client;
module.exports.Server = Server;
