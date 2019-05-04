import TiledMap from './map.js';
import Human from './player.js';
import Player, { movementUpdateTerm } from './player.js';
import Peer from './peer.js';

import * as peers from '../peers.js';
import * as peerConns from '../peerConns.js';

export default class Scene extends Phaser.Scene {
  preload() {
    TiledMap.PreloadTilesAndMap(this);
    Human.PreloadSprite(this);
  }

  create() {
    this.map = new TiledMap(this);
    Human.constructAnims(this);

    this.spawnPoint = this.map.getSpwanPoint();
    this.player = new Player(this, this.spawnPoint.x, this.spawnPoint.y);
    window.player = this.player;
    this.map.addGroundCollider(this.player.sprite);

    this.cameras.main.startFollow(this.player.sprite);
    this.cameras.main.setZoom(4);

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

  addPeer(name) {
    const gameObj = new Peer(this, this.spawnPoint.x, this.spawnPoint.y, name);
    this.map.addGroundCollider(gameObj.sprite);
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
}
