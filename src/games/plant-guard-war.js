const PLANT_TYPES = {
  shooter: {
    key: 'shooter',
    name: '豆豆花',
    cost: 100,
    hp: 110,
    color: '#50c95a',
    fireRate: 1.15,
    damage: 24
  },
  sun: {
    key: 'sun',
    name: '阳光树',
    cost: 50,
    hp: 90,
    color: '#ffd34d',
    incomeRate: 5.5,
    income: 25
  },
  wall: {
    key: 'wall',
    name: '坚果藤',
    cost: 75,
    hp: 260,
    color: '#d7a270'
  }
};

class PlantGuardWar {
  constructor(app, sceneManager) {
    this.app = app;
    this.sceneManager = sceneManager;
    this.restart();
  }

  restart() {
    this.sun = 150;
    this.selectedPlant = 'shooter';
    this.plants = [];
    this.enemies = [];
    this.bullets = [];
    this.grid = {};
    this.elapsed = 0;
    this.spawnElapsed = 0;
    this.spawned = 0;
    this.defeated = 0;
    this.targetDefeats = 18;
    this.state = 'playing';
    this.globalSunTick = 0;
    this.layout = null;
  }

  update(deltaTime) {
    this.layout = this.getLayout();

    if (this.state !== 'playing') {
      return;
    }

    const dt = Math.min(deltaTime, 0.05);
    this.elapsed += dt;
    this.spawnElapsed += dt;
    this.globalSunTick += dt;

    if (this.globalSunTick >= 4) {
      this.globalSunTick = 0;
      this.sun += 25;
    }

    const spawnInterval = Math.max(1.1, 2.4 - this.defeated * 0.04);
    if (this.spawned < this.targetDefeats && this.spawnElapsed >= spawnInterval) {
      this.spawnElapsed = 0;
      this.spawnEnemy();
    }

    this.updatePlants(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.cleanup();

    if (this.defeated >= this.targetDefeats && this.enemies.length === 0) {
      this.state = 'win';
    }
  }

  updatePlants(dt) {
    this.plants.forEach((plant) => {
      if (plant.type === 'shooter') {
        const hasEnemy = this.enemies.some((enemy) => enemy.row === plant.row && enemy.x > plant.x - 12);
        plant.cooldown -= dt;
        if (hasEnemy && plant.cooldown <= 0) {
          plant.cooldown = PLANT_TYPES.shooter.fireRate;
          this.bullets.push({
            row: plant.row,
            x: plant.x + this.layout.cellWidth * 0.18,
            y: plant.y,
            radius: 8,
            damage: PLANT_TYPES.shooter.damage,
            speed: this.layout.cellWidth * 3.9
          });
        }
      }

      if (plant.type === 'sun') {
        plant.cooldown -= dt;
        if (plant.cooldown <= 0) {
          plant.cooldown = PLANT_TYPES.sun.incomeRate;
          this.sun += PLANT_TYPES.sun.income;
        }
      }
    });
  }

  updateBullets(dt) {
    this.bullets.forEach((bullet) => {
      bullet.x += bullet.speed * dt;
      const target = this.enemies.find(
        (enemy) => enemy.row === bullet.row && Math.abs(enemy.x - bullet.x) <= enemy.width * 0.35
      );
      if (target) {
        target.hp -= bullet.damage;
        bullet.dead = true;
      }
    });
  }

  updateEnemies(dt) {
    this.enemies.forEach((enemy) => {
      const blockingPlant = this.findPlantInFront(enemy);
      if (blockingPlant) {
        enemy.attackTick -= dt;
        if (enemy.attackTick <= 0) {
          enemy.attackTick = 0.55;
          blockingPlant.hp -= enemy.damage;
          if (blockingPlant.hp <= 0) {
            blockingPlant.dead = true;
            delete this.grid[this.gridKey(blockingPlant.row, blockingPlant.col)];
          }
        }
        return;
      }

      enemy.x -= enemy.speed * dt;
      if (enemy.x <= this.layout.boardX - 14) {
        this.state = 'lose';
      }
    });
  }

  cleanup() {
    this.plants = this.plants.filter((plant) => !plant.dead && plant.hp > 0);

    this.bullets = this.bullets.filter((bullet) => !bullet.dead && bullet.x < this.layout.boardX + this.layout.boardWidth + 40);

    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.hp > 0) {
        return true;
      }
      this.defeated += 1;
      return false;
    });
  }

  spawnEnemy() {
    const row = Math.floor(Math.random() * this.layout.rows);
    const strong = this.spawned > 6 && Math.random() > 0.65;
    this.spawned += 1;
    this.enemies.push({
      row,
      x: this.layout.boardX + this.layout.boardWidth + 25,
      y: this.layout.boardY + this.layout.cellHeight * (row + 0.5),
      width: strong ? 62 : 54,
      height: strong ? 74 : 66,
      hp: strong ? 170 : 100,
      speed: strong ? 24 : 32,
      damage: strong ? 22 : 12,
      attackTick: 0.55,
      type: strong ? 'bucket' : 'walker'
    });
  }

  handleTap(point) {
    this.layout = this.getLayout();

    if (this.inRect(point, this.layout.backButton)) {
      const LobbyScene = require('../scenes/lobby-scene');
      this.sceneManager.setScene(new LobbyScene(this.app, this.sceneManager));
      return;
    }

    if (this.state !== 'playing') {
      if (this.inRect(point, this.layout.resultButton)) {
        this.restart();
      }
      return;
    }

    const card = this.layout.seedCards.find((item) => this.inRect(point, item));
    if (card) {
      this.selectedPlant = card.type;
      return;
    }

    if (!this.inRect(point, this.layout.boardRect)) {
      return;
    }

    const cell = this.pickCell(point);
    if (!cell) {
      return;
    }

    const type = PLANT_TYPES[this.selectedPlant];
    const key = this.gridKey(cell.row, cell.col);
    if (!type || this.grid[key] || this.sun < type.cost) {
      return;
    }

    const center = this.cellCenter(cell.row, cell.col);
    const plant = {
      type: type.key,
      row: cell.row,
      col: cell.col,
      hp: type.hp,
      x: center.x,
      y: center.y,
      cooldown: type.key === 'shooter' ? 0.4 : type.key === 'sun' ? 3.2 : 0
    };

    this.sun -= type.cost;
    this.grid[key] = plant;
    this.plants.push(plant);
  }

  render(ctx) {
    this.layout = this.getLayout();
    const { width, height } = this.app;

    ctx.clearRect(0, 0, width, height);
    this.drawBackground(ctx);
    this.drawHeader(ctx);
    this.drawBoard(ctx);
    this.drawPlants(ctx);
    this.drawBullets(ctx);
    this.drawEnemies(ctx);
    this.drawSidebar(ctx);

    if (this.state !== 'playing') {
      this.drawResult(ctx);
    }
  }

  drawBackground(ctx) {
    const { width, height } = this.app;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#8ed0ff');
    sky.addColorStop(1, '#d9f8ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#7bc96f';
    ctx.fillRect(0, this.layout.boardY - 40, width, height - this.layout.boardY + 40);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(150, 80, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(190, 90, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(118, 95, 25, 0, Math.PI * 2);
    ctx.fill();
  }

  drawHeader(ctx) {
    ctx.fillStyle = 'rgba(17, 49, 29, 0.84)';
    this.roundRect(ctx, 18, 16, this.app.width - 36, 74, 18, true);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('植物守卫战', 34, 48);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '18px sans-serif';
    ctx.fillText('守住左侧花园，挡住全部来袭怪物', 34, 74);

    ctx.fillStyle = '#ffe179';
    this.roundRect(ctx, this.app.width - 300, 28, 112, 46, 16, true);
    ctx.fillStyle = '#493300';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('阳光 ' + this.sun, this.app.width - 284, 58);

    ctx.fillStyle = '#8ef59b';
    this.roundRect(
      ctx,
      this.layout.backButton.x,
      this.layout.backButton.y,
      this.layout.backButton.width,
      this.layout.backButton.height,
      16,
      true
    );
    ctx.fillStyle = '#12351b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('返回大厅', this.layout.backButton.x + 16, this.layout.backButton.y + 29);
  }

  drawBoard(ctx) {
    ctx.fillStyle = 'rgba(44, 109, 44, 0.92)';
    this.roundRect(ctx, this.layout.boardX, this.layout.boardY, this.layout.boardWidth, this.layout.boardHeight, 22, true);

    for (let row = 0; row < this.layout.rows; row += 1) {
      for (let col = 0; col < this.layout.cols; col += 1) {
        const x = this.layout.boardX + this.layout.cellWidth * col;
        const y = this.layout.boardY + this.layout.cellHeight * row;
        ctx.fillStyle = (row + col) % 2 === 0 ? '#89d46f' : '#75c75b';
        ctx.fillRect(x + 3, y + 3, this.layout.cellWidth - 6, this.layout.cellHeight - 6);
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let row = 1; row < this.layout.rows; row += 1) {
      const y = this.layout.boardY + this.layout.cellHeight * row;
      ctx.beginPath();
      ctx.moveTo(this.layout.boardX, y);
      ctx.lineTo(this.layout.boardX + this.layout.boardWidth, y);
      ctx.stroke();
    }
    for (let col = 1; col < this.layout.cols; col += 1) {
      const x = this.layout.boardX + this.layout.cellWidth * col;
      ctx.beginPath();
      ctx.moveTo(x, this.layout.boardY);
      ctx.lineTo(x, this.layout.boardY + this.layout.boardHeight);
      ctx.stroke();
    }
  }

  drawSidebar(ctx) {
    this.layout.seedCards.forEach((card) => {
      const plant = PLANT_TYPES[card.type];
      const selected = this.selectedPlant === card.type;
      ctx.fillStyle = selected ? '#fff7cf' : 'rgba(17, 49, 29, 0.78)';
      this.roundRect(ctx, card.x, card.y, card.width, card.height, 18, true);
      ctx.fillStyle = plant.color;
      ctx.beginPath();
      ctx.arc(card.x + 28, card.y + card.height / 2, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = selected ? '#1a2b12' : '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(plant.name, card.x + 52, card.y + 30);
      ctx.font = '18px sans-serif';
      ctx.fillText('消耗 ' + plant.cost, card.x + 52, card.y + 56);
    });

    ctx.fillStyle = 'rgba(17, 49, 29, 0.8)';
    this.roundRect(
      ctx,
      this.layout.infoCard.x,
      this.layout.infoCard.y,
      this.layout.infoCard.width,
      this.layout.infoCard.height,
      18,
      true
    );
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('进度', this.layout.infoCard.x + 18, this.layout.infoCard.y + 30);
    ctx.font = '19px sans-serif';
    ctx.fillText('已击退 ' + this.defeated + ' / ' + this.targetDefeats, this.layout.infoCard.x + 18, this.layout.infoCard.y + 58);
    ctx.fillText('当前选择 ' + PLANT_TYPES[this.selectedPlant].name, this.layout.infoCard.x + 18, this.layout.infoCard.y + 86);
    ctx.fillText('每 4 秒获得 25 阳光', this.layout.infoCard.x + 18, this.layout.infoCard.y + 114);
  }

  drawPlants(ctx) {
    this.plants.forEach((plant) => {
      const spec = PLANT_TYPES[plant.type];
      const radius = plant.type === 'wall' ? 28 : 24;
      ctx.fillStyle = spec.color;
      ctx.beginPath();
      ctx.arc(plant.x, plant.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (plant.type === 'sun') {
        ctx.fillStyle = '#fff4a3';
        ctx.beginPath();
        ctx.arc(plant.x, plant.y, 11, 0, Math.PI * 2);
        ctx.fill();
      }

      if (plant.type === 'shooter') {
        ctx.fillStyle = '#2f6d36';
        ctx.beginPath();
        ctx.arc(plant.x + 10, plant.y - 4, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(plant.x - 24, plant.y + 28, 48, 6);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(plant.x - 24, plant.y + 28, 48, 6);
      ctx.fillStyle = '#63f57b';
      const maxHp = PLANT_TYPES[plant.type].hp;
      ctx.fillRect(plant.x - 24, plant.y + 28, (48 * Math.max(0, plant.hp)) / maxHp, 6);
    });
  }

  drawBullets(ctx) {
    ctx.fillStyle = '#2d7a36';
    this.bullets.forEach((bullet) => {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawEnemies(ctx) {
    this.enemies.forEach((enemy) => {
      ctx.fillStyle = enemy.type === 'bucket' ? '#6d6f88' : '#7f6b63';
      ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);

      ctx.fillStyle = enemy.type === 'bucket' ? '#aeb4cc' : '#d2b1a1';
      ctx.fillRect(enemy.x - enemy.width * 0.22, enemy.y - enemy.height * 0.18, enemy.width * 0.44, enemy.height * 0.32);

      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.fillRect(enemy.x - 28, enemy.y + enemy.height / 2 + 10, 56, 6);
      ctx.fillStyle = '#63f57b';
      const hpBase = enemy.type === 'bucket' ? 170 : 100;
      ctx.fillRect(enemy.x - 28, enemy.y + enemy.height / 2 + 10, (56 * Math.max(0, enemy.hp)) / hpBase, 6);
    });
  }

  drawResult(ctx) {
    ctx.fillStyle = 'rgba(5, 17, 10, 0.6)';
    ctx.fillRect(0, 0, this.app.width, this.app.height);

    const box = {
      x: this.app.width / 2 - 180,
      y: this.app.height / 2 - 110,
      width: 360,
      height: 220
    };
    ctx.fillStyle = '#fffbe3';
    this.roundRect(ctx, box.x, box.y, box.width, box.height, 22, true);
    ctx.fillStyle = '#1d3422';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.state === 'win' ? '守卫成功' : '花园失守', this.app.width / 2, box.y + 58);
    ctx.font = '22px sans-serif';
    ctx.fillText(
      this.state === 'win' ? '本局已经挡住全部怪物。' : '有怪物突破左侧防线了。',
      this.app.width / 2,
      box.y + 102
    );

    ctx.fillStyle = '#79dd82';
    this.roundRect(
      ctx,
      this.layout.resultButton.x,
      this.layout.resultButton.y,
      this.layout.resultButton.width,
      this.layout.resultButton.height,
      20,
      true
    );
    ctx.fillStyle = '#17331d';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('再来一局', this.app.width / 2, this.layout.resultButton.y + 31);
  }

  getLayout() {
    const { width, height } = this.app;
    const boardX = Math.max(220, width * 0.21);
    const boardY = 110;
    const boardWidth = width - boardX - 34;
    const boardHeight = height - boardY - 28;
    const rows = 5;
    const cols = 8;
    const cellWidth = boardWidth / cols;
    const cellHeight = boardHeight / rows;

    return {
      rows,
      cols,
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      cellWidth,
      cellHeight,
      boardRect: { x: boardX, y: boardY, width: boardWidth, height: boardHeight },
      backButton: { x: width - 170, y: 28, width: 132, height: 46 },
      seedCards: [
        { x: 24, y: 122, width: 170, height: 74, type: 'sun' },
        { x: 24, y: 210, width: 170, height: 74, type: 'shooter' },
        { x: 24, y: 298, width: 170, height: 74, type: 'wall' }
      ],
      infoCard: { x: 24, y: 392, width: 170, height: 132 },
      resultButton: { x: width / 2 - 82, y: height / 2 + 30, width: 164, height: 48 }
    };
  }

  pickCell(point) {
    const { boardX, boardY, cellWidth, cellHeight, rows, cols } = this.layout;
    const col = Math.floor((point.x - boardX) / cellWidth);
    const row = Math.floor((point.y - boardY) / cellHeight);
    if (row < 0 || row >= rows || col < 0 || col >= cols) {
      return null;
    }
    return { row, col };
  }

  cellCenter(row, col) {
    return {
      x: this.layout.boardX + this.layout.cellWidth * (col + 0.5),
      y: this.layout.boardY + this.layout.cellHeight * (row + 0.5)
    };
  }

  findPlantInFront(enemy) {
    return this.plants.find((plant) => {
      if (plant.row !== enemy.row) {
        return false;
      }
      const hitDistance = plant.type === 'wall' ? 30 : 22;
      return Math.abs(enemy.x - plant.x) <= hitDistance;
    });
  }

  gridKey(row, col) {
    return row + ':' + col;
  }

  inRect(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
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
}

module.exports = PlantGuardWar;
