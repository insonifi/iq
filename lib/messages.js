/* global require, Buffer, module */
/* jshint -W097 */
/* jshint esnext: true */
'use strict';
/* message = {
 *  msg -- message type {Event, Msg, React}
 *  type -- object type
 *  id -- object id
 *  action -- object action
 *  params -- {
 *      count: <number of parameters>
 *      param1: val1,
 *      param2: val2 ...
 *  }
 *
 * }
 *
 */
const util = require('util');
const Transform = require('stream').Transform;
const SIZE = [1, 2, 4, 4];
/* utility function */
function iter(array, fn) {
  let i = array.length;
  for (;i--;) {
    fn.call(array[i]);
  }
}
function byteLength(number) {
  let byte_length = 1;
  number += 1;
  while (number >>= 8) {
    byte_length += 1;
  }
  return byte_length;
}
/* Support for field up to 2^32 is possible! */
function writeField(value) {
  let string_val = String(value);
  let val_length = string_val.length;
  let byte_length = SIZE[byteLength(val_length) - 1];
  let byte_mask = byte_length - 1;
  let header_length = byte_mask + byte_length;
  let buffer = new Buffer(header_length + val_length);
  let header = new Buffer(4);

  buffer.fill(0xFF, 0, byte_mask);
  header.writeUInt32LE(val_length, 0);
  header.copy(buffer, byte_mask, 0, byte_length);
  buffer.write(string_val, header_length, val_length, 'utf8');

  return buffer;
}
function readField(buffer, offset, length) {
  let offset_length = offset + length;
  if (offset + length > buffer.length) {
    throw new Error('field length beyond buffer boundary');
  }
  return buffer.toString('utf8', offset, offset_length);
}
function getFieldLength(buffer, offset) {
  let byte_mask = 0;
  let byte_offset = 0;
  let header_offset = 0;
  let length = 0;
  let temp_buf = new Buffer([0,0,0,0]);
  while (buffer[offset + byte_mask] === 0xFF)  {
    byte_mask += 1;
  }
  byte_offset = SIZE[byte_mask];
  header_offset = byte_mask + byte_offset;
  buffer.copy(temp_buf, 0, offset + byte_mask, offset + header_offset);
  length = temp_buf.readUInt32LE(0);
  return {length: length, offset: offset + header_offset};
}

/* Serialize JavaScript Object to binary protocol */
class Message {
  constructor (M) {
    if (!M) {
      M = {};
    }
    this.msg = M.msg || '';
    this.type = M.type || '';
    this.action = M.action || '';
    this.id = M.id || '';
    this.params = M.params || {};
  }
}

function serialize(msg) {
  let params = [];
  let primary = ['action', 'id', 'type'];
  let message = new Message(msg);
  /* frame header */
  let buffers = [(new Buffer([0xFF, 0xFF, 0x01, 0x00]))];
  params = Object.keys(message.params);
  /* message type */
  buffers.push(new Buffer([message.msg.length, 0x00]));
  buffers.push(new Buffer(message.msg));
  /* primary fields */
  iter(primary, function () {
    buffers.push(writeField(message[this]));
  });
  buffers.push(new Buffer([params.length, 0x00]));
  /* parameters */
  iter(params, function () {
    buffers.push(writeField(this));
    buffers.push(writeField(message.params[this]));
  });
  return Buffer.concat(buffers);
}
/* Deserialize binary buffer to JavaScript Object */
function deserialize(buffer) {
  let message = new Message();
  let param = [];
  let i = 0;
  let count = 0;
  let field = {};
  let offset = 0;
  let primary = ['action', 'id', 'type'];
  /* read message type */
  field = getFieldLength(buffer, offset);
  offset += 2;//skip 0x00 delimiter
  message.msg = readField(buffer, offset, field.length);
  offset += field.length;
  /* read primary message fields */
  iter(primary, function () {
    field = getFieldLength(buffer, offset);
    offset = field.offset;
    message[this] = readField(buffer, offset, field.length);
    offset += field.length;
  });
  /* read parameters */
  count = buffer.readUInt8(offset);
  offset += 2;
  for (; count--;) {
    for (i = 2; i--;) {
      field = getFieldLength(buffer, offset);
      offset = field.offset;
      param[i] = readField(buffer, field.offset, field.length);
      offset += field.length;
    }
    message.params[param[1]] = param[0];
  }
  message.length = offset;
  return message;
}

/* transform stream */
util.inherits(ProtocolIn, Transform);

function ProtocolIn (options) {
  if (!(this instanceof ProtocolIn)) {
    return new ProtocolIn(options);
  }

  Transform.call(this, options);
  this._inMsg = false;
  this._raw = new Buffer(0);
  this._header = new Buffer([0xFF, 0xFF, 0x01, 0x00]);
  this._readableState.objectMode = true;
  this._writableState.objectMode = false;
}

ProtocolIn.prototype._transform = function (chunk, encoding, done) {
  let offset = 0;
  let raw = new Buffer(0);
  let HEADER_LENGTH = 4;
  let msg = {};

  raw = Buffer.concat([this._raw, chunk]);
  /* find next frame start */
  while (offset < raw.length - HEADER_LENGTH) {
    if (raw[offset] === this._header[0] &&
        raw[offset + 1] === this._header[1] &&
        raw[offset + 2] === this._header[2] &&
        raw[offset + 3] === this._header[3]) {
      offset += HEADER_LENGTH;
      try {
        msg = deserialize(raw.slice(offset));
        this.push(msg);
        if (msg.length < raw.length) {
          raw = raw.slice(offset + msg.length);
          offset = 0;
          this._raw = new Buffer(0);
          continue;
        }
      } catch (err) {
        //console.error('[ProtocolIn]', err, '(appending next packet)');
        this._raw = raw;
      }
    }
    offset += 1;
  }
  done();
};

util.inherits(ProtocolOut, Transform);

function ProtocolOut (options) {
  if (!(this instanceof ProtocolOut)) {
    return new ProtocolOut(options);
  }

  Transform.call(this, options);
  this._readableState.objectMode = false;
  this._writableState.objectMode = true;
}

ProtocolOut.prototype._transform = function (chunk, encoding, done) {
  this.push(serialize(chunk));
  done();
};

module.exports.decomposer = ProtocolIn;
module.exports.composer = ProtocolOut;
module.exports.serialize = serialize;
//module.exports.deserialize = deserialize;
