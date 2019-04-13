import /* Phaser from */ 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.16.2/phaser.min.js';

let player;

const viewport = {
  width: Math.min(document.documentElement.clientWidth, window.innerWidth),
  height: Math.min(document.documentElement.clientHeight, window.innerHeight),
};

const config = {
  type: Phaser.AUTO,
  width: viewport.width,
  height: viewport.height,
  parent: 'game',
  backgroundColor: '#7042e5',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 200 },
    },
  },
  scene: {
    preload,
    create,
  },
}

const game = new Phaser.Game(config);

function preload() {
  this.load.image('gpp-tiles', 'game/assets/generic-platformer-pack--bakudas/atlas.png');
  this.load.tilemapTiledJSON('map', 'game/tiled-map.json');
}

function create() {
  player = this.physics.add.sprite()

  const map = this.make.tilemap({ key: 'map' });
  const tileset = map.addTilesetImage('generic-platformer-pack', 'gpp-tiles');

  const cloudLayer = map.createStaticLayer('Cloud', tileset, 0, 0);
  const groundLayer = map.createStaticLayer('Ground', tileset, 0, 0);
  const labberLayer = map.createStaticLayer('Labber', tileset, 0, 0);

  groundLayer.setCollisionByProperty({ collides: true });

  /**
   * Ground debug -
   */
  // const debugGraphics = this.add.graphics().setAlpha(0.75);
  // groundLayer.renderDebug(debugGraphics, {
  //   tileColor: null, // Color of non-colliding tiles
  //   collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tiles
  //   faceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
  // });
  }
