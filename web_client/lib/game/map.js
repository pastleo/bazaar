export default class TiledMap {
  static PreloadTilesAndMap(scene) {
    scene.load.image('gpp-tiles', 'game/atlas.png');
    scene.load.tilemapTiledJSON('map', 'game/map.json');
  }

  constructor(scene) {
    this.scene = scene;

    this.map = scene.make.tilemap({ key: 'map' });
    this.tileset = this.map.addTilesetImage('atlas', 'gpp-tiles');

    this.decorLayer = this.map.createStaticLayer('decor', this.tileset, 0, 0);
    this.landLayer = this.map.createStaticLayer('land', this.tileset, 0, 0);
    this.ladderLayer = this.map.createStaticLayer('ladder', this.tileset, 0, 0);

    this.landLayer.setCollisionByProperty({ collides: true });
  }

  getSpwanPoint() {
    return this.map.findObject(
      'Spawn Point',
      obj => obj.name === 'spawn-point'
    );
  }

  addGroundCollider(gameObject) {
    this.scene.physics.add.collider(this.landLayer, gameObject);
  }
}
