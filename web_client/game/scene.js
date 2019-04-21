import /* Phaser from */ 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.16.2/phaser.min.js';
import TiledMap from './map.js';
import Human from './player.js';
import Player from './player.js';
import Peer from './peer.js';
import * as peers from '../lib/peers.js';
import * as peerConns from '../lib/peerConns.js';

export const movementUpdateTerm = 'movementUpdate';

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

    this.game.emitCreate();
  }

  update() {
    this.player.update();
    peers.allNames().forEach(peerName => {
      const gameObj = peers.get(peerName).gameObj;
      if (gameObj) { gameObj.update(); }
    });
  }

  addPeer(name) {
    if (this.isBooted) return;
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
