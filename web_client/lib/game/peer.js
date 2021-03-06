import Human from './human.js';

export default class Peer extends Human {
  constructor(scene, x, y, name) {
    super(scene, x, y, name);
  }

  update() {
    if (this.destroyed) { return; }
    const onGround = this.container.body.blocked.down;
    if (onGround) {
      if (this.container.body.velocity.x !== 0) this.playRunAnim();
      else this.playIdleAnim();
    } else {
      this.playJumpAnim();
    }
  }

  setMovement({ ax, vy, flip, x, y }) {
    if (ax !== undefined) this.container.body.setAccelerationX(ax);
    if (vy !== undefined) this.container.body.setVelocityY(vy);
    if (flip !== undefined) this.sprite.setFlipX(flip === 'x');

    this.container.setX(x);
    this.container.setY(y);
  }
}

