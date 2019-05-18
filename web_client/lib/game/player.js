import Human from './human.js';

import * as peers from '../peers.js';
import * as peerConns from '../peerConns.js';

export const movementUpdateTerm = 'movementUpdate';

export default class Player extends Human {
  constructor(scene, x, y, name) {
    super(scene, x, y, name);
    this.cursor = scene.input.keyboard.createCursorKeys();
    this.initTouch();
    this.lastMovement = {};
    peerConns.newConnectionReady.do(peerId => {
      this.sendMovement(peerId);
    });
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
      if (this.touchStartY - this.touchLastY > 50 && this.onGround) {
        this.swipeUp = true;
      }
      this.dragRightIsDown = false;
      this.dragLeftIsDown = false;
      e.preventDefault();
    });
  }

  update() {
    this.onGround = this.container.body.blocked.down;
    const acceleration = this.onGround ? 300 : 100;
    if (this.cursor.left.isDown || this.dragLeftIsDown) {
      this.container.body.setAccelerationX(-acceleration);
      this.sprite.setFlipX(true);
      this.broadcaseMovement({ ax: -acceleration, flip: 'x' });
    } else if (this.cursor.right.isDown || this.dragRightIsDown) {
      this.container.body.setAccelerationX(acceleration);
      this.sprite.setFlipX(false);
      this.broadcaseMovement({ ax: acceleration, flip: 'n' });
    } else {
      this.container.body.setAccelerationX(0);
      this.broadcaseMovement({ ax: 0 });
    }

    if (this.onGround && (this.cursor.up.isDown || this.swipeUp)) {
      this.swipeUp = false;
      this.container.body.setVelocityY(-150);
      this.broadcaseMovement({ vy: -150 });
    }

    if (this.onGround) {
      if (this.container.body.velocity.x !== 0) this.playRunAnim();
      else this.playIdleAnim();
    } else {
      this.playJumpAnim();
    }
  }

  setName(name) {
    this.text.text = name;
  }

  broadcaseMovement(params) {
    if (
      this.lastMovement.ax === params.ax &&
      this.lastMovement.vy === params.vy &&
      this.lastMovement.flip === params.flip
    ) { return; }
    peerConns.getConnectedPeerIds().filter(p => {
      const gameObj = peers.get(p).gameObj;
      return gameObj && !gameObj.destroyed;
    }).forEach(p => {
      this.sendMovement(p, params);
    });
    this.lastMovement = params;
  }

  sendMovement(peerId, params = {}) {
    setTimeout(() => {
      peerConns.send(peerId, movementUpdateTerm, {
        x: this.container.x,
        y: this.container.y,
        ...params,
      });
    })
  }
}

