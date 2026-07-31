class SceneManager {
  constructor() {
    this.currentScene = null;
  }

  setScene(scene) {
    if (this.currentScene && typeof this.currentScene.onExit === 'function') {
      this.currentScene.onExit();
    }
    this.currentScene = scene;
    if (this.currentScene && typeof this.currentScene.onEnter === 'function') {
      this.currentScene.onEnter();
    }
  }

  update(deltaTime) {
    if (this.currentScene && typeof this.currentScene.update === 'function') {
      this.currentScene.update(deltaTime);
    }
  }

  render(ctx) {
    if (this.currentScene && typeof this.currentScene.render === 'function') {
      this.currentScene.render(ctx);
    }
  }

  handleTap(point) {
    if (this.currentScene && typeof this.currentScene.handleTap === 'function') {
      this.currentScene.handleTap(point);
    }
  }
}

module.exports = SceneManager;
