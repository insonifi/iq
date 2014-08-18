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
/* Support for fields up to 2^32 is possible! */
_writeField = function (value) {
  var string_val = String(value),
    length = string_val.length,
    offset,
    buffer,
    header,
    writeNum = null;
  if (length < 255) {
    header = 1; /* 8bit Int */
    offset = 0;
    writeNum = Buffer.prototype.writeUInt8;
  } else {
    header = 3; /* 0xFF + 16bit Int */
    offset = 1; /* 0xFF */
    writeNum = Buffer.prototype.writeUInt16LE;
  }
  buffer = new Buffer(header + length);
  buffer.fill(0xFF);
/* use chosen above write function */
  writeNum.apply(buffer, [length, offset]);
  buffer.write(string_val, header, length, 'utf8');
  return buffer;
},
_getFieldOffset = function (buffer, offset) {
  var bit_mask = 0,
    length = 0;
  while (buffer.readUInt8(offset + bit_mask) === 0xFF)  {
    offset += 1;
    bit_mask += 1;
  } 
  switch (bit_mask) {
    case 0:
      length = buffer.readUInt8(offset);
      break;
    case 1:
      offset += 1;
      length = buffer.readUInt16LE(offset);
      offset += 1;
      break;
    case 2:
      offset += 1;
      length = buffer.readUInt32LE(offset);
      offset += 1;
      break;
    default:
      throw new Error('Can\'t read field length');
      break;
  }
  return {length: length, offset: offset + bit_mask + 1};
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
    i,
    param_count,
    field,
    offset = 0;
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
      param[i] = buffer.toString('utf8', offset, offset + field.length);
      offset += field.length;
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
        console.error('[ProtocolIn]', err, '(appending next packet)');
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
