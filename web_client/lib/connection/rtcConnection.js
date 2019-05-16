import Connection, { reasons } from './base.js'
import { EventSwitch, randomStr } from '../utils.js'

const rtcConnectionReadyStates = ['connected', 'completed'];

class RtcConnection extends Connection {
  constructor(rtcConfig, connectionVia) {
    super();
    this.connectionVia = connectionVia;
    this.rtcConnection = new RTCPeerConnection(rtcConfig);
    this._requestings = {};
    this._waitingForStartLinkResolves = [];
  }

  startLink(peerId, connectRequestOpt) {
    const { offer, onOfferCreated, connectionId, timeout } = connectRequestOpt || {};
    this.connectionId = connectionId || randomStr();
    this.peerId = peerId;

    return new Promise((resolve, reject) => {
      this.connectionVia.onTold(`ice:${this.connectionId}`, (from, { ice }) => {
        if (this.peerId === from) {
          this.rtcConnection.addIceCandidate(JSON.parse(ice));
        }
      });

      this.rtcConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          this.connectionVia.tell(this.peerId, `ice:${this.connectionId}`, {
            ice: JSON.stringify(candidate),
          }).catch(e => this._rtcEstConnErr(e, reject));
        }
      };

      this.rtcConnection.oniceconnectionstatechange = () => {
        if (!this._rtcConnMightBeReady(resolve) &&
          this.rtcConnection.iceConnectionState === "failed" ||
          this.rtcConnection.iceConnectionState === "disconnected" ||
          this.rtcConnection.iceConnectionState === "closed"
        ) {
          if (this.connected) {
            this._closeRtcConn(reasons.ERROR);
          } else {
            this._rtcEstConnErr(reasons.ERROR, reject);
          }
        }
      };

      setTimeout(() => {
        if (!this.connected) {
          this._rtcEstConnErr(reasons.TIMEOUT, reject);
        }
      }, timeout || 10000);

      if (offer) { // accepting offer, being connected
        this.rtcConnection.ondatachannel = ({ channel }) => this._setupChannels(channel, resolve);

        this._accepting_offer_flow(offer).catch(e => this._rtcEstConnErr(e, reject));

      } else { // creating offer, connecting to others

        this._setupChannels(this.rtcConnection.createDataChannel('send'), resolve);
        this._setupChannels(this.rtcConnection.createDataChannel('request'), resolve);
        this._setupChannels(this.rtcConnection.createDataChannel('tell'), resolve);
        this._setupChannels(this.rtcConnection.createDataChannel('told'), resolve);
        this._setupChannels(this.rtcConnection.createDataChannel('response'), resolve);

        this.connectionVia.onTold(`answer:${this.connectionId}`, (from, { answer }) => {
          if (this.peerId === from) {
            this.rtcConnection.setRemoteDescription(JSON.parse(answer));
          }
        });

        this._creating_offer_flow(onOfferCreated).catch(e => this._rtcEstConnErr(e, reject));
      }
    });
  }

  async _creating_offer_flow(onOfferCreated) {
    const createdOffer = await this.rtcConnection.createOffer();
    await this.rtcConnection.setLocalDescription(createdOffer);
    const offer = JSON.stringify(this.rtcConnection.localDescription);

    onOfferCreated({ offer, connectionId: this.connectionId });
  }

  async _accepting_offer_flow(offer) {
    await this.rtcConnection.setRemoteDescription(JSON.parse(offer));
    const createdAnswer = await this.rtcConnection.createAnswer();
    await this.rtcConnection.setLocalDescription(createdAnswer);
    const answer = JSON.stringify(this.rtcConnection.localDescription);

    await this.connectionVia.tell(this.peerId, `answer:${this.connectionId}`, { answer });
  }

  _setupChannels(channel, startLinkResolve) {
    channel.onopen = () => {
      switch (channel.label) {
        case 'send':
          this.rtcSendChannel = channel;
          this.rtcSendChannel.onmessage = ({ data }) => this._onSendChannelMessage(data);
          break;
        case 'request':
          this.rtcRequestChannel = channel;
          this.rtcRequestChannel.onmessage = ({ data }) => this._onRequestChannelMessage(data);
          break;
        case 'tell':
          this.rtcTellChannel = channel;
          this.rtcTellChannel.onmessage = ({ data }) => this._onTellChannelMessage(data);
          break;
        case 'told':
          this.rtcToldChannel = channel;
          this.rtcToldChannel.onmessage = ({ data }) => this._onToldChannelMessage(data);
          break;
        case 'response':
          this.rtcResponseChannel = channel;
          this.rtcResponseChannel.onmessage = ({ data }) => this._onResponseChannelMessage(data);
          break;
      }
      this._rtcConnMightBeReady(startLinkResolve);
    };
    channel.onclose = () => this._closeRtcConn(this._closing ? reasons.DISCONNECT : reasons.PEER_DISCONNECT);
  }

  _rtcConnMightBeReady(startLinkResolve) {
    if (
      !this.connected && !this.closed && rtcConnectionReadyStates.indexOf(this.rtcConnection.iceConnectionState) !== -1 &&
      this.rtcSendChannel && this.rtcRequestChannel && this.rtcTellChannel && this.rtcToldChannel && this.rtcResponseChannel
    ) {
      this.connected = true;
      startLinkResolve();
      setTimeout(() => this._waitingForStartLinkResolves.forEach(r => r()));
      return true;
    } else {
      return false;
    }
  }

  _rtcEstConnErr(reason, startLinkReject) {
    if (!this.closed) {
      this.closed = true;
      this.rtcConnection.close();
      startLinkReject(reason);
    }
  }

  close(timeout = 5000) {
    this._closing = true;
    this.rtcSendChannel.close();
    this.rtcRequestChannel.close();
    this.rtcTellChannel.close();
    this.rtcToldChannel.close();
    this.rtcResponseChannel.close();
    setTimeout(() => this._closeRtcConn(reasons.DISCONNECT), timeout);
  }

  _closeRtcConn(reason) {
    if (!this.closed) {
      this.closed = true;
      this.rtcConnection.close();
      this._onEnd(reason, this.peerId);
    }
  }

  async _onSendChannelMessage(data) {
    if (!this.connected) { await new Promise(r => this._waitingForStartLinkResolves.push(r)); }
    const { term, payload } = JSON.parse(data);
    this._onSents.emit(term, payload, this.peerId);
  }
  async _onRequestChannelMessage(data) {
    if (!this.connected) { await new Promise(r => this._waitingForStartLinkResolves.push(r)); }
    const { id, term, payload } = JSON.parse(data);
    this._sendResponse(id, () => this._onRequesteds.emit(term, payload, this.peerId));
  }
  async _onTellChannelMessage(data) {
    if (!this.connected) { await new Promise(r => this._waitingForStartLinkResolves.push(r)); }
    const { id, who, term, payload } = JSON.parse(data);
    this._sendResponse(id, () => this._onToldToTell(who, term, payload, this.peerId));
  }
  async _onToldChannelMessage(data) {
    if (!this.connected) { await new Promise(r => this._waitingForStartLinkResolves.push(r)); }
    const { from, term, payload } = JSON.parse(data);
    this._onTolds.emit(term, from, payload, this.peerId);
  }
  async _onResponseChannelMessage(data) {
    if (!this.connected) { await new Promise(r => this._waitingForStartLinkResolves.push(r)); }
    const { id, response, err } = JSON.parse(data);
    if (this._requestings[id]) {
      const [ resolve, reject ] = this._requestings[id];
      if (err) { reject(err); }
      else { resolve(response); }
      delete this._requestings[id];
    }
  }

  _sendResponse(id, getResponseFunc) {
    try {
      const response = getResponseFunc();
      if (!response) throw reasons.UNHANDLED;
      this.rtcResponseChannel.send(JSON.stringify({ id, response }));
    } catch (e) {
      this.rtcResponseChannel.send(JSON.stringify({ id, err: e.toString() }));
    }
  }

  send(term, payload = {}) {
    this.rtcSendChannel.send(JSON.stringify({ term, payload }));
  }

  request(term, payload = {}, timeout = 5000) {
    return this._genRequestPromise(
      timeout,
      id => this.rtcRequestChannel.send(JSON.stringify({ id, term, payload }))
    )
  }

  tell(who, term, payload = {}, timeout = 5000) {
    return this._genRequestPromise(
      timeout,
      id => this.rtcTellChannel.send(JSON.stringify({ id, who, term, payload }))
    )
  }

  _genRequestPromise(timeout, sendFunc) {
    return new Promise((resolve, reject) => {
      const id = randomStr();
      setTimeout(() => reject(reasons.TIMEOUT), timeout);
      this._requestings[id] = [ resolve, reject ];
      sendFunc(id);
    });
  }

  toldToTell(from, term, payload = {}) {
    this.rtcToldChannel.send(JSON.stringify({ from, term, payload }));
  }
}

export default RtcConnection;
