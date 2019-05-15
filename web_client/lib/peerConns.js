import { randomStr, EventHub, EventSwitch } from './utils.js'
import * as peers from './peers.js'

import { ok, reasons } from './connection/base.js';
import PhxWsConnection from './connection/phxWsConnection.js';
import RtcConnection from './connection/rtcConnection.js';

const rtcConnectRequestTerm = 'rtc-connect-request';
const queryPeersRequestTerm = 'query-peers';
const pingTerm = 'ping';

const phxWsRegex = /^phx-(wss?):\/\/(.+)/

let myName = randomStr()
let rtcConfig = {}

export function setRtcConfig(_rtcConfig) {
  rtcConfig = _rtcConfig;
}
export function getMyName() {
  return myName.slice(0, myName.length);
}

export const newConnectionReady = new EventHub(); // .on((peerName, viaPeerName, connection) => {})
export const connectionClosed = new EventHub(); // .on((peerName, reason) => {})

export const sent = new EventSwitch('sent'); // .on(term, (payload, peerName) => {})
export const requested = new EventSwitch('requested'); // .on(term, (payload, peerName) => response)
export const told = new EventSwitch('told'); // .on(term, (from, payload, peerName) => {})

export function getConnection(peerName) {
  const connection = peers.get(peerName).connection;
  if (!connection) {
    throw new Error(`connection not found for ${peerName}`);
  }
  if (connection.closed) {
    throw new Error(`connection to ${peerName} is closed`);
  }
  return connection;
}
export function isConnected(peerName) {
  const connection = peers.get(peerName).connection;
  return connection && !connection.closed;
}
export function getConnectedPeerNames() {
  return peers.allNames().filter(peerName => isConnected(peerName))
}

let log = () => null
export function setDebug(enabled) {
  if (enabled) {
    log = (...args) => console.log(...args);
  } else {
    log = () => null;
  }
}

export function send(peerName, term, payload = {}) {
  log(`send [${term}] => (${peerName}) ::`, payload);
  getConnection(peerName).send(term, payload);
}
export async function request(peerName, term, payload = {}) {
  log(`request [${term}] => (${peerName}) ::`, payload);
  const response = await getConnection(peerName).request(term, payload);
  log(`request completed [${term}] => (${peerName}) ::`, payload, '<<', response);
  return response;
}
export async function tell(peerName, who, term, payload = {}) {
  log(`tell [${term}] => (${who} via ${peerName}) ::`, payload);
  const response = await getConnection(peerName).tell(who, term, payload);
  log(`tell completed [${term}] => (${who} via ${peerName}) ::`, payload, '<<', response);
  return response;
}

function handleEnd(reason, peerName) {
  connectionClosed.emit(peerName, reason);
}
function handleSent(term, payload, peerName) {
  log(`sent [${term}] << (${peerName}) ::`, payload);
  sent.emit(term, payload, peerName);
}
function handleRequested(term, payload, peerName) {
  log(`requested [${term}] << (${peerName}) ::`, payload);
  const response = requested.emit(term, payload, peerName);
  log(`requested [${term}] << (${peerName}) ::`, payload, '>>', response);
  return response;
}
function handleTold(term, from, payload, peerName) {
  log(`told [${term}] << (${from} via ${peerName}) ::`, payload);
  told.emit(term, from, payload, peerName);
}
function handleToldToTell(who, term, payload, peerName) {
  log(`toldToTell [${term}] << (${who} via ${peerName}) ::`, payload);
  let response;
  try {
    getConnection(who).toldToTell(peerName, term, payload);
    response = ok;
  } catch (_e) {
    response = reasons.UNKNOWN_PEER;
  }
  log(`toldToTell [${term}] << (${who} via ${peerName}) ::`, payload, '>>', response);
  return response;
}

function setupConnection(peerName, viaPeerName, connection) {
  peers.set(peerName, { connection });
  connection.onEnd(handleEnd);
  connection.defSent(handleSent);
  connection.defRequested(handleRequested);
  connection.defTold(handleTold);
  connection.onToldToTell(handleToldToTell);
  newConnectionReady.emit(peerName, viaPeerName, connection);
}

export async function connect(peerName, viaPeerName) {
  let newConnection;
  if (isConnected(peerName)) { throw new Error(`already connected to ${peerName}`); }
  if (peerName.match(phxWsRegex)) { // direct connect to a phoenix websocket
    newConnection = new PhxWsConnection(peerName.replace(phxWsRegex, '$1://$2'));
    await newConnection.startLink(peerName, { myName });
  } else { // WebRtc connection
    const connectionVia = getConnection(viaPeerName);
    newConnection = new RtcConnection(rtcConfig, connectionVia);
    await newConnection.startLink(peerName, {
      myName, onOfferCreated: offerOpts => connectionVia.tell(peerName, rtcConnectRequestTerm, offerOpts)
    });
  }
  setupConnection(peerName, viaPeerName, newConnection);
}

let _onNewConnectionRequested = (_newPeerName, _peerName, _offerOpts) => true;
export function onNewConnectionRequested(callback) {
  _onNewConnectionRequested = callback;
}

told.on(rtcConnectRequestTerm, async (newPeerName, offerOpts, peerName) => {
  if (
    !isConnected(peerName) ||
    !_onNewConnectionRequested(newPeerName, peerName, offerOpts)
  ) return;
  const rtcConn = new RtcConnection(rtcConfig, getConnection(peerName));
  await rtcConn.startLink(newPeerName, offerOpts);
  setupConnection(newPeerName, peerName, rtcConn);
});

export function close(peerName) {
  getConnection(peerName).close();
}

export function broadcast(term, payload) {
  getConnectedPeerNames().forEach(peerName => {
    try {
      send(peerName, term, payload);
    } finally {}
  });
}

export async function queryPeers(peerName, params = {}) {
  return (await request(peerName, queryPeersRequestTerm, params)).peers;
}

let _onPeerQueried = (_peers, _params) => _peers;
export function onPeerQueried(callback) {
  _onPeerQueried = callback;
}

requested.on(queryPeersRequestTerm, params => {
  return { peers: _onPeerQueried(peers.allNames(), params) }
});

export async function ping(peerName) {
  const timeStarted = Date.now();
  await request(peerName, pingTerm);
  return Date.now() - timeStarted;
}

requested.on(pingTerm, () => ({}));
