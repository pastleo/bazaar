/**
 * ConnsClient
 *
 * representing a client on the conns network, responsible for connections management and event interfacing
 */
export default class ConnsClient {
  /**
   * @constructor
   */
  constructor({ iceServers }) {
  }

  /**
   * add an ICE server
   */
  addIceServer(iceServerArgs) {
  }

  /**
   * remove an ICE server
   */
  removeIceServer(iceServerArgs) {
  }

  /**
   * create a connect to a peer
   */
  connect(peerAddr, viaPeerAddr) {
  }

  /**
   * disconnect from a peer
   */
  disconnect(peerAddr) {
  }

  /**
   * add an existing connection
   */
  add(connection) {
  }

  /**
   * register a callback associating with an eventType
   *
   * @param {string} eventType
   * @param {eventSwitchCallback} callback
   *
   * .on('open', (peerAddr) => {})
   * .on('sent:eventType', (params, peerAddr) => {})
   * .on('requested:eventType', (params, resolve, reject, peerAddr) => {})
   */
  on(eventType, callback) {
  }

  /**
   * unregister a callback associating with an eventType
   */
  off(eventRegistration) {
  }

  /**
   * send
   */
  send(peerAddr, eventType, params) {
  }

  /**
   * request
   */
  request(peerAddr, eventType, params) {
  }

  /**
   * broadcast
   */
  broadcast(eventType, params) {
  }
}
