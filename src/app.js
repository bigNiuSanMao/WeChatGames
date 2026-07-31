const Input = require('./core/input');
const SceneManager = require('./core/scene-manager');
const LobbyScene = require('./scenes/lobby-scene');

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
    this.sceneManager.setScene(new LobbyScene(this, this.sceneManager));

    this.lastTime = Date.now();
    this.loop = this.loop.bind(this);
    this.loop();
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
