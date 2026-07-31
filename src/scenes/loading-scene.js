class LoadingScene {
  constructor(app, message) {
    this.app = app;
    this.message = message || '资源加载中...';
    this.progress = 0;
  }

  setProgress(progress) {
    this.progress = Math.max(0, Math.min(1, progress));
  }

  render(ctx) {
    const { width, height } = this.app;
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0d2417');
    bg.addColorStop(1, '#1d4d2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#f4ffe6';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('沃沃避难所', width / 2, height / 2 - 70);

    ctx.fillStyle = 'rgba(244,255,230,0.85)';
    ctx.font = '24px sans-serif';
    ctx.fillText(this.message, width / 2, height / 2 - 20);

    const barWidth = Math.min(520, width * 0.68);
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 30;
    const barHeight = 18;

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#79dd82';
    ctx.fillRect(barX, barY, barWidth * this.progress, barHeight);

    ctx.fillStyle = 'rgba(244,255,230,0.7)';
    ctx.font = '18px sans-serif';
    ctx.fillText(Math.round(this.progress * 100) + '%', width / 2, barY + 52);
  }
}

module.exports = LoadingScene;
