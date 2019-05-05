import TiledMap from './map.js';
import Human from './player.js';
import Player, { movementUpdateTerm } from './player.js';
import Peer from './peer.js';

import * as peers from '../peers.js';
import * as peerConns from '../peerConns.js';

export default class Scene extends Phaser.Scene {
  constructor() {
    super();
    this.loadRequests = [];
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

    peerConns.newConnectionReady.do((peerName, viaPeerName) => {
      this.addPeer(peerName);
    });
    peerConns.connectionClosed.do(peerName => {
      this.rmPeer(peerName);
    });

    this.game.initResolve();
  }

  update() {
    this.player.update();
    peers.allNames().forEach(peerName => {
      const gameObj = peers.get(peerName).gameObj;
      if (gameObj) { gameObj.update(); }
    });
  }

  addCollider(gameObj) {
    this.map.addGroundCollider(gameObj);
  }

  async loadAsync(type, ...args) {
    if (this.loadingAsync) { await new Promise(r => this.loadRequests.push(r)); }
    this.loadingAsync = true;

    await new Promise(r => {
      this.load[type](...args);
      this.load.once('complete', () => r());
      this.load.start();
    });

    this.loadingAsync = false;
    this.loadRequests.forEach(r => r());
    this.loadRequests = [];
  }

  addPeer(name) {
    const gameObj = new Peer(this, this.spawnPoint.x, this.spawnPoint.y, name);
    peers.set(name, { gameObj });
  }

  rmPeer(name) {
    peers.get(name).gameObj.destory();
  }

  setMyNickName(name) {
    this.player.setName(name);
  }

  setPeerNickName(name, nickName) {
    peers.get(name).gameObj.setName(nickName);
  }

  setMyAvatar(avatarParams) {
    return this.player.setAvatar(avatarParams);
  }

  setPeerAvatar(name, avatarParams) {
    return peers.get(name).gameObj.setAvatar(avatarParams);
  }
}
