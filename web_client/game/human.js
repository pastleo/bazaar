export default class Human {
  static PreloadSprite(scene) {
    scene.load.image('mfwba-idle-1', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/idle/anim1.png');
    scene.load.image('mfwba-idle-2', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/idle/anim2.png');
    scene.load.image('mfwba-idle-3', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/idle/anim3.png');
    scene.load.image('mfwba-idle-4', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/idle/anim4.png');

    scene.load.image('mfwba-run-5', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim5.png');
    scene.load.image('mfwba-run-6', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim6.png');
    scene.load.image('mfwba-run-7', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim7.png');
    scene.load.image('mfwba-run-8', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim8.png');
    scene.load.image('mfwba-run-9', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim9.png');
    scene.load.image('mfwba-run-10', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim10.png');
    scene.load.image('mfwba-run-11', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim11.png');
    scene.load.image('mfwba-run-12', '/game/third-party-assets/generic-platformer-pack--bakudas/Player/run/anim12.png');
  }

  static Anims = {
    Idle: 'player-anims-idle',
    Run: 'player-anims-run',
  }

  static constructAnims(scene) {
    scene.anims.create({
      key: Human.Anims.Idle,
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
      key: Human.Anims.Run,
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

  constructor(scene, x, y, name) {
    this.sprite = scene.physics.add
      .sprite(x, y, 'mfwba-idle-1')
      .setDrag(500, 0)
      .setMaxVelocity(150, 200)
      .setSize(18, 24)
      .setOffset(7, 9);

    this.text = scene.add.text(
      this.sprite.x - this.sprite.width / 2,
      this.sprite.y + this.sprite.height / 2,
      name || '',
      { font: "6px Arial", fill: "#ff0044", align: "center" });
  }

  setTextCoordinate() {
    this.text.x = Math.floor(this.sprite.x - this.sprite.width / 2);
    this.text.y = Math.floor(this.sprite.y + this.sprite.height / 2);
  }
  setName(name) {
    this.text.text = name;
  }
}

