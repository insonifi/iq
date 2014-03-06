/* message = {
 * 	msg -- message type (Event/Msg)
 * 	type -- object type
 * 	id -- object id
 * 	action -- object action
 * 	params -- {param1: val1, param2: val2 ...}
 * 
 * }
 * 
 */
var getFieldOffset = function (buf, offset) {
  var	length = buf.readUInt8(offset);
	if (length === 0xFF) {
	  length = buf.readUInt16LE(offset);
	}
	return length;
},
readField = function (buf, offset, length) {
  if (length > 255) {
    offset += 2;
  }
  return buf.toString('utf8', offset, offset + length)
};
module.exports.msgToBuf = function (Message) {
	var BEGIN = new Buffer([0xFF, 0xFF, 0x01, 0x00]),
		size = 0,
		delimiter = new Buffer([0x00]),
		byte = new Buffer(1);
	//write BEGIN marker message type
	byte.writeUInt8(Message.msg.length, 0); //code byte size of the value
	size = BEGIN.length + byte.length + delimiter.length + Message.msg.length //calculate new buffer size
	buffer = Buffer.concat([BEGIN, byte, delimiter, new Buffer(Message.msg)], size);
	//write object type
	byte.writeUInt8(Message.type.length, 0);
	size = buffer.length + byte.length + Message.type.length
	buffer = Buffer.concat([buffer, byte, new Buffer(Message.type)], size);
	//write object id
	byte.writeUInt8(Message.id.length, 0);
	size = buffer.length + byte.length + Message.id.length
	buffer = Buffer.concat([buffer, byte, new Buffer(Message.id)], size);
	//write object action
	byte.writeUInt8(Message.action.length, 0);
	size = buffer.length + byte.length + Message.action.length
	buffer = Buffer.concat([buffer, byte, new Buffer(Message.action)], size);
	if (Message.params != undefined) {
	//write number of parameters
		byte.writeUInt8(Object.keys(Message.params).length, 0);
		size = buffer.length + byte.length + delimiter.length;
		buffer = Buffer.concat([buffer, byte, delimiter], size);
		for (property in Message.params) {
			//write parameter name
			byte.writeUInt8(property.length, 0);
			size = buffer.length + byte.length + property.length
			buffer = Buffer.concat([buffer, byte, new Buffer(property)], size);
			//write parameter value
			byte.writeUInt8(Message.params[property].length, 0);
			size = buffer.length + byte.length + Message.params[property].length
			buffer = Buffer.concat([buffer, byte, new Buffer(Message.params[property])], size);
		}
	}
	return buffer;
}

module.exports.bufToMsg = function (buffer) {
	var Message = {params: {}},
	  props = ['msg', 'type', 'id', 'action'],
	  props_len = props.length,
	  param = [],
	  idx = 0,
	  i,
	  length = 0,
	  param_count = 0;
	/* read message type */
	offset = 0
	length = getFieldOffset(buffer, offset);
	offset += 1;//skip 0x00 delimiter
	/* read primary message fields */
	for (idx; idx < props_len; idx += 1) {
  	offset += 1;
  	Message[props[idx]] = readField(buffer, offset, length);
  	offset += length;
  	length = getFieldOffset(buffer, offset);
	}
	/* read parameters */
  param_count = buffer.readUInt8(offset);
  Message.params.count = param_count;
  offset += 2;
  for (idx = 0; idx < param_count; idx += 1) {
    for (i = 2; i--;) {
    	length = getFieldOffset(buffer, offset);
    	offset += 1;
      param[i] = readField(buffer, offset, length);
    	offset += length;
    }
    Message.params[param[1]] = param[0];
  }
}
