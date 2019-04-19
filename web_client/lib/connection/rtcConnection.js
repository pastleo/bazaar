import Connection, { reasons } from './base.js'
import { EventSwitch, randomStr } from '../utils.js'

//function process

class RtcConnection extends Connection {
  constructor(rtcConfig, connectionVia) {
    super();
    this.connectionVia = connectionVia;
    this.rtcConnection = new RTCPeerConnection(rtcConfig);
    this._requestings = {};
  }

  startLink(peerName, connectRequestOpt) {
    const { offer, onOfferCreated, connectionId, timeout } = connectRequestOpt || {};
    this.connectionId = connectionId || randomStr();
    this.peerName = peerName;

    return new Promise((resolve, reject) => {
      this.connectionVia.onTold(`ice:${this.connectionId}`, (from, { ice }) => {
        if (this.peerName === from) {
          this.rtcConnection.addIceCandidate(JSON.parse(ice));
        }
      });

      this.rtcConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          this.connectionVia.tell(this.peerName, `ice:${this.connectionId}`, {
            ice: JSON.stringify(candidate),
          }).catch(e => this._rtcEstConnErr(e, reject));
        }
      };

      this.rtcConnection.oniceconnectionstatechange = () => {
        if (!this.connected && !this.closed && this.rtcConnection.iceConnectionState === 'connected') {
          this.connected = true;
          resolve();
        } else if (
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
        this.rtcConnection.ondatachannel = ({ channel }) => this._setupChannels(channel);

        this._accepting_offer_flow(offer).catch(e => this._rtcEstConnErr(e, reject));

      } else { // creating offer, connecting to others

        this._setupChannels(this.rtcConnection.createDataChannel('send'));
        this._setupChannels(this.rtcConnection.createDataChannel('request'));
        this._setupChannels(this.rtcConnection.createDataChannel('tell'));
        this._setupChannels(this.rtcConnection.createDataChannel('told'));
        this._setupChannels(this.rtcConnection.createDataChannel('response'));

        this.connectionVia.onTold(`answer:${this.connectionId}`, (from, { answer }) => {
          if (this.peerName === from) {
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

    await this.connectionVia.tell(this.peerName, `answer:${this.connectionId}`, { answer });
  }

  _setupChannels(channel) {
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
    channel.onclose = () => this._closeRtcConn(this._closing ? reasons.DISCONNECT : reasons.PEER_DISCONNECT);
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
      this._onEnd(reason, this.peerName);
    }
  }

  _onSendChannelMessage(data) {
    const { term, payload } = JSON.parse(data);
    this._onSents.emit(term, payload, this.peerName);
  }
  _onRequestChannelMessage(data) {
    const { id, term, payload } = JSON.parse(data);
    this._sendResponse(id, () => this._onRequesteds.emit(term, payload, this.peerName));
  }
  _onTellChannelMessage(data) {
    const { id, who, term, payload } = JSON.parse(data);
    this._sendResponse(id, () => this._onToldToTell(who, term, payload, this.peerName));
  }
  _onToldChannelMessage(data) {
    const { from, term, payload } = JSON.parse(data);
    this._onTolds.emit(term, from, payload, this.peerName);
  }
  _onResponseChannelMessage(data) {
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
