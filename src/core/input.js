class Input {
  constructor() {
    this.taps = [];
    this.pointer = { x: 0, y: 0, active: false };
  }

  bind() {
    if (typeof wx === 'undefined') {
      return;
    }

    wx.onTouchStart((event) => {
      const touch = event.touches && event.touches[0];
      if (!touch) {
        return;
      }
      this.pointer = { x: touch.clientX, y: touch.clientY, active: true };
      this.taps.push({ x: touch.clientX, y: touch.clientY });
    });

    wx.onTouchMove((event) => {
      const touch = event.touches && event.touches[0];
      if (!touch) {
        return;
      }
      this.pointer = { x: touch.clientX, y: touch.clientY, active: true };
    });

    wx.onTouchEnd(() => {
      this.pointer.active = false;
    });

    wx.onTouchCancel(() => {
      this.pointer.active = false;
    });
  }

  consumeTap() {
    return this.taps.shift() || null;
  }
}

module.exports = Input;
