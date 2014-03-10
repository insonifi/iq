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
var header = new Buffer([0xFF, 0xFF, 0x01, 0x00]),
header_bin = header.binarySlice(),
getFieldOffset = function (buffer, offset) {
  var	length = buffer.readUInt8(offset);
	if (length === 0xFF) {
	  offset += 1;
	  length = buffer.readUInt16LE(offset);
	}
	return length;
},
writeField = function (value) {
  var length = value.length,
    offset,
    buffer,
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
props = ['msg', 'type', 'id', 'action'],
props_len = props.length;


/* Serialize JavaScript Object to binary protocol */
module.exports.toBuf = function (Message) {
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
	  buffers.push(writeField(Message[props[idx]]));
  }
  /* number of parameters */
  if (Message.params.count > 0) {
    buffers.push(new Buffer([Message.params.count]));
    buffers.push((new Buffer([0x00])));
    /* parameters */
    for (name in Message.params) {
      if (Message.params.hasOwnProperty(name) && name !== 'count') {
        buffers.push(writeField(name));
        buffers.push(writeField(Message.params[name]));
      }
    }
  }
	return Buffer.concat(buffers);
}

/* Deserialize binary buffer to JavaScript Object */
module.exports.toMsg = function (buffer) {
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
	if (buffer.slice(0, 4).binarySlice() === header_bin) {
    offset += 4;
	} else {
	  return new Error('Malformed message')
	}
	/* read message type */
	length = getFieldOffset(buffer, offset);
	offset += 2;//skip 0x00 delimiter
	Message[props[idx]] = buffer.toString('utf8', offset, offset + length);
  offset += length;
	/* read primary message fields */
	for (idx = 1; idx < props_len; idx += 1) {
    length = getFieldOffset(buffer, offset);
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
    	length = getFieldOffset(buffer, offset);
    	length > 255 ? offset += 3 : offset += 1;
      param[i] = buffer.toString('utf8', offset, offset + length);
      offset += length;
    }
    Message.params[param[1]] = param[0];
  }
  return Message;
}
