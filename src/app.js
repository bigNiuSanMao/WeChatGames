const Input = require('./core/input');
const Assets = require('./core/assets');
const SceneManager = require('./core/scene-manager');
const LobbyScene = require('./scenes/lobby-scene');
const LoadingScene = require('./scenes/loading-scene');

class App {
  constructor() {
    if (typeof wx === 'undefined') {
      throw new Error('请在微信小游戏环境中运行。');
    }

    this.info = wx.getSystemInfoSync();
    this.width = this.info.windowWidth;
    this.height = this.info.windowHeight;
    this.canvas = wx.createCanvas();
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d');

    this.input = new Input();
    this.input.bind();

    this.sceneManager = new SceneManager();
    this.assets = new Assets();
    this.sceneManager.setScene(new LoadingScene(this, '资源加载中...'));
    this.preload();

    this.lastTime = Date.now();
    this.loop = this.loop.bind(this);
    this.loop();
  }

  preload() {
    const manifest = {
      plantSun: 'assets/twemoji/1f33b.png',
      plantShooter: 'assets/twemoji/1f33f.png',
      plantWall: 'assets/twemoji/1f330.png',
      plantIce: 'assets/twemoji/2744.png',
      plantBomb: 'assets/twemoji/1f4a5.png',
      enemyZombie: 'assets/twemoji/1f9df.png',
      enemyFast: 'assets/twemoji/1f3c3.png',
      enemyArmored: 'assets/twemoji/26d1.png',
      enemyTank: 'assets/twemoji/1f9cc.png',
      iconArcade: 'assets/twemoji/1f3ae.png'
    };

    const currentScene = this.sceneManager.currentScene;
    if (currentScene && typeof currentScene.setProgress === 'function') {
      currentScene.setProgress(0.2);
    }

    this.assets.loadImages(manifest).then(() => {
      const scene = this.sceneManager.currentScene;
      if (scene && typeof scene.setProgress === 'function') {
        scene.setProgress(1);
      }
      this.sceneManager.setScene(new LobbyScene(this, this.sceneManager));
    });
  }

  loop() {
    const now = Date.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    let tap = this.input.consumeTap();
    while (tap) {
      this.sceneManager.handleTap(tap);
      tap = this.input.consumeTap();
    }

    this.sceneManager.update(deltaTime);
    this.sceneManager.render(this.ctx);

    if (typeof this.canvas.requestAnimationFrame === 'function') {
      this.canvas.requestAnimationFrame(this.loop);
      return;
    }

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(this.loop);
      return;
    }

    setTimeout(this.loop, 16);
  }
}

module.exports = App;
