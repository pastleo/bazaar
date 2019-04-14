export default class Player {
  static PreloadSprite(scene) {
    scene.load.image('mfwba-idle-1', '/game/assets/generic-platformer-pack--bakudas/Player/idle/anim1.png');
    scene.load.image('mfwba-idle-2', '/game/assets/generic-platformer-pack--bakudas/Player/idle/anim2.png');
    scene.load.image('mfwba-idle-3', '/game/assets/generic-platformer-pack--bakudas/Player/idle/anim3.png');
    scene.load.image('mfwba-idle-4', '/game/assets/generic-platformer-pack--bakudas/Player/idle/anim4.png');

    scene.load.image('mfwba-run-5', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim5.png');
    scene.load.image('mfwba-run-6', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim6.png');
    scene.load.image('mfwba-run-7', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim7.png');
    scene.load.image('mfwba-run-8', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim8.png');
    scene.load.image('mfwba-run-9', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim9.png');
    scene.load.image('mfwba-run-10', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim10.png');
    scene.load.image('mfwba-run-11', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim11.png');
    scene.load.image('mfwba-run-12', '/game/assets/generic-platformer-pack--bakudas/Player/run/anim12.png');
  }

  static Anims = {
    Idle: 'player-anims-idle',
    Run: 'player-anims-run',
  }

  constructor(scene, x, y) {
    this.sprite = scene.physics.add
      .sprite(x, y, 'mfwba-idle-1')
      .setDrag(500, 0)
      .setMaxVelocity(150, 200)
      .setSize(18, 24)
      .setOffset(7, 9);
    this.cursor = scene.input.keyboard.createCursorKeys();;
    this.constructAnims(scene);
  }

  constructAnims(scene) {
    scene.anims.create({
      key: Player.Anims.Idle,
      frames: [
        { key: 'mfwba-idle-1' },
        { key: 'mfwba-idle-2' },
        { key: 'mfwba-idle-3' },
        { key: 'mfwba-idle-4', duration: 50 },
      ],
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: Player.Anims.Run,
      frames: [
        { key: 'mfwba-run-5' },
        { key: 'mfwba-run-6' },
        { key: 'mfwba-run-7' },
        { key: 'mfwba-run-8' },
        { key: 'mfwba-run-9' },
        { key: 'mfwba-run-10' },
        { key: 'mfwba-run-11' },
        { key: 'mfwba-run-12', duration: 50 },
      ],
      frameRate: 8,
      repeat: -1,
    });
  }

  update() {
    const onGround = this.sprite.body.blocked.down;
    const acceleration = onGround ? 300 : 100;
    if (this.cursor.left.isDown) {
      this.sprite.setAccelerationX(-acceleration);
      this.sprite.setFlipX(true);
    } else if (this.cursor.right.isDown) {
      this.sprite.setAccelerationX(acceleration);
      this.sprite.setFlipX(false);
    } else {
      this.sprite.setAccelerationX(0);
    }

    if (onGround && this.cursor.up.isDown) {
      this.sprite.setVelocityY(-150);
    }

    if (onGround) {
      if (this.sprite.body.velocity.x !== 0) this.sprite.anims.play(Player.Anims.Run, true);
      else this.sprite.anims.play(Player.Anims.Idle, true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setTexture('mfwba-run-11');
    }
  }
}

