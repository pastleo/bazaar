import { randomStr, EventHub, EventSwitch } from './utils.js'
import * as peers from './peers.js'

import { ok, reasons } from './connection/base.js';
import PhxWsConnection from './connection/phxWsConnection.js';
import RtcConnection from './connection/rtcConnection.js';

const rtcConnectRequestTerm = 'rtc-connect-request';
const queryPeersRequestTerm = 'query-peers';
const pingTerm = 'ping';

const phxWsRegex = /^phx-(wss?):\/\/(.+)/

let myId = randomStr()
let rtcConfig = {}

export function setRtcConfig(_rtcConfig) {
  rtcConfig = _rtcConfig;
}
export function getMyId() {
  return myId.slice(0, myId.length);
}

export const newConnectionReady = new EventHub(); // .on((peerId, viaPeerId, connection) => {})
export const connectionClosed = new EventHub(); // .on((peerId, reason) => {})

export const sent = new EventSwitch('sent'); // .on(term, (payload, peerId) => {})
export const requested = new EventSwitch('requested'); // .on(term, (payload, peerId) => response)
export const told = new EventSwitch('told'); // .on(term, (from, payload, peerId) => {})

export function getConnection(peerId) {
  const connection = peers.get(peerId).connection;
  if (!connection) {
    throw new Error(`connection not found for ${peerId}`);
  }
  if (connection.closed) {
    throw new Error(`connection to ${peerId} is closed`);
  }
  return connection;
}
export function isConnected(peerId) {
  const connection = peers.get(peerId).connection;
  return connection && !connection.closed;
}
export function getConnectedPeerIds() {
  return peers.allIds().filter(peerId => isConnected(peerId))
}

let log = () => null
export function setDebug(enabled) {
  if (enabled) {
    log = (...args) => console.log(...args);
  } else {
    log = () => null;
  }
}

export function send(peerId, term, payload = {}) {
  log(`send [${term}] => (${peerId}) ::`, payload);
  getConnection(peerId).send(term, payload);
}
export async function request(peerId, term, payload = {}) {
  log(`request [${term}] => (${peerId}) ::`, payload);
  const response = await getConnection(peerId).request(term, payload);
  log(`request completed [${term}] => (${peerId}) ::`, payload, '<<', response);
  return response;
}
export async function tell(peerId, who, term, payload = {}) {
  log(`tell [${term}] => (${who} via ${peerId}) ::`, payload);
  const response = await getConnection(peerId).tell(who, term, payload);
  log(`tell completed [${term}] => (${who} via ${peerId}) ::`, payload, '<<', response);
  return response;
}

function handleEnd(reason, peerId) {
  connectionClosed.emit(peerId, reason);
}
function handleSent(term, payload, peerId) {
  log(`sent [${term}] << (${peerId}) ::`, payload);
  sent.emit(term, payload, peerId);
}
function handleRequested(term, payload, peerId) {
  log(`requested [${term}] << (${peerId}) ::`, payload);
  const response = requested.emit(term, payload, peerId);
  log(`requested [${term}] << (${peerId}) ::`, payload, '>>', response);
  return response;
}
function handleTold(term, from, payload, peerId) {
  log(`told [${term}] << (${from} via ${peerId}) ::`, payload);
  told.emit(term, from, payload, peerId);
}
function handleToldToTell(who, term, payload, peerId) {
  log(`toldToTell [${term}] << (${who} via ${peerId}) ::`, payload);
  let response;
  try {
    getConnection(who).toldToTell(peerId, term, payload);
    response = ok;
  } catch (_e) {
    response = reasons.UNKNOWN_PEER;
  }
  log(`toldToTell [${term}] << (${who} via ${peerId}) ::`, payload, '>>', response);
  return response;
}

function setupConnection(peerId, viaPeerId, connection) {
  peers.set(peerId, { connection });
  connection.onEnd(handleEnd);
  connection.defSent(handleSent);
  connection.defRequested(handleRequested);
  connection.defTold(handleTold);
  connection.onToldToTell(handleToldToTell);
  newConnectionReady.emit(peerId, viaPeerId, connection);
}

export async function connect(peerId, viaPeerId) {
  let newConnection;
  if (isConnected(peerId)) { throw new Error(`already connected to ${peerId}`); }
  if (peerId.match(phxWsRegex)) { // direct connect to a phoenix websocket
    newConnection = new PhxWsConnection(peerId.replace(phxWsRegex, '$1://$2'));
    await newConnection.startLink(peerId, { myId });
  } else { // WebRtc connection
    const connectionVia = getConnection(viaPeerId);
    newConnection = new RtcConnection(rtcConfig, connectionVia);
    await newConnection.startLink(peerId, {
      myId, onOfferCreated: offerOpts => connectionVia.tell(peerId, rtcConnectRequestTerm, offerOpts)
    });
  }
  setupConnection(peerId, viaPeerId, newConnection);
}

let _onNewConnectionRequested = (_newPeerId, _peerId, _offerOpts) => true;
export function onNewConnectionRequested(callback) {
  _onNewConnectionRequested = callback;
}

told.on(rtcConnectRequestTerm, async (newPeerId, offerOpts, peerId) => {
  if (
    !isConnected(peerId) ||
    !_onNewConnectionRequested(newPeerId, peerId, offerOpts)
  ) return;
  const rtcConn = new RtcConnection(rtcConfig, getConnection(peerId));
  await rtcConn.startLink(newPeerId, offerOpts);
  setupConnection(newPeerId, peerId, rtcConn);
});

export function close(peerId) {
  getConnection(peerId).close();
}

export function broadcast(term, payload) {
  getConnectedPeerIds().forEach(peerId => {
    try {
      send(peerId, term, payload);
    } finally {}
  });
}

export async function queryPeers(peerId, params = {}) {
  return (await request(peerId, queryPeersRequestTerm, params)).peers;
}

let _onPeerQueried = (_peers, _params) => _peers;
export function onPeerQueried(callback) {
  _onPeerQueried = callback;
}

requested.on(queryPeersRequestTerm, params => {
  return { peers: _onPeerQueried(peers.allIds(), params) }
});

export async function ping(peerId) {
  const timeStarted = Date.now();
  await request(peerId, pingTerm);
  return Date.now() - timeStarted;
}

requested.on(pingTerm, () => ({}));
