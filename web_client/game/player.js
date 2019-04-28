import Human from './human.js';

import * as peers from '../lib/peers.js';
import * as peerConns from '../lib/peerConns.js';

export const movementUpdateTerm = 'movementUpdate';

export default class Player extends Human {
  constructor(scene, x, y, name) {
    super(scene, x, y, name);
    this.cursor = scene.input.keyboard.createCursorKeys();
    this.initTouch();
  }

  initTouch() {
    document.getElementById('game').addEventListener('touchstart', e => {
      const { touches: [{ screenX, screenY }, ..._] } = e;
      this.touchStartX = screenX;
      this.touchStartY = screenY;
      e.preventDefault();
    });
    document.getElementById('game').addEventListener('touchmove', e => {
      const { touches: [{ screenX, screenY }, ..._] } = e;
      if (screenX - this.touchStartX > 50) {
        this.dragRightIsDown = true;
        this.dragLeftIsDown = false;
      } else if (this.touchStartX - screenX > 50) {
        this.dragRightIsDown = false;
        this.dragLeftIsDown = true;
      } else {
        this.dragRightIsDown = false;
        this.dragLeftIsDown = false;
      }
      this.touchLastX = screenX;
      this.touchLastY = screenY;
      e.preventDefault();
    });
    document.getElementById('game').addEventListener('touchend', e => {
      if (this.touchStartY - this.touchLastY > 50) {
        this.swipeUp = true;
      }
      this.dragRightIsDown = false;
      this.dragLeftIsDown = false;
      e.preventDefault();
    });
  }

  update() {
    const onGround = this.sprite.body.blocked.down;
    const acceleration = onGround ? 300 : 100;
    if (this.cursor.left.isDown || this.dragLeftIsDown) {
      this.sprite.setAccelerationX(-acceleration);
      this.sprite.setFlipX(true);
      this.broadcaseMovement('left', { ax: -acceleration, flip: 'x' });
    } else if (this.cursor.right.isDown || this.dragRightIsDown) {
      this.sprite.setAccelerationX(acceleration);
      this.sprite.setFlipX(false);
      this.broadcaseMovement('right', { ax: acceleration, flip: 'n' });
    } else {
      this.sprite.setAccelerationX(0);
      this.broadcaseMovement('stop', { ax: 0 });
    }

    if (onGround && (this.cursor.up.isDown || this.swipeUp)) {
      this.swipeUp = false;
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

