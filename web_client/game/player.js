import Human from './human.js';

import * as peerConns from '../lib/peerConns.js';
import { movementUpdateTerm } from './scene.js';
import * as peers from '../lib/peers.js';

export default class Player extends Human {
  constructor(scene, x, y, name) {
    super(scene, x, y, name);
    this.cursor = scene.input.keyboard.createCursorKeys();;
  }

  update() {
    const onGround = this.sprite.body.blocked.down;
    const acceleration = onGround ? 300 : 100;
    if (this.cursor.left.isDown) {
      this.sprite.setAccelerationX(-acceleration);
      this.sprite.setFlipX(true);
      this.broadcaseMovement('left', { ax: -acceleration, flip: 'x' });
    } else if (this.cursor.right.isDown) {
      this.sprite.setAccelerationX(acceleration);
      this.sprite.setFlipX(false);
      this.broadcaseMovement('right', { ax: acceleration, flip: 'n' });
    } else {
      this.sprite.setAccelerationX(0);
      this.broadcaseMovement('stop', { ax: 0 });
    }

    if (onGround && this.cursor.up.isDown) {
      this.sprite.setVelocityY(-150);
      this.broadcaseMovement('jump', { vy: -150 });
    }

    if (onGround) {
      if (this.sprite.body.velocity.x !== 0) this.sprite.anims.play(Player.Anims.Run, true);
      else this.sprite.anims.play(Player.Anims.Idle, true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setTexture('mfwba-run-11');
    }

    if (
      this.sprite.body.velocity.x !== 0 ||
      this.sprite.body.velocity.y !== 0
    ) {
      this.setTextCoordinate();
    }
  }

  setName(name) {
    this.text.text = name;
  }

  broadcaseMovement(action, params) {
    if (this.lastMovementAction === action) { return; }
    peerConns.getConnectedPeerNames().filter(p => {
      const gameObj = peers.get(p).gameObj;
      return gameObj && !gameObj.destroyed;
    }).forEach(p => {
      this.sendMovement(p, params);
    });
    this.lastMovementAction = action;
  }

  sendMovement(peerName, params = {}) {
    peerConns.send(peerName, movementUpdateTerm, {
      x: this.sprite.x,
      y: this.sprite.y,
      ...params,
    });
  }
}

