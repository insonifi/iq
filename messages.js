/* message = {
 * 	msg -- message type (Event/Msg)
 * 	type -- object type
 * 	id -- object id
 * 	action -- object action
 * 	params -- {
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
_writeField = function (value) {
  var length = value.length,
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
  buffer.write(value, header, length, 'utf8');
  return buffer;
},
_getFieldOffset = function (buffer, offset) {
  var	length = buffer.readUInt8(offset);
	if (length === 0xFF) {
	  offset += 1;
	  try {
  	  length = buffer.readUInt16LE(offset);
	  } catch (e){
	    return null
	  }
	}
	return length;
},
/* Serialize JavaScript Object to binary protocol */
_serialize = function (Message) {
  var idx,
    i,
    length,
    /* frame header */  
    buffers = [(new Buffer([0xFF, 0xFF, 0x01, 0x00]))];
  /* message type */
  buffers.push(new Buffer([Message.msg.length]));
  buffers.push(new Buffer([0x00]));
  buffers.push(new Buffer(Message.msg));
  /* primary fields */
	for (idx = 1; idx < props_len; idx += 1) {
	  buffers.push(_writeField(Message[props[idx]]));
  }
  /* number of parameters */
  if (Message.params.count > 0) {
    buffers.push(new Buffer([Message.params.count]));
    buffers.push((new Buffer([0x00])));
    /* parameters */
    for (name in Message.params) {
      if (Message.params.hasOwnProperty(name) && name !== 'count') {
        buffers.push(_writeField(name));
        buffers.push(_writeField(Message.params[name]));
      }
    }
  }
	return Buffer.concat(buffers);
},
/* Deserialize binary buffer to JavaScript Object */
_deserialize = function (buffer) {
	var Message = {
	    msg: '',
      type: '',
      id: '',
      action: '',
      params: {
        count: 0
      }
	  },
	  param = [],
	  idx = 0,
	  i,
	  param_count,
  	length = 0
  	offset = 0;
	/* read message type */
	length = _getFieldOffset(buffer, offset);
	offset += 2;//skip 0x00 delimiter
	Message[props[idx]] = buffer.toString('utf8', offset, offset + length);
  offset += length;
	/* read primary message fields */
	for (idx = 1; idx < props_len; idx += 1) {
    length = _getFieldOffset(buffer, offset);
    length > 255 ? offset += 3 : offset += 1;
  	Message[props[idx]] = buffer.toString('utf8', offset, offset + length);
	  offset += length;
	}
	/* read parameters */
  param_count = buffer.readUInt8(offset);
  Message.params.count = param_count;
  offset += 2;
  for (idx = param_count; idx--;) {
    for (i = 2; i--;) {
    	length = _getFieldOffset(buffer, offset);
    	length > 255 ? offset += 3 : offset += 1;
      param[i] = buffer.toString('utf8', offset, offset + length);
      offset += length;
    }
    Message.params[param[1]] = param[0];
  }
  Message.length = offset;
  return Message;
};

/* transform stream */
util.inherits(ProtocolIn, Transform);

function ProtocolIn (options) {
  if (!(this instanceof ProtocolIn))
    return new ProtocolIn(options);

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
//        this.emit('message', msg);
        this.push(msg);
        if (msg.length < raw.length) {
          raw = raw.slice(offset + msg.length);
          offset = 0;
          this._raw = new Buffer(0);
          continue;
        }
      } catch (err) {
        console.error('error', err);
        this._raw = raw;
        return;
      }
    }
    offset += 1;
  }
  done();
}

util.inherits(ProtocolOut, Transform);

function ProtocolOut (options) {
  if (!(this instanceof ProtocolOut))
    return new ProtocolOut(options);

  Transform.call(this, options);
  this._readableState.objectMode = false;
  this._writableState.objectMode = true;
}

ProtocolOut.prototype._transform = function (chunk, encoding, done) {
  this.push(_serialize(chunk));
  done();
}

module.exports.parser = ProtocolIn;
module.exports.assembler = ProtocolOut;
//module.exports.serialize = _serialize;
//module.exports.deserialize = _deserialize;
