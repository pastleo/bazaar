import Human from './human.js';

export default class Peer extends Human {
  constructor(scene, x, y, name) {
    super(scene, x, y, name);
  }

  update() {
    if (this.destroyed) { return; }
    const onGround = this.sprite.body.blocked.down;
    if (onGround) {
      if (this.sprite.body.velocity.x !== 0) this.sprite.anims.play(Human.Anims.Run, true);
      else this.sprite.anims.play(Human.Anims.Idle, true);
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

  setMovement({ ax, vy, flip, x, y }) {
    if (ax !== undefined) this.sprite.setAccelerationX(ax);
    if (vy !== undefined) this.sprite.setVelocityY(vy);
    if (flip !== undefined) this.sprite.setFlipX(flip === 'x');

    this.sprite.x = x;
    this.sprite.y = y;

    this.setTextCoordinate();
  }

  destory() {
    this.destroyed = true;
    this.sprite.destroy();
    this.text.destroy();
  }
}

