const TextStyle = {
  fontSize: "18px",
  fill: "#ff0044",
}
class Human {
  static PreloadSprite(scene) {
    scene.load.spritesheet('human', 'game/human.png', { frameWidth: 64, frameHeight: 128 });
  }

  static constructAnims(scene) {
    scene.anims.create({
      key: Human.Anims.Idle,
      frames: scene.anims.generateFrameNumbers('human', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: Human.Anims.Run,
      frames: scene.anims.generateFrameNumbers('human', { start: 5, end: 9 }),
      frameRate: 8,
      repeat: -1,
    });

    scene.anims.create({
      key: Human.Anims.Jump,
      frames: scene.anims.generateFrameNumbers('human', { start: 10, end: 14 }),
      frameRate: 8,
      repeat: -1,
    })
  }

  constructor(scene, x, y, name) {
    this.container = scene.add.container(x, y);
    this.container.setSize(64, 128);
    scene.physics.world.enable(this.container);
    this.container.body.setMaxVelocity(150, 200).setDrag(500, 0);
    scene.addCollider(this.container)

    this.sprite = scene.add.sprite(0, 0, 'human');
    this.container.add(this.sprite);

    this.text = scene.add.text(0, 80, preprocessName(name || ''), TextStyle);
    this.text.setOrigin(0.45, 0.5);

    this.container.add(this.text);
  }

  setName(name) {
    this.text.text = preprocessName(name);
  }

  destory() {
    this.destroyed = true;
    this.sprite.destroy();
    this.text.destroy();
    this.container.destroy();
  }
}

function preprocessName(name) {
  return name.length > 10 ? name.replace(/(.{10})(.*)/, '$1...') : name;
}

Human.Anims = {
  Idle: 'human-anims-idle',
  Run: 'human-anims-run',
  Jump: 'human-anims-jump',
}

export default Human
