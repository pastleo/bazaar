export default class TiledMap {
  static PreloadTilesAndMap(scene) {
    scene.load.image('gpp-tiles', '/game/assets/generic-platformer-pack--bakudas/atlas.png');
    scene.load.tilemapTiledJSON('map', '/game/tiled-map.json');
  }

  constructor(scene) {
    this.scene = scene;

    this.map = scene.make.tilemap({ key: 'map' });
    this.tileset = this.map.addTilesetImage('generic-platformer-pack', 'gpp-tiles');

    this.cloudLayer = this.map.createStaticLayer('Cloud', this.tileset, 0, 0);
    this.groundLayer = this.map.createStaticLayer('Ground', this.tileset, 0, 0);
    this.labberLayer = this.map.createStaticLayer('Labber', this.tileset, 0, 0);

    this.groundLayer.setCollisionByProperty({ collides: true });
  }

  getSpwanPoint() {
    return this.map.findObject(
      'Spawn Point',
      obj => obj.name === 'spawn-point'
    );
  }

  addGroundCollider(gameObject) {
    this.scene.physics.add.collider(this.groundLayer, gameObject);
  }
}
