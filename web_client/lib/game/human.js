import { randomStr } from '../utils.js'

const TextStyle = {
  fontSize: "18px",
  fill: "#ff0044",
}
const bodyWidth = 64;
const bodyHeight = 128;

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
    this.scene = scene;

    this.container = this.scene.add.container(x, y);
    this.container.setSize(bodyWidth, bodyHeight);
    this.scene.physics.world.enable(this.container);
    this.container.body.setMaxVelocity(150, 200).setDrag(500, 0);
    this.scene.addCollider(this.container)

    this.sprite = this.scene.add.sprite(0, 0, 'human');
    this.container.add(this.sprite);

    this.text = this.scene.add.text(0, 80, preprocessName(name || ''), TextStyle);
    this.text.setOrigin(0.45, 0.5);

    this.container.add(this.text);

    this.animKeys = {
      idle: Human.Anims.Idle,
      run: Human.Anims.Run,
      jump: Human.Anims.Jump,
    };
  }

  setName(name) {
    this.text.text = preprocessName(name);
  }

  playIdleAnim() {
    this.sprite.anims.play(this.animKeys.idle, true);
  }
  playRunAnim() {
    this.sprite.anims.play(this.animKeys.run, true);
  }
  playJumpAnim() {
    this.sprite.anims.play(this.animKeys.jump, true);
  }

  async setAvatar({ url, frameWidth, frameHeight, idle, run, jump }) {
    let spritesheetName = `human-${url}-${randomStr()}`;
    await this.scene.loadAsync(
      'spritesheet', spritesheetName, url, { frameWidth, frameHeight }
    );
    const frameTotal = this.scene.textures.get(spritesheetName).frameTotal - 1;

    [['idle', idle], ['run', run], ['jump', jump]].map(
      ([key, { start, end, frameRate, repeat}]) => {
        const newAnimKey = `${spritesheetName}-${key}`;
        if (start >= frameTotal) {
          throw new Error(`spritesheet from '${url}' has ${frameTotal} frames, animation ${key} try to start from index ${start}`);
        }
        this.scene.anims.create({
          key: newAnimKey,
          frames: this.scene.anims.generateFrameNumbers(spritesheetName, { start, end }),
          frameRate: frameRate || 8,
          repeat: repeat || -1,
        });

        return [key, newAnimKey];
      }
    ).forEach(([key, newAnimKey]) => {
      this.animKeys[key] = newAnimKey;
    });

    const newSprite = this.scene.add.sprite(0, 0, spritesheetName);
    if (frameWidth > bodyWidth || frameHeight > bodyHeight) {
      let scale;
      if (frameWidth / frameHeight > bodyWidth / bodyHeight) {
        scale = bodyWidth / frameWidth;
        newSprite.y = (bodyHeight - (frameHeight / frameWidth) * bodyWidth) / 2;
      } else {
        scale = bodyHeight / frameHeight;
      }
      newSprite.scaleX = scale;
      newSprite.scaleY = scale;
    } else {
      newSprite.y = (bodyHeight - frameHeight) / 2;
    }
    this.container.add(newSprite);
    this.sprite.destroy();
    this.sprite = newSprite;
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
