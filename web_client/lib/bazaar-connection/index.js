import * as debug from './debug.js';
import { iceServers } from './config.js';
import './types.js';

/**
 * @type {Options} defaultOptions
 *
 * @typedef {Object} Options
 * @property {WebSocket} websocket
 */
 const defaultOptions = {
  websocket: null,
};

export default class BazaarConnection {
  /**
   * @param {Options} options
   */
  constructor(options = defaultOptions) {
    const { websocket } = options;

    this.id = null;

    /**
     * @type {Map<string, RTCPeerConnection>}
     */
    this.peerConnections = new Map();
    /**
     * @type {Map<string, RTCDataChannel}
     */
    this.peerChannels = new Map();

    /**
     * @type {eventCallback[]}
     */
    this.messageEventListeners = [];
    /**
     * @type {eventCallback[]}
     */
    this.openEventListeners = [];

    /**
     * @type {Map<string, typeCallback>}
     *
     * @typedef {object} typeCallback
     * @property {string} type
     * @property {callback} callback
     */
    this.websocketMessageEvents = new Map();

    this.websocket = websocket;

    this.registerBazaarWebsocketMessageEvent('initial-information', action => {
      this.id = action.payload.id;

      action.payload.peers.forEach(peerId => this.connect(peerId));
    });

    this.setupBazaarWebSocketEventListeners();
    this.handleReceivePeerOffer();
  }

  /**
   * @param {object|string} message
   */
  broadcast(message) {
    for (let peerId of this.peerChannels.keys()) {
      this.emit(peerId, message);
    }
  }

  /**
   * @param {string} peerId
   * @param {object} message
   */
  emit(peerId, message) {
    const peerChannel = this.peerChannels.get(peerId);

    peerChannel.send(JSON.stringify(message));
  }

  /**
   *
   * @param {EventType} eventType
   * @param {eventCallback} callback
   *
   * @callback eventCallback
   * @param {string} peerId
   * @param {action} action
   */
  on(eventType, callback) {
    switch (eventType) {
      case 'message':
        return this.messageEventListeners.push(callback);
      case 'open':
        return this.openEventListeners.push(callback);
      default:
        return debug.connection(`Unhandle event type '${eventType}'`);
    }
  }

  /**
   * @param {string} peerId
   * @todo @return RTCPeerConnection
   */
  async connect(peerId) {
    const newRTCPeerConnection = this.createRTCPeerConnection(peerId);

    const newPeerChannel = newRTCPeerConnection.createDataChannel(
      `${this.id} -> ${peerId}`
    );

    this.handlePeerChannelEvent(peerId, newPeerChannel);

    const offer = await newRTCPeerConnection.createOffer();
    await newRTCPeerConnection.setLocalDescription(offer);

    const answer = await this.provideOffer(peerId, offer);
    newRTCPeerConnection.setRemoteDescription(answer);

    this.peerConnections.set(peerId, newRTCPeerConnection);
    this.peerChannels.set(peerId, newPeerChannel);
  }


  /**
   * @param {string} peerId
   */
  createRTCPeerConnection(peerId) {
    const rtcPeerConnection = new RTCPeerConnection({ iceServers });

    rtcPeerConnection.addEventListener('icecandidate', event => {
      this.websocket.send(JSON.stringify({
        type: 'peer-rtc-candidate',
        from: this.id,
        to: peerId,
        payload: { candidate: event.candidate },
      }));
    });

    this.registerBazaarWebsocketMessageEvent('peer-rtc-candidate', action => {
      if (action.from === peerId && action.payload.candidate) {
        rtcPeerConnection.addIceCandidate(action.payload.candidate);
      }
    });

    return rtcPeerConnection;
  }

  /**
   * @param {string} peerId
   * @param {object} offer
   */
  async provideOffer(peerId, offer) {
    this.websocket.send(JSON.stringify({
      type: 'peer-rtc-offer',
      from: this.id,
      to: peerId,
      payload: { offer },
    }));

    const answer = await new Promise(resolve => {
      const unregister = this.registerBazaarWebsocketMessageEvent(
        'peer-rtc-answer',
        action => {
          if (action.from === peerId) {
            resolve(action.payload.answer);
            unregister();
          }
        },
      );
    });

    return answer;
  }

  handleReceivePeerOffer() {
    this.registerBazaarWebsocketMessageEvent('peer-rtc-offer', async action => {
      const { from, payload } = action;

      const newRTCPeerConnection = this.createRTCPeerConnection(from);

      newRTCPeerConnection.setRemoteDescription(payload.offer);
      const answer = await newRTCPeerConnection.createAnswer();

      newRTCPeerConnection.setLocalDescription(answer);
      this.websocket.send(JSON.stringify({
        type: 'peer-rtc-answer',
        from: this.id,
        to: from,
        payload: { answer },
      }));

      newRTCPeerConnection.addEventListener('datachannel', event => {
        this.peerChannels.set(from, event.channel);

        this.handlePeerChannelEvent(from, event.channel);
      });

      this.peerConnections.set(from, newRTCPeerConnection);
    });
  }

  /**
   *
   * @param {string} type
   * @param {actionCallback} callback
   *
   * @callback actionCallback
   * @param {action} action
   */
  registerBazaarWebsocketMessageEvent(type, callback) {
    const eventId = Date.now();

    this.websocketMessageEvents.set(eventId, {
      type,
      callback,
    });

    return () => {
      this.websocketMessageEvents.delete(eventId);
    };
  }

  async setupBazaarWebSocketEventListeners() {
    this.websocket.addEventListener('message', event => {
      /**
       * @type {action}
       */
      const action = JSON.parse(event.data);
      this.websocketMessageEvents.forEach(({ type, callback }) => {
        if (type === action.type) {
          debug.websocket('message', action);
          callback(action);
        }
      });
    })
  }

  /**
   * @param {RTCDataChannel} channel
   */
  handlePeerChannelEvent(peerId, channel) {
    channel.addEventListener('message', event => {
      this.messageEventListeners.forEach(
        listeners => listeners(peerId, JSON.parse(event.data))
      );
    });

    channel.addEventListener('open', event => {
      this.openEventListeners.forEach(
        listeners => listeners(peerId)
      );
    });

    channel.addEventListener('close', event => {
      // @todo
    });
  }
}
