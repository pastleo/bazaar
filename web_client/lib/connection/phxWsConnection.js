import { Socket } from 'https://unpkg.com/phoenix@1.4.3/assets/js/phoenix.js?module';
import Connection, { ok, reasons } from './base.js'

class PhxWsConnection extends Connection {
  constructor(url, socketParams = {}) {
    super();
    this.socket = new Socket(url, socketParams);
  }

  startLink(peerId, { myId, channelParams, retry }) {
    this.peerId = peerId;
    this.retry = retry || 10;
    return new Promise((resolve, reject) => {
      this.socket.onError(() => this._phxConnErr(reject));
      this.socket.connect();
      this.channel = this.socket.channel(`peer:${myId}`, {params: channelParams || {}});
      this.channel.on("send", ({ term, payload }) => this._onSents.emit(term, payload, this.peerId));
      this.channel.on("request", ({ id, term, payload }) => {
        this.channel.push("response", {
          id, payload: _response(() => this._onRequesteds.emit(term, payload, this.peerId))
        });
      });
      this.channel.on("tell", ({ id, who, term, payload }) => {
        this.channel.push("response", {
          id, payload: _response(() => this._onToldToTell(who, term, payload, this.peerId))
        });
      });
      this.channel.on("told", ({ from, term, payload }) => this._onTolds.emit(term, from, payload, this.peerId));
      this.channel.onClose(() => this._closePhxConn(reasons.PEER_DISCONNECT));
      this.channel.onError(() => this._phxConnErr(reject));
      this.channel.join().receive("ok", () => {
        this.connected = true;
        resolve()
      });
    });
  }

  close() {
    this._closePhxConn(reasons.DISCONNECT);
  }

  _closePhxConn(reason) {
    if (!this.closed) {
      this.closed = true;
      this.socket.disconnect();
      this._onEnd(reason, this.peerId);
    }
  }
  _phxConnErr(startLinkReject) {
    if (!this.closed) {
      this.channelErrorCnt = (this.channelErrorCnt || 0) + 1;
      if (this.channelErrorCnt >= this.retry) {
        if (this.connected) {
          this._closePhxConn(reasons.ERROR);
        } else {
          startLinkReject(reasons.ERROR);
        }
      }
    }
  }
  _response(getResponseFunc) {
    try {
      const response = getResponseFunc();
      if (!response) throw reasons.UNHANDLED;
      return response;
    } catch (e) {
      return e.toString();
    }
  }

  send(term, payload = {}) {
    this.channel.push("send", { term, payload })
  }

  request(term, payload = {}) {
    return new Promise((resolve, reject) => {
      this.channel.push("request", { term, payload })
        .receive("ok", ({ payload: response_payload }) => {
          resolve(response_payload);
        })
        .receive("err", ({ reason }) => reject(reason));
    });
  }

  tell(who, term, payload = {}) {
    return new Promise((resolve, reject) => {
      this.channel.push("tell", { who, term, payload })
        .receive("ok", () => resolve(ok))
        .receive("err", ({ reason }) => reject(reason));
    });
  }

  toldToTell(from, term, payload = {}) {
    this.channel.push("told", { from, term, payload });
  }
}

export default PhxWsConnection;
