import /* Phaser from */ 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.16.2/phaser.min.js';
import Scene from './game/scene.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game',
  backgroundColor: '#fff',
  physics: {
    default: 'arcade',
    arcade: {
      debug: !!location.href.match(/dev\.html$/),
      gravity: { y: 200 },
    },
  },
  scene: Scene,
}

let game;
export function init() {
  return new Promise(resolve => {
    game = new Phaser.Game(config);
    game.initResolve = () => resolve(game);
  });
}

export const getDefaultScene = () => game.scene.scenes[0];
