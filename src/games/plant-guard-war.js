const PLANT_TYPES = {
  shooter: {
    key: 'shooter',
    name: '沃沃哨卫',
    cost: 90,
    hp: 120,
    color: '#50c95a',
    sprite: 'plantShooter',
    fireRate: 1.0,
    damage: 28,
    bulletColor: '#2d7a36'
  },
  sun: {
    key: 'sun',
    name: '补给花仓',
    cost: 50,
    hp: 100,
    color: '#ffd34d',
    sprite: 'plantSun',
    incomeRate: 4.5,
    income: 30
  },
  wall: {
    key: 'wall',
    name: '避难壁垒',
    cost: 65,
    hp: 320,
    color: '#d7a270',
    sprite: 'plantWall'
  },
  ice: {
    key: 'ice',
    name: '霜冻岗哨',
    cost: 110,
    hp: 110,
    color: '#83e5ff',
    sprite: 'plantIce',
    fireRate: 1.35,
    damage: 20,
    slowFactor: 0.45,
    slowDuration: 2.4,
    bulletColor: '#49b8ff'
  },
  bomb: {
    key: 'bomb',
    name: '轰鸣果仓',
    cost: 135,
    hp: 80,
    color: '#ff6b6b',
    sprite: 'plantBomb',
    armTime: 0.55,
    radius: 1.3,
    damage: 150
  }
};

class PlantGuardWar {
  constructor(app, sceneManager) {
    this.app = app;
    this.sceneManager = sceneManager;
    this.restart();
  }

  restart() {
    this.sun = 225;
    this.selectedPlant = 'shooter';
    this.plants = [];
    this.enemies = [];
    this.bullets = [];
    this.effects = [];
    this.grid = {};
    this.elapsed = 0;
    this.spawnElapsed = 0;
    this.spawned = 0;
    this.defeated = 0;
    this.targetDefeats = 15;
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

    if (this.globalSunTick >= 3.5) {
      this.globalSunTick = 0;
      this.sun += 30;
    }

    const spawnInterval = Math.max(1.8, 3.4 - this.defeated * 0.05);
    if (this.spawned < this.targetDefeats && this.spawnElapsed >= spawnInterval) {
      this.spawnElapsed = 0;
      this.spawnEnemy();
    }

    this.updatePlants(dt);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.updateEffects(dt);
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
            speed: this.layout.cellWidth * 3.9,
            color: PLANT_TYPES.shooter.bulletColor,
            slowFactor: 0,
            slowDuration: 0
          });
        }
      }

      if (plant.type === 'ice') {
        const hasEnemy = this.enemies.some((enemy) => enemy.row === plant.row && enemy.x > plant.x - 12);
        plant.cooldown -= dt;
        if (hasEnemy && plant.cooldown <= 0) {
          plant.cooldown = PLANT_TYPES.ice.fireRate;
          this.bullets.push({
            row: plant.row,
            x: plant.x + this.layout.cellWidth * 0.18,
            y: plant.y,
            radius: 8,
            damage: PLANT_TYPES.ice.damage,
            speed: this.layout.cellWidth * 3.6,
            color: PLANT_TYPES.ice.bulletColor,
            slowFactor: PLANT_TYPES.ice.slowFactor,
            slowDuration: PLANT_TYPES.ice.slowDuration
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

      if (plant.type === 'bomb') {
        plant.armTick -= dt;
        if (plant.armTick > 0) {
          return;
        }

        const radiusPx = Math.max(this.layout.cellWidth, this.layout.cellHeight) * PLANT_TYPES.bomb.radius;
        const hasTarget = this.enemies.some((enemy) => {
          const dx = enemy.x - plant.x;
          const dy = enemy.y - plant.y;
          return Math.sqrt(dx * dx + dy * dy) <= radiusPx;
        });
        if (!hasTarget) {
          return;
        }

        this.explodeAt(plant.x, plant.y, radiusPx, PLANT_TYPES.bomb.damage);
        plant.dead = true;
        delete this.grid[this.gridKey(plant.row, plant.col)];
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
        if (bullet.slowFactor > 0 && bullet.slowDuration > 0) {
          target.slowTick = Math.max(target.slowTick || 0, bullet.slowDuration);
          target.slowFactor = Math.min(target.slowFactor || 1, bullet.slowFactor);
        }
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

      if (enemy.slowTick && enemy.slowTick > 0) {
        enemy.slowTick -= dt;
        if (enemy.slowTick <= 0) {
          enemy.slowTick = 0;
          enemy.slowFactor = 1;
        }
      }

      const moveFactor = enemy.slowFactor ? enemy.slowFactor : 1;
      enemy.x -= enemy.speed * moveFactor * dt;
      if (enemy.x <= this.layout.boardX - 14) {
        this.state = 'lose';
      }
    });
  }

  updateEffects(dt) {
    this.effects.forEach((effect) => {
      effect.tick -= dt;
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

    this.effects = this.effects.filter((effect) => effect.tick > 0);
  }

  spawnEnemy() {
    const row = Math.floor(Math.random() * this.layout.rows);
    const roll = Math.random();
    const strong = this.spawned > 7 && roll > 0.8;
    const fast = this.spawned > 4 && roll > 0.58 && roll <= 0.8;
    const tank = this.spawned > 12 && roll > 0.92;
    this.spawned += 1;
    const type = tank ? 'tank' : strong ? 'armored' : fast ? 'fast' : 'walker';
    const stats = this.getEnemyStats(type);
    this.enemies.push({
      row,
      x: this.layout.boardX + this.layout.boardWidth + 25,
      y: this.layout.boardY + this.layout.cellHeight * (row + 0.5),
      width: stats.width,
      height: stats.height,
      hp: stats.hp,
      baseHp: stats.hp,
      speed: stats.speed,
      damage: stats.damage,
      attackTick: 0.55,
      type,
      sprite: stats.sprite,
      slowTick: 0,
      slowFactor: 1
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
      cooldown: type.key === 'shooter' ? 0.25 : type.key === 'ice' ? 0.5 : type.key === 'sun' ? 2.5 : 0,
      armTick: type.key === 'bomb' ? PLANT_TYPES.bomb.armTime : 0
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
    this.drawEffects(ctx);
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
    ctx.fillText('沃沃避难所', 34, 48);

    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '18px sans-serif';
    ctx.fillText('守住左侧避难所，挡住全部来袭怪物', 34, 74);

    ctx.fillStyle = '#ffe179';
    this.roundRect(ctx, this.app.width - 300, 28, 112, 46, 16, true);
    ctx.fillStyle = '#493300';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('能量 ' + this.sun, this.app.width - 284, 58);

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
      this.drawSprite(ctx, plant.sprite, card.x + 10, card.y + 10, 54, 54, plant.color);

      ctx.fillStyle = selected ? '#1a2b12' : '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(plant.name, card.x + 68, card.y + 30);
      ctx.font = '18px sans-serif';
      ctx.fillText('消耗 ' + plant.cost, card.x + 68, card.y + 56);
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
    ctx.fillText('每 3.5 秒获得 30 能量', this.layout.infoCard.x + 18, this.layout.infoCard.y + 114);
  }

  drawEffects(ctx) {
    this.effects.forEach((effect) => {
      if (effect.type === 'explosion') {
        const ratio = Math.max(0, Math.min(1, effect.tick / effect.total));
        const radius = effect.radius * (1.1 - ratio * 0.45);
        ctx.fillStyle = 'rgba(255, 140, 80, ' + (0.45 * ratio) + ')';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  drawPlants(ctx) {
    this.plants.forEach((plant) => {
      const spec = PLANT_TYPES[plant.type];
      const size = plant.type === 'wall' ? 68 : plant.type === 'bomb' ? 62 : 58;
      this.drawSprite(ctx, spec.sprite, plant.x - size / 2, plant.y - size / 2, size, size, spec.color);

      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(plant.x - 24, plant.y + 28, 48, 6);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(plant.x - 24, plant.y + 28, 48, 6);
      ctx.fillStyle = '#63f57b';
      const maxHp = PLANT_TYPES[plant.type].hp;
      ctx.fillRect(plant.x - 24, plant.y + 28, (48 * Math.max(0, plant.hp)) / maxHp, 6);

      if (plant.type === 'bomb' && plant.armTick > 0) {
        ctx.fillStyle = 'rgba(15, 25, 16, 0.7)';
        this.roundRect(ctx, plant.x - 24, plant.y - 44, 48, 18, 9, true);
        ctx.fillStyle = '#fffbe3';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('准备', plant.x, plant.y - 30);
      }
    });
  }

  drawBullets(ctx) {
    this.bullets.forEach((bullet) => {
      ctx.fillStyle = bullet.color || '#2d7a36';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawEnemies(ctx) {
    this.enemies.forEach((enemy) => {
      const tint = enemy.type === 'armored' ? '#6d6f88' : enemy.type === 'tank' ? '#8b6e63' : '#7f6b63';
      const size = Math.max(enemy.width, enemy.height) + 18;
      this.drawSprite(ctx, enemy.sprite, enemy.x - size / 2, enemy.y - size / 2, size, size, tint);

      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.fillRect(enemy.x - 28, enemy.y + enemy.height / 2 + 10, 56, 6);
      ctx.fillStyle = '#63f57b';
      const hpBase = enemy.baseHp || enemy.hp;
      ctx.fillRect(enemy.x - 28, enemy.y + enemy.height / 2 + 10, (56 * Math.max(0, enemy.hp)) / Math.max(1, hpBase), 6);

      if (enemy.slowTick && enemy.slowTick > 0) {
        ctx.fillStyle = 'rgba(73, 184, 255, 0.35)';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, size * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
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
    const isTabletLike = width >= 1024 || width / Math.max(1, height) < 1.45;
    const sidebarWidth = isTabletLike ? 220 : 170;
    const cardHeight = isTabletLike ? 68 : 74;
    const cardGap = isTabletLike ? 12 : 14;
    const cardStartY = 122;
    const cards = ['sun', 'shooter', 'wall', 'ice', 'bomb'].map((type, index) => ({
      x: 24,
      y: cardStartY + index * (cardHeight + cardGap),
      width: sidebarWidth,
      height: cardHeight,
      type
    }));
    const infoTop = cardStartY + cards.length * (cardHeight + cardGap) + 10;
    const infoHeight = Math.max(112, Math.min(150, height - infoTop - 28));
    const boardX = sidebarWidth + 52;
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
      sidebarWidth,
      boardRect: { x: boardX, y: boardY, width: boardWidth, height: boardHeight },
      backButton: { x: width - 170, y: 28, width: 132, height: 46 },
      seedCards: cards,
      infoCard: { x: 24, y: infoTop, width: sidebarWidth, height: infoHeight },
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

  drawSprite(ctx, spriteKey, x, y, width, height, fallbackColor) {
    const img = this.app.assets && this.app.assets.getImage ? this.app.assets.getImage(spriteKey) : null;
    if (img) {
      ctx.drawImage(img, x, y, width, height);
      return;
    }
    ctx.fillStyle = fallbackColor || '#ffffff';
    ctx.beginPath();
    ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  explodeAt(x, y, radiusPx, damage) {
    this.effects.push({ type: 'explosion', x, y, radius: radiusPx, tick: 0.32, total: 0.32 });
    this.enemies.forEach((enemy) => {
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= radiusPx) {
        const ratio = 1 - d / Math.max(1, radiusPx);
        enemy.hp -= Math.round(damage * (0.55 + ratio * 0.45));
      }
    });
  }

  getEnemyStats(type) {
    if (type === 'fast') {
      return { hp: 64, speed: 40, damage: 8, width: 50, height: 62, sprite: 'enemyFast' };
    }
    if (type === 'armored') {
      return { hp: 150, speed: 19, damage: 15, width: 62, height: 74, sprite: 'enemyArmored' };
    }
    if (type === 'tank') {
      return { hp: 250, speed: 13, damage: 18, width: 70, height: 78, sprite: 'enemyTank' };
    }
    return { hp: 88, speed: 26, damage: 9, width: 54, height: 66, sprite: 'enemyZombie' };
  }
}

module.exports = PlantGuardWar;
