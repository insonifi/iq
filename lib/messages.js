/* global require, Buffer, module, console */
/* jshint -W097 */
'use strict';
/* message = {
 *  msg -- message type (Event/Msg)
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
var
props = ['msg', 'type', 'id', 'action'],
props_len = props.length,
util = require('util'),
Transform = require('stream').Transform,
/* utility function */
_iter = function (fn) {
  var i = this.length;
  for (;i--;) {
    fn.call(this[i]);
  }
},
_byteLength = function (number) {
  var byte_length = 1;
  number += 1;
  while (number >>= 8) {
    byte_length += 1;
  }
  return byte_length
},
/* Support for field up to 2^32 is possible! */
_writeField = function (value) {
  var SIZE = [1, 2, 4, 4],
    string_val = String(value),
    val_length = string_val.length,
    byte_length = SIZE[_byteLength(val_length) - 1],
    byte_mask = byte_length - 1,
    header_length = byte_mask + byte_length,
    buffer = new Buffer(header_length + val_length),
    header = new Buffer(4);
  buffer.fill(0xFF, 0, byte_mask);
  header.writeUInt32LE(val_length, 0);
  header.copy(buffer, byte_mask, 0, byte_length);
  buffer.write(value, header_length, val_length, 'utf8');
  return buffer;
},
_getFieldOffset = function (buffer, offset) {
  var SIZE = [1, 2, 4, 4],
    byte_mask = 0,
    byte_offset = 0,
    header_offset = 0,
    length = 0,
    temp_buf = new Buffer([0,0,0,0]);
  while (buffer[offset + byte_mask] === 0xFF)  {
    byte_mask += 1;
  }
  byte_offset = SIZE[byte_mask];
  header_offset = byte_mask + byte_offset;
  buffer.copy(temp_buf, 0, offset + byte_mask, offset + header_offset);
  length = temp_buf.readUInt32LE(0);
  return {length: length, offset: offset + header_offset};
},
/* Serialize JavaScript Object to binary protocol */
_serialize = function (msg) {
  var idx = 0,
    params = [],
    message = new Message(msg),
    /* frame header */  
    buffers = [(new Buffer([0xFF, 0xFF, 0x01, 0x00]))];
  params = Object.keys(message.params);
  /* message type */
  buffers.push(new Buffer([message.msg.length]));
  buffers.push(new Buffer([0x00]));
  buffers.push(new Buffer(message.msg));
  /* primary fields */
  for (idx = 1; idx < props_len; idx += 1) {
    buffers.push(_writeField(message[props[idx]]));
  }
  buffers.push(new Buffer([params.length]));
  buffers.push((new Buffer([0x00])));
  /* parameters */
  _iter.call(params, function () {
    buffers.push(_writeField(this));
    buffers.push(_writeField(message.params[this]));
  });
  return Buffer.concat(buffers);
},
/* Deserialize binary buffer to JavaScript Object */
_deserialize = function (buffer) {
  var message = new Message(),
    param = [],
    idx = 0,
    increment = 0,
    i = 0,
    param_count = 0,
    field = {},
    offset = 0,
    offset_length = 0;
  /* read message type */
  field = _getFieldOffset(buffer, offset);
  offset += 2;//skip 0x00 delimiter
  message[props[idx]] = buffer.toString('utf8', offset, offset + field.length);
  offset += field.length;
  /* read primary message fields */
  for (idx = 1; idx < props_len; idx += 1) {
    field = _getFieldOffset(buffer, offset);
    offset = field.offset;
    message[props[idx]] = buffer.toString('utf8', offset, offset + field.length);
    offset += field.length;
  }
  /* read parameters */
  param_count = buffer.readUInt8(offset);
  offset += 2;
  for (idx = param_count; idx--;) {
    for (i = 2; i--;) {
      field = _getFieldOffset(buffer, offset);
      offset = field.offset;
      offset_length = field.offset + field.length;
      if (offset_length < buffer.length) {
        param[i] = buffer.toString('utf8', offset, offset_length);
        offset += field.length;
      } else {
        throw new Error('field length beyond buffer boundary');
      }
    }
    message.params[param[1]] = param[0];
  }
  message.length = offset;
  return message;
};

/* transform stream */
util.inherits(ProtocolIn, Transform);

function ProtocolIn (options) {
  if (!(this instanceof ProtocolIn)) {
    return new ProtocolIn(options);
  }

  Transform.call(this, options);
  this._inMsg = false;
  this._raw = new Buffer(0);
  this._header = (new Buffer([0xFF, 0xFF, 0x01, 0x00])).binarySlice();
  this._readableState.objectMode = true;
  this._writableState.objectMode = false;
}

ProtocolIn.prototype._transform = function (chunk, encoding, done) {
  var offset = 0,
    raw = null,
    header_length = this._header.length,
    msg = null;
  
  raw = Buffer.concat([this._raw, chunk]);
  /* find next frame start */
  while (offset < raw.length) {
    if (raw.binarySlice(offset, offset + header_length) === this._header) {
      offset += header_length;
      try {
        msg = _deserialize(raw.slice(offset));
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
  this.push(_serialize(chunk));
  done();
};

function Message (M) {
  if (!M) {
    M = {};
  }
  this.msg = M.msg || '';
  this.type = M.type || '';
  this.action = M.action || '';
  this.id = M.id || '';
  this.params = M.params || {};
}

module.exports.decomposer = ProtocolIn;
module.exports.composer = ProtocolOut;
//module.exports.serialize = _serialize;
//module.exports.deserialize = _deserialize;
