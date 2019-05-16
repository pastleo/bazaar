import TiledMap from './map.js';
import Human from './player.js';
import Player, { movementUpdateTerm } from './player.js';
import Peer from './peer.js';

import * as peers from '../peers.js';
import * as peerConns from '../peerConns.js';

export default class Scene extends Phaser.Scene {
  constructor() {
    super();
    this.created = false;
    this._waitingForCreatedResolves = [];
  }

  preload() {
    TiledMap.PreloadTilesAndMap(this);
    Human.PreloadSprite(this);
  }

  create() {
    this.map = new TiledMap(this);
    Human.constructAnims(this);

    this.spawnPoint = this.map.getSpwanPoint();
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);
    this.cameras.main.startFollow(this.player.container);

    peerConns.sent.on(movementUpdateTerm, (movementParams, from) => {
      peers.get(from).gameObj.setMovement(movementParams);
    });

    peerConns.newConnectionReady.do((peerId, viaPeerId) => {
      this.addPeer(peerId);
    });
    peerConns.connectionClosed.do(peerId => {
      this.rmPeer(peerId);
    });

    this.created = true;
    setTimeout(() => this._waitingForCreatedResolves.forEach(r => r()));
    this.game.initResolve();
  }

  update() {
    this.player.update();
    peers.allIds().forEach(peerId => {
      const gameObj = peers.get(peerId).gameObj;
      if (gameObj) { gameObj.update(); }
    });
  }

  addCollider(gameObj) {
    this.map.addGroundCollider(gameObj);
  }

  async loadAsync(type, ...args) {
    if (!this.created) { await new Promise(r => this._waitingForCreatedResolves.push(r)); }
    await new Promise(r => {
      this.load[type](...args);
      this.load.once('complete', () => r());
      this.load.start();
    });
  }

  addPeer(id) {
    const gameObj = new Peer(this, this.spawnPoint.x, this.spawnPoint.y, id);
    peers.set(id, { gameObj });
  }

  rmPeer(id) {
    peers.get(id).gameObj.destory();
  }

  setMyNickName(name) {
    this.player.setName(name);
  }

  setPeerNickName(id, nickName) {
    peers.get(id).gameObj.setName(nickName);
  }

  setMyAvatar(avatarParams) {
    return this.player.setAvatar(avatarParams);
  }

  setPeerAvatar(id, avatarParams) {
    return peers.get(id).gameObj.setAvatar(avatarParams);
  }
}
