import /* Phaser from */ 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.16.2/phaser.min.js';
import TiledMap from './map.js';
import Player from './player.js';

export default class Scene extends Phaser.Scene {
  preload() {
    TiledMap.PreloadTilesAndMap(this);
    Player.PreloadSprite(this);
  }

  create() {
    this.map = new TiledMap(this);

    const spawnPoint = this.map.getSpwanPoint();
    this.player = new Player(this, spawnPoint.x, spawnPoint.y);
    this.map.addGroundCollider(this.player.sprite);

    this.cameras.main.startFollow(this.player.sprite);
    this.cameras.main.setZoom(4);
  }

  update() {
    this.player.update();
  }
}
