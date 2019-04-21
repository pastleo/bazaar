import /* Phaser from */ 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.16.2/phaser.min.js';
import Scene from './scene.js';

const viewport = {
  width: Math.min(document.documentElement.clientWidth, window.innerWidth),
  height: Math.min(document.documentElement.clientHeight, window.innerHeight),
};

let _onCreate = () => null;
export function onCreate(callback) {
  _onCreate = callback;
}

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
  scene: Scene,
}

const game = new Phaser.Game(config);
game.emitCreate = () => _onCreate();

export const getDefaultScene = () => game.scene.scenes[0];

export default game;
