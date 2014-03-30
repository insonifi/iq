
var callbacks = [],
cb_length = 0,
Writable = new require('stream').Writable,
util = require('util'),
_subscribe = function (msg, fn) {
  msg.fn = fn;
  callbacks.push(msg);
  cb_length = callbacks.length;
},
_unsubscribe = function () {

},
_write = function (msg, enc, next) {
  (function () {
    var i = cb_length,
      item;
    for (; --i;) {
      item = callbacks[i];
      if (
        msg.type == item.type ||
        msg.action == item.action ||
        msg.id == item.id
      ) {
        item.fn(msg);
      }
    }
  })();
  next();
};

util.inherits(Conveyor, Writable);

function Conveyor (options) {
  if (!(this instanceof Conveyor))
    return new Conveyor(options);
  
  Writable.call(this, options)
  this._writableState.objectMode = true;
}
Conveyor.prototype.on = _subscribe;
Conveyor.prototype._write = _write;
module.exports = Conveyor;
