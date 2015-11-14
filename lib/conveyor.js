/* global require, module, process, console */
/* jshint -W097 */
/* jshint esnext: true */
'use strict';
const SEP = '\t';
function mutantToString(mutant) {
  return mutant[0] + SEP + mutant[1] + SEP + mutant[2];
}
function messageToString(msg) {
  return (msg.type || '') + SEP + (msg.action || '') + SEP + (msg.id || '');
}
function iter(array, fn) {
  let i = array.length;
  for (;i--;) {
    fn.call(array[i]);
  }
}

class Conveyor {
  constructor() {
    this.subs = new Map();
  }
  subscribe(m, fn) {
    const key = messageToString(m);
    const subs = this.subs;
    if (subs.has(key)) {
      subs.set(subs.get(key).push(fn));
    } else {
      subs.set(key, [fn]);
    }
  }
  unsubscribe(m) {
    const key = messageToString(m);
    this.subs.delete(key);
  }
  handle(msg) {
    let callbacks = this.getMatchList(msg);
    iter(callbacks, function () {
      this(msg);
    });
  }
  getMatchList(msg) {
    const candidates = this.mutate(msg);
    const subs = this.subs;
    let result = [];
    iter(candidates, function () {
      if (subs.has(this)) {
        result = result.concat(subs.get(this));
      }
    });
    return result;
  }
  mutate(m) {
    const LEN = 3;
    let vals = [m.type, m.action, m.id];
    let mutant = [];
    let mutations = new Set();
    let j = 0;
    let i = 0;

    mutations.add(mutantToString(vals));
    for (j = 0 ; j < LEN; j += 1) {
      mutant = cloneArray(vals);
      for (i = j; i < LEN; i += 1) {
        mutant[i] = '';
        mutations.add(mutantToString(mutant));
      }
      for (i = 0; i < j - 1; i += 1) {
        mutant[i] = '';
        mutations.add(mutantToString(mutant));
      }
    }
    return Array.from(mutations);
  }
}

function cloneArray(array) {
  const LEN = 3;
  let clone = new Array(LEN);
  for (let i = 0; i < LEN; i += 1) {
    clone[i] = array[i];
  }
  return clone;
}


module.exports = Conveyor;
