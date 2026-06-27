/**
 * 坦克大战 EVO — 游戏主逻辑
 */

const C = require('./config.js');
const Tank = require('./tank.js');
const Renderer = require('./renderer.js');
const { MAPS } = require('./mapdata.js');

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(canvas, this.ctx);
    this.state = C.STATE.MENU;

    // 游戏数据
    this.currentLevel = 1;
    this.chapter = 1;
    this.energyCans = 2;
    this.mapData = null;
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];
    this.energyCanPositions = [];
    this.liquidTiles = new Set(); // 液体格子 "r,c"

    // 输入
    this.keys = {};
    this.touchDir = null;
    this.touchFire = false;

    // 时间
    this.lastTime = 0;
    this.enemySpawnTimer = 0;
    this.enemiesToSpawn = 0;
    this.enemiesSpawned = 0;
    this.totalEnemies = 0;

    this._bindInput();
  }

  /** 绑定输入 */
  _bindInput() {
    // 键盘
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (e.key === ' ' || e.key === 'j') this.touchFire = true;
    });
    window.addEventListener('keyup', e => {
      this.keys[e.key] = false;
      if (e.key === ' ' || e.key === 'j') this.touchFire = false;
    });

    // 触摸
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this._handleTouch(e.touches[0]);
    });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      this._handleTouch(e.touches[0]);
    });
    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this.touchDir = null;
      this.touchFire = false;
    });

    // 鼠标（PC调试）
    this.canvas.addEventListener('mousedown', e => {
      this._handleMouse(e);
    });
    this.canvas.addEventListener('mousemove', e => {
      if (e.buttons) this._handleMouse(e);
    });
    this.canvas.addEventListener('mouseup', () => {
      this.touchDir = null;
      this.touchFire = false;
    });

    // 点击重新开始
    this.canvas.addEventListener('click', () => {
      if (this.state === C.STATE.GAMEOVER || this.state === C.STATE.VICTORY) {
        this.startLevel(this.currentLevel);
      }
    });
  }

  _handleTouch(touch) {
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // 右半屏 = 射击
    if (x > C.GAME_WIDTH * 0.6) {
      this.touchFire = true;
      this.touchDir = null;
      return;
    }

    // 左半屏 = 移动（虚拟摇杆）
    const cx = C.GAME_WIDTH * 0.25;
    const cy = C.GAME_HEIGHT * 0.75;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) {
      this.touchDir = null;
    } else if (Math.abs(dx) > Math.abs(dy)) {
      this.touchDir = dx > 0 ? C.DIR.RIGHT : C.DIR.LEFT;
    } else {
      this.touchDir = dy > 0 ? C.DIR.DOWN : C.DIR.UP;
    }
  }

  _handleMouse(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x > C.GAME_WIDTH * 0.6) {
      this.touchFire = true;
    } else {
      const cx = C.GAME_WIDTH * 0.25;
      const cy = C.GAME_HEIGHT * 0.75;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        this.touchDir = null;
      } else if (Math.abs(dx) > Math.abs(dy)) {
        this.touchDir = dx > 0 ? C.DIR.RIGHT : C.DIR.LEFT;
      } else {
        this.touchDir = dy > 0 ? C.DIR.DOWN : C.DIR.UP;
      }
    }
  }

  /** 获取键盘方向 */
  _getKeyDir() {
    if (this.keys['ArrowUp'] || this.keys['w']) return C.DIR.UP;
    if (this.keys['ArrowDown'] || this.keys['s']) return C.DIR.DOWN;
    if (this.keys['ArrowLeft'] || this.keys['a']) return C.DIR.LEFT;
    if (this.keys['ArrowRight'] || this.keys['d']) return C.DIR.RIGHT;
    return null;
  }

  /** 开始关卡 */
  startLevel(levelNum) {
    this.currentLevel = levelNum;
    this.chapter = Math.min(6, Math.ceil(levelNum / 5));
    this.energyCans = C.ENERGY_CANS_PER_CHAPTER[this.chapter];

    // 加载地图
    const map = MAPS[levelNum];
    if (!map) {
      console.error(`Map ${levelNum} not found`);
      return;
    }
    this.mapData = map.map(row => [...row]);

    // 查找玩家出生点
    let pCol = 7, pRow = 14;
    for (let r = 0; r < C.MAP_ROWS; r++) {
      for (let c = 0; c < C.MAP_COLS; c++) {
        if (this.mapData[r][c] === 'P') {
          pCol = c;
          pRow = r;
          this.mapData[r][c] = '.';
        }
      }
    }

    // 创建玩家
    this.player = new Tank(pCol, pRow, C.DIR.UP, 1, true, '#44dd44');

    // 查找敌人出生点
    this.enemies = [];
    this.enemiesToSpawn = 0;
    this.enemiesSpawned = 0;
    for (let c = 0; c < C.MAP_COLS; c++) {
      const tile = this.mapData[0][c];
      if (tile >= '1' && tile <= '4') {
        this.enemiesToSpawn++;
        this.mapData[0][c] = '.';
      }
    }
    this.totalEnemies = this.enemiesToSpawn;
    this.enemySpawnTimer = 2; // 2秒后开始刷敌

    // 生成能量罐
    this._spawnEnergyCans();

    // 清除旧状态
    this.bullets = [];
    this.powerups = [];
    this.liquidTiles.clear();

    this.state = C.STATE.PLAYING;
    this.lastTime = performance.now();
  }

  /** 生成能量罐 */
  _spawnEnergyCans() {
    this.energyCanPositions = [];
    const brickPositions = [];
    for (let r = 1; r < C.MAP_ROWS - 1; r++) {
      for (let c = 1; c < C.MAP_COLS - 1; c++) {
        if (this.mapData[r][c] === '#') {
          brickPositions.push({ r, c });
        }
      }
    }
    // 随机选择
    const shuffled = brickPositions.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(this.energyCans, shuffled.length); i++) {
      this.energyCanPositions.push(shuffled[i]);
    }
  }

  /** 主更新循环 */
  update(timestamp) {
    if (this.state !== C.STATE.PLAYING) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // 输入处理
    const keyDir = this._getKeyDir();
    const moveDir = this.touchDir !== null ? this.touchDir : keyDir;
    this.player.setMoveDir(moveDir);
    if (this.touchFire || this.keys[' '] || this.keys['j']) {
      this._playerFire();
    }

    // 更新玩家
    this.player.update(dt);
    this._clampToGrid(this.player);

    // 刷敌
    this._spawnEnemies(dt);

    // 更新敌人
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this._updateEnemyAI(enemy, dt);
      enemy.update(dt);
      this._clampToGrid(enemy);
    }

    // 更新炮弹
    this._updateBullets(dt);

    // 碰撞检测
    this._checkCollisions();

    // 胜利/失败检测
    this._checkWinLose();
  }

  /** 玩家开火 */
  _playerFire() {
    const bullets = this.player.tryFire();
    if (!bullets) return;
    for (const b of bullets) {
      this.bullets.push({
        col: b.col,
        row: b.row,
        dir: b.dir,
        x: b.col * C.CELL_SIZE,
        y: b.row * C.CELL_SIZE,
        isPlayer: true,
        oneShot: this.player.oneShot && this.player.oneShotCount > 0,
      });
    }
    if (this.player.oneShot && this.player.oneShotCount > 0) {
      this.player.oneShotCount--;
      if (this.player.oneShotCount <= 0) this.player.oneShot = false;
    }
  }

  /** 刷敌 */
  _spawnEnemies(dt) {
    if (this.enemiesSpawned >= this.totalEnemies) return;
    if (this.enemies.length >= 5) return; // 最多5个同时在场

    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.enemySpawnTimer = 3 + Math.random() * 2;

      // 随机选敌人类型
      const types = this._getEnemyTypesForLevel();
      const type = types[Math.floor(Math.random() * types.length)];
      const cfg = C.ENEMY_TYPES[type];

      // 随机出生列（顶部row=0）
      const spawnCol = Math.floor(Math.random() * 13) + 1;
      const enemy = new Tank(spawnCol, 0, C.DIR.DOWN, cfg.fireLevel, false, cfg.color);
      enemy.hp = cfg.hp;
      enemy.maxHp = cfg.hp;
      enemy.speed = cfg.speed;
      enemy.fireRate = cfg.fireRate;
      enemy.type = type;
      enemy.score = cfg.score;

      this.enemies.push(enemy);
      this.enemiesSpawned++;
    }
  }

  _getEnemyTypesForLevel() {
    if (this.chapter <= 1) return ['1', '2'];
    if (this.chapter <= 3) return ['1', '2', '3'];
    return ['1', '2', '3', '4'];
  }

  /** 简易敌人AI */
  _updateEnemyAI(enemy, dt) {
    // 随机改变方向
    if (Math.random() < 0.02) {
      enemy.setMoveDir(Math.floor(Math.random() * 4));
    }

    // 向水晶方向移动（概率性）
    if (Math.random() < 0.03) {
      const dx = 7 - enemy.col;
      const dy = 14 - enemy.row;
      if (Math.abs(dx) > Math.abs(dy)) {
        enemy.setMoveDir(dx > 0 ? C.DIR.RIGHT : C.DIR.LEFT);
      } else {
        enemy.setMoveDir(dy > 0 ? C.DIR.DOWN : C.DIR.UP);
      }
    }

    // 开火
    if (Math.random() < 0.05 * dt * 60) {
      const bullets = enemy.tryFire();
      if (bullets) {
        for (const b of bullets) {
          this.bullets.push({
            col: b.col, row: b.row, dir: b.dir,
            x: b.col * C.CELL_SIZE, y: b.row * C.CELL_SIZE,
            isPlayer: false, oneShot: false,
          });
        }
      }
    }
  }

  /** 更新炮弹 */
  _updateBullets(dt) {
    for (const bullet of this.bullets) {
      const vec = C.DIR_VECTORS[bullet.dir];
      bullet.x += vec.dx * C.BULLET_SPEED * dt;
      bullet.y += vec.dy * C.BULLET_SPEED * dt;
      bullet.col = Math.round(bullet.x / C.CELL_SIZE);
      bullet.row = Math.round(bullet.y / C.CELL_SIZE);
    }

    // 移除出界的炮弹
    this.bullets = this.bullets.filter(b =>
      b.col >= 0 && b.col < C.MAP_COLS && b.row >= 0 && b.row < C.MAP_ROWS
    );
  }

  /** 碰撞检测 */
  _checkCollisions() {
    const bulletsToRemove = new Set();
    const enemiesToRemove = new Set();

    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      if (bulletsToRemove.has(i)) continue;

      const tile = this.mapData[b.row] ? this.mapData[b.row][b.col] : null;
      if (!tile) { bulletsToRemove.add(i); continue; }

      const firer = b.isPlayer ? this.player : null;
      const canBreak = firer ? firer.canBreak : ['W', '#', 'S', 'G'];

      // 检查地图碰撞
      if (tile === C.TILE_BRICK && canBreak.includes('#')) {
        this.mapData[b.row][b.col] = C.TILE_EMPTY;
        // 如果是能量罐位置, 掉落道具
        this._checkEnergyCanHit(b.row, b.col);
        bulletsToRemove.add(i);
        continue;
      }
      if (tile === C.TILE_STEEL && canBreak.includes('S')) {
        this.mapData[b.row][b.col] = C.TILE_EMPTY;
        bulletsToRemove.add(i);
        continue;
      }
      if (tile === C.TILE_GRASS && canBreak.includes('G')) {
        this.mapData[b.row][b.col] = C.TILE_EMPTY;
        bulletsToRemove.add(i);
        continue;
      }
      if (tile === C.TILE_STEEL || tile === C.TILE_BRICK) {
        bulletsToRemove.add(i);
        continue;
      }
      if (tile === C.TILE_CRYSTAL) {
        this.state = C.STATE.GAMEOVER;
        return;
      }

      // 检查是否击中玩家
      if (!b.isPlayer && this.player.alive) {
        if (b.col === this.player.col && b.row === this.player.row) {
          const dead = this.player.takeDamage(b.oneShot ? 99 : 1);
          bulletsToRemove.add(i);
          if (dead) {
            this.state = C.STATE.GAMEOVER;
            return;
          }
        }
      }

      // 检查是否击中敌人
      if (b.isPlayer) {
        for (let j = 0; j < this.enemies.length; j++) {
          const enemy = this.enemies[j];
          if (!enemy.alive) continue;
          if (b.col === enemy.col && b.row === enemy.row) {
            const dead = enemy.takeDamage(b.oneShot ? 99 : 1);
            bulletsToRemove.add(i);
            if (dead) {
              enemiesToRemove.add(j);
              // 30%概率掉落道具
              if (Math.random() < 0.3 || enemy.type === '4') {
                this._dropPowerup(enemy.col, enemy.row);
              }
            }
            break;
          }
        }
      }
    }

    // 清理
    this.bullets = this.bullets.filter((_, i) => !bulletsToRemove.has(i));
    this.enemies = this.enemies.filter((_, i) => !enemiesToRemove.has(i));
  }

  /** 检查是否击中能量罐 */
  _checkEnergyCanHit(row, col) {
    const idx = this.energyCanPositions.findIndex(p => p.r === row && p.c === col);
    if (idx >= 0) {
      this.energyCanPositions.splice(idx, 1);
      // 掉落道具
      this._dropPowerup(row, col);
      // 留下液体
      this.liquidTiles.add(`${row},${col}`);
    }
  }

  /** 掉落道具 */
  _dropPowerup(row, col) {
    const types = ['star', 'star', 'green_star', 'shield', 'speed', 'scatter', 'bomb'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerups.push({ row, col, type });
  }

  /** 拾取道具 */
  _pickupPowerup(row, col) {
    const idx = this.powerups.findIndex(p => p.row === row && p.col === col);
    if (idx < 0) return;
    const p = this.powerups[idx];
    this.powerups.splice(idx, 1);

    const result = this.player.applyPowerup(C.POWERUP_TYPES[p.type]?.effect);
    if (result === 'bomb') {
      // 炸弹: 消灭所有敌人
      this.enemies.forEach(e => { e.alive = false; });
      this.enemies = [];
    } else if (result === 'teleport') {
      // 传送: 随机安全位置
      this.player.col = 1 + Math.floor(Math.random() * 13);
      this.player.row = 1 + Math.floor(Math.random() * 12);
      this.player.x = this.player.col * C.CELL_SIZE;
      this.player.y = this.player.row * C.CELL_SIZE;
    } else if (result === 'slowTime') {
      // 减速所有敌人
      this.enemies.forEach(e => { e.speed *= 0.5; });
    }
  }

  /** 将坦克限制在网格内 */
  _clampToGrid(tank) {
    tank.col = Math.max(0, Math.min(C.MAP_COLS - 1, tank.col));
    tank.row = Math.max(0, Math.min(C.MAP_ROWS - 1, tank.row));

    // 碰撞检测：不能进入砖块/钢铁/水域/水晶
    const tile = this.mapData[tank.row][tank.col];
    const blocked = [C.TILE_BRICK, C.TILE_STEEL, C.TILE_WATER, C.TILE_CRYSTAL];
    if (blocked.includes(tile)) {
      // 回退
      tank.x = tank.col * C.CELL_SIZE;
      tank.y = tank.row * C.CELL_SIZE;
    }

    // 液体检测
    if (this.liquidTiles.has(`${tank.row},${tank.col}`)) {
      // 滑到下一格
      const vec = C.DIR_VECTORS[tank.dir];
      const nr = tank.row + vec.dy;
      const nc = tank.col + vec.dx;
      if (nr >= 0 && nr < C.MAP_ROWS && nc >= 0 && nc < C.MAP_COLS) {
        const nt = this.mapData[nr][nc];
        if (!blocked.includes(nt)) {
          tank.row = nr;
          tank.col = nc;
          tank.x = nc * C.CELL_SIZE;
          tank.y = nr * C.CELL_SIZE;
        }
      }
    }

    // 拾取道具
    this._pickupPowerup(tank.row, tank.col);
  }

  /** 胜利/失败检测 */
  _checkWinLose() {
    // 检查水晶
    if (this.mapData[14][7] !== C.TILE_CRYSTAL) {
      this.state = C.STATE.GAMEOVER;
      return;
    }

    // 检查是否全部敌人被消灭
    const aliveEnemies = this.enemies.filter(e => e.alive).length;
    if (this.enemiesSpawned >= this.totalEnemies && aliveEnemies === 0) {
      this.state = C.STATE.VICTORY;
    }
  }

  /** 渲染 */
  render() {
    this.renderer.clear();

    if (this.state === C.STATE.MENU) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 36px "PingFang SC","Microsoft YaHei",sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('🎮 坦克大战 EVO', C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2 - 30);
      this.ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
      this.ctx.fillText('点击屏幕开始游戏', C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2 + 20);
      this.ctx.fillText('WASD/方向键 移动 | 空格/J 射击', C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2 + 50);
      return;
    }

    if (!this.mapData) return;

    // 绘制地图
    this.renderer.drawMap(this.mapData);

    // 绘制能量罐
    for (const pos of this.energyCanPositions) {
      this.renderer.drawEnergyCan(pos.c * C.CELL_SIZE, pos.r * C.CELL_SIZE);
    }

    // 绘制液体
    for (const key of this.liquidTiles) {
      const [r, c] = key.split(',').map(Number);
      this.ctx.fillStyle = 'rgba(0, 255, 100, 0.3)';
      this.ctx.fillRect(c * C.CELL_SIZE, r * C.CELL_SIZE, C.CELL_SIZE, C.CELL_SIZE);
    }

    // 绘制道具
    for (const p of this.powerups) {
      this.renderer.drawPowerup(p.col * C.CELL_SIZE, p.row * C.CELL_SIZE, C.POWERUP_TYPES[p.type]?.icon || '?');
    }

    // 绘制敌人
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.renderer.drawTank(enemy.x, enemy.y, enemy.dir, enemy.color, false);
    }

    // 绘制玩家
    if (this.player && this.player.alive) {
      this.renderer.drawTank(this.player.x, this.player.y, this.player.dir, '#9955dd', true);
    }

    // 绘制炮弹
    for (const b of this.bullets) {
      this.renderer.drawBullet(b.x, b.y);
    }

    // HUD
    const aliveEnemies = this.enemies.filter(e => e.alive).length;
    const totalLeft = this.totalEnemies - this.enemiesSpawned + aliveEnemies;
    this.renderer.drawHUD(
      this.currentLevel,
      totalLeft,
      this.player ? this.player.hp : 0,
      this.player ? this.player.fireLevel : 1,
      []
    );

    // 结束画面
    if (this.state === C.STATE.GAMEOVER) {
      this.renderer.drawGameOver(false);
    } else if (this.state === C.STATE.VICTORY) {
      this.renderer.drawGameOver(true);
    }
  }

  /** 主循环 */
  run() {
    const loop = (timestamp) => {
      this.update(timestamp);
      this.render();
      requestAnimationFrame(loop);
    };

    // 点击开始
    const startOnClick = () => {
      if (this.state === C.STATE.MENU) {
        this.startLevel(1);
        this.canvas.removeEventListener('click', startOnClick);
      }
    };
    this.canvas.addEventListener('click', startOnClick);

    requestAnimationFrame(loop);
  }
}

module.exports = Game;
