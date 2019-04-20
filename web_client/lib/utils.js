
export class EventSwitch {
  constructor(name, def) {
    this.name = name;
    this._ons = {};
    this._def = def || false;
  }

  def(callback) {
    this._def = callback
  }
  on(term, callback) {
    this._ons[term] = callback;
  }
  off(term) {
    delete this._ons[term];
  }
  emit(term, ...args) {
    if (this._ons[term]) {
      return this._ons[term](...args);
    } else if (this._def) {
      return this._def(term, ...args);
    } else {
      console.warn(`EventSwitch [${this.name}]: term '${term}' is not listened, args:`, args);
    }
  }

  has(term) {
    return this._ons.hasOwnProperty(term);
  }
}

export class EventHub {
  constructor() {
    this._ons = {};
  }

  do(callback) {
    this._ons[callback.toString()] = callback;
  }
  dont(callback) {
    delete this._ons[callback.toString()];
  }
  emit(...args) {
    Object.keys(this._ons).forEach(t => this._ons[t](...args));
  }
}

export const randomStr = () => Math.floor(Math.random() * Date.now()).toString(36);

