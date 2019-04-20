import { EventSwitch } from '../utils.js'

class Connection {
  constructor() {
    this.closed = false;
    this._onEnd = () => null;
    this._onSents = new EventSwitch('onSents');
    this._onRequesteds = new EventSwitch('onRequesteds');
    this._onTolds = new EventSwitch('onTolds');
    this._onToldToTell = () => null;
  }

  async startLink(peerName) {
    throw new Error("startLink(peerName) not implemented");
  }
  close() {
    throw new Error("close() not implemented");
  }

  onEnd(callback) { // callback: (reason, peerName)
    this._onEnd = callback;
  }

  send(term, payload = {}) {
    throw new Error("send(term, payload) not implemented");
  }
  onSent(term, callback) { // callback: (payload, peerName)
    this._onSents.on(term, callback);
  }
  defSent(callback) { // callback: (term, payload, peerName)
    this._onSents.def(callback);
  }
  offSent(term) {
    this._onSents.off(term);
  }

  async request(term, payload = {}) { // => resolve(response) | reject('TIMEOUT') | reject('UNHANDLED')
    throw new Error("request(term, payload) not implemented");
  }
  onRequested(term, callback) { // callback: (payload, peerName) => response
    this._onRequesteds.on(term, callback);
  }
  defRequested(callback) { // callback: (term, payload, peerName) => response | throw 'UNHANDLED'
    this._onRequesteds.def(callback);
  }
  offRequesteds(term) {
    this._onRequesteds.off(term);
  }

  async tell(who, term, payload = {}) { // => resolve('ok') | reject('UNKNOWN_PEER') | reject('TIMEOUT') | reject('UNHANDLED')
    throw new Error("tell(who, term, payload) not implemented");
  }
  onTold(term, callback) { // callback: (from, payload, peerName)
    this._onTolds.on(term, callback);
  }
  defTold(callback) { // callback: (term, from, payload, peerName)
    this._onTolds.def(callback);
  }
  offTold(term) {
    this._onTolds.off(term);
  }

  onToldToTell(callback) { // callback: (who, term, payload, peerName) => 'ok' | throw 'UNKNOWN_PEER' | throw 'UNHANDLED'
    this._onToldToTell = callback
  }
  toldToTell(from, term, payload = {}) {
    throw new Error("toldToTell(from, term, payload) not implemented");
  }
}

export const ok = 'ok';
export const reasons = {
  ERROR: 'ERROR',
  DISCONNECT: 'DISCONNECT',
  PEER_DISCONNECT: 'PEER_DISCONNECT',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_PEER: 'UNKNOWN_PEER',
  UNHANDLED: 'UNHANDLED',
};

export default Connection;
