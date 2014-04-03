
var Writable = new require('stream').Writable,
util = require('util'),
list = [],
props = ['id', 'action', 'type'],
props_len = props.length,
sep = '~',
_sortList = function (a, b) {
  var score = 0;
  if (a.type > b.type) {
    score += 100;
  } else if (a.type < b.type) {
    score -= 100;
  }
  if (a.action > b.action) {
    score += 10;
  } else if (a.action < b.action) {
    score -= 10;
  }
  if (a.id > b.id) {
    score += 1;
  } else if (a.id < b.id) {
    score -= 1;
  }
  return score;
},
_find = function (ref) {
  var indexes = [],
    compare = [],
    compare_len = 0,
    threshold = 0,
    matches = 0,
    i = this.length,
    streak = false,
    field = null,
    s = null;
  /* Determine query field */
  for (j = props_len; j--;) {
    field = props[j];
    if (ref[field] !== '') {
      compare.push(field);
      threshold += 1;
    }
  }
  compare_len = compare.length;
  for (; i--;) {
    s = this[i];
    matches = 0;
    for (j = compare_len; j-- ;) {
      field = compare[j];
      if (s[field] !== '' && s[field] === ref[field]) {
        matches += 1;
      } 
    }
    /* if we had enough matching fields push index to list */
    if (matches === threshold) {
      streak = true;
      indexes.push(i);
    }
      /* if our matching streak stopped -- break, otherwise continue looking for match*/
/*      if (!streak) {*/
/*      } else {
        break;
      }*/
  }
  return indexes
},
_getMatchList = function (msg) {
  var indexes = [],
    compare = props.slice(0,1),
    s = null,
    matches = 0,
    streak = false,    
    i = this.length,
    j = 0,
    range = [0,0],
    sublist = [],
    field = null;
  /* find range of equal types */
  for (; i--;) {
    s = this[i];
    if (s.type === msg.type) {
      break
    }
  }
  range[0] = i + 1;
  /* continue with same 'i' */
  if (i > -1) {
    for (; i--;) {
      s = this[i];
      if (s.type !== msg.type) {
        break;
      }
    }
  }
  range[1] = i + 1;
  for (i = range[0]; range[1] - i--;) {
    s = this[i];
    if ((s.action === '' || s.action === msg.action)
      && (s.id === '' || s.id === msg.id)) {
      indexes.push(i);
    }
  }
  return indexes
},
_subscribe = function (msg, fn) {
  var indexes = [],
    idx,
    i;
  /* fill undefined properties with empty strig */
  msg.type = typeof msg.type === 'undefined' ? '' : '' + msg.type;
  msg.action = typeof msg.action === 'undefined' ? '' : '' + msg.action;
  msg.id = typeof msg.id === 'undefined' ? '' : '' + msg.id;
  indexes = _find.call(list, msg);
  if (indexes.length) {
    for (i = indexes.length; i--;) {
      idx = indexes[i];
      list[idx].callbacks.push(fn);    
    }
  } else {
    msg.callbacks = [fn];
    list.push(msg);
  }
},
_unsubscribe = function () {

},
_write = function (msg, enc, next) {
  var indexes = _getMatchList.call(list, msg),
    idx_len = indexes.length,
    msg_index,
    i;
  for (i = idx_len; i--;) {
    msg_index = indexes[i];
    (function (array) {
      var i = array.length;
      for (; i--; ) {
        array[i].call(msg);
      }
    }) (list[msg_index].callbacks)
  }
  next();
},
_init = function () {
  var t1 = new Date();
  list.sort(_sortList);
  console.log((new Date()) - t1);
  console.log('Subscribers:', list.length);
};

util.inherits(Conveyor, Writable);

function Conveyor (options) {
  _init();
  if (!(this instanceof Conveyor))
    return new Conveyor(options);
  
  Writable.call(this, options)
  this._writableState.objectMode = true;
}
Conveyor.prototype.onmsg = _subscribe;
Conveyor.prototype._write = _write;
module.exports = Conveyor;
