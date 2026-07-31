const games = require('../config/games');
const PlantGuardWar = require('../games/plant-guard-war');

class LobbyScene {
  constructor(app, sceneManager) {
    this.app = app;
    this.sceneManager = sceneManager;
    this.cards = [];
  }

  update() {
    const { width, height } = this.app;
    const padding = 28;
    const gap = 18;
    const cardWidth = Math.min(300, (width - padding * 2 - gap * 2) / 3);
    const cardHeight = Math.min(190, height * 0.42);
    const startX = (width - (cardWidth * 3 + gap * 2)) / 2;
    const y = Math.max(150, height * 0.28);

    this.cards = games.map((game, index) => ({
      ...game,
      x: startX + index * (cardWidth + gap),
      y,
      width: cardWidth,
      height: cardHeight
    }));
  }

  render(ctx) {
    const { width, height } = this.app;
    ctx.clearRect(0, 0, width, height);

    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#1d4d2d');
    bg.addColorStop(1, '#0d2417');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    this.drawDecorations(ctx, width, height);

    ctx.fillStyle = '#f4ffe6';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('沃沃避难所', width / 2, 72);

    ctx.fillStyle = 'rgba(244, 255, 230, 0.82)';
    ctx.font = '22px sans-serif';
    ctx.fillText('避难所大厅已预留多个入口，后续可以继续增加其他微信小游戏', width / 2, 110);

    this.cards.forEach((card) => {
      ctx.fillStyle = 'rgba(9, 21, 14, 0.58)';
      this.roundRect(ctx, card.x, card.y, card.width, card.height, 24, true);

      ctx.fillStyle = card.accent;
      this.roundRect(ctx, card.x + 16, card.y + 18, 110, 34, 17, true);
      ctx.fillStyle = '#102213';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(card.status === 'active' ? '可试玩' : '预留中', card.x + 71, card.y + 41);

      const icon = this.app.assets && this.app.assets.getImage ? this.app.assets.getImage(card.icon) : null;
      if (icon) {
        const size = 64;
        ctx.drawImage(icon, card.x + card.width - size - 22, card.y + 22, size, size);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(card.title, card.x + 20, card.y + 92);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.font = '20px sans-serif';
      this.wrapText(ctx, card.description, card.x + 20, card.y + 126, card.width - 40, 28);

      const buttonColor = card.status === 'active' ? card.accent : 'rgba(255,255,255,0.14)';
      ctx.fillStyle = buttonColor;
      this.roundRect(ctx, card.x + 20, card.y + card.height - 62, card.width - 40, 42, 21, true);
      ctx.fillStyle = card.status === 'active' ? '#102213' : 'rgba(255,255,255,0.55)';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(card.actionText, card.x + card.width / 2, card.y + card.height - 34);
    });
  }

  handleTap(point) {
    const card = this.cards.find((item) => this.contains(point, item));
    if (!card || card.status !== 'active') {
      return;
    }

    if (card.id === 'plant-guard-war') {
      this.sceneManager.setScene(new PlantGuardWar(this.app, this.sceneManager));
    }
  }

  drawDecorations(ctx, width, height) {
    ctx.fillStyle = 'rgba(127, 201, 112, 0.1)';
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.arc((width / 8) * i + 80, height - 30, 140, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = text.split('');
    let line = '';
    let offsetY = 0;

    chars.forEach((char) => {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y + offsetY);
        line = char;
        offsetY += lineHeight;
      } else {
        line = test;
      }
    });

    if (line) {
      ctx.fillText(line, x, y + offsetY);
    }
  }

  roundRect(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fill) {
      ctx.fill();
    }
  }

  contains(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }
}

module.exports = LobbyScene;
