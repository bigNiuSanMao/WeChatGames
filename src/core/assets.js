class Assets {
  constructor() {
    this.images = {};
  }

  loadImages(manifest) {
    if (typeof wx === 'undefined') {
      return Promise.resolve(this.images);
    }

    const entries = Object.entries(manifest || {});
    if (entries.length === 0) {
      return Promise.resolve(this.images);
    }

    return new Promise((resolve) => {
      let remaining = entries.length;

      entries.forEach(([key, src]) => {
        const img = wx.createImage();
        img.onload = () => {
          this.images[key] = img;
          remaining -= 1;
          if (remaining <= 0) {
            resolve(this.images);
          }
        };
        img.onerror = () => {
          remaining -= 1;
          if (remaining <= 0) {
            resolve(this.images);
          }
        };
        img.src = src;
      });
    });
  }

  getImage(key) {
    return this.images[key] || null;
  }
}

module.exports = Assets;
