/**
 * 坦克大战 EVO — 坦克实体
 */

const C = require('./config.js');

class Tank {
  constructor(col, row, dir, fireLevel, isPlayer, color) {
    this.col = col;          // 网格列
    this.row = row;          // 网格行
    this.x = col * C.CELL_SIZE;
    this.y = row * C.CELL_SIZE;
    this.dir = dir;          // 方向 0=上 1=右 2=下 3=左
    this.fireLevel = fireLevel;
    this.isPlayer = isPlayer;
    this.color = color || '#4488ff';
    this.hp = C.FIRE_LEVELS[fireLevel].hp;
    this.maxHp = this.hp;
    this.speed = C.FIRE_LEVELS[fireLevel].speed;
    this.fireRate = C.FIRE_LEVELS[fireLevel].fireRate;
    this.fireCooldown = 0;
    this.alive = true;
    this.canBreak = [...C.FIRE_LEVELS[fireLevel].canBreak];

    // 移动状态
    this.moving = false;
    this.moveDir = dir;
    this.targetX = this.x;
    this.targetY = this.y;

    // 道具状态
    this.shield = false;
    this.shieldTimer = 0;
    this.scatter = false;
    this.scatterTimer = 0;
    this.speedBoost = false;
    this.speedTimer = 0;
    this.invisible = false;
    this.invisibleTimer = 0;
    this.freeze = false;
    this.freezeTimer = 0;
    this.oneShot = false;
    this.oneShotCount = 0;
  }

  /** 设置移动方向 */
  setMoveDir(dir) {
    if (dir === null || dir === undefined) {
      this.moving = false;
      return;
    }
    this.moving = true;
    this.moveDir = dir;
    this.dir = dir; // 炮口跟随移动方向
  }

  /** 开火 */
  tryFire() {
    if (this.fireCooldown > 0) return null;
    this.fireCooldown = this.fireRate;

    const bullets = [];
    const vec = C.DIR_VECTORS[this.dir];
    const bx = this.col + vec.dx;
    const by = this.row + vec.dy;

    if (this.scatter) {
      // 散射: 3发扇形
      bullets.push({ col: bx, row: by, dir: this.dir });
      bullets.push({ col: bx, row: by, dir: (this.dir + 3) % 4 }); // 左偏
      bullets.push({ col: bx, row: by, dir: (this.dir + 1) % 4 }); // 右偏
    } else {
      bullets.push({ col: bx, row: by, dir: this.dir });
    }

    return bullets;
  }

  /** 更新冷却 */
  update(dt) {
    if (!this.alive) return;

    // 冷却
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // 移动
    if (this.moving) {
      const vec = C.DIR_VECTORS[this.moveDir];
      const spd = this.speedBoost ? this.speed * 2 : this.speed;
      this.x += vec.dx * spd * dt;
      this.y += vec.dy * spd * dt;

      // 对齐到网格
      const targetCol = Math.round(this.x / C.CELL_SIZE);
      const targetRow = Math.round(this.y / C.CELL_SIZE);

      if (Math.abs(this.x - targetCol * C.CELL_SIZE) < 2 &&
          Math.abs(this.y - targetRow * C.CELL_SIZE) < 2) {
        this.col = targetCol;
        this.row = targetRow;
        this.x = this.col * C.CELL_SIZE;
        this.y = this.row * C.CELL_SIZE;
        this.moving = false;
      }
    }

    // 道具计时器
    if (this.shieldTimer > 0) { this.shieldTimer -= dt; if (this.shieldTimer <= 0) this.shield = false; }
    if (this.scatterTimer > 0) { this.scatterTimer -= dt; if (this.scatterTimer <= 0) this.scatter = false; }
    if (this.speedTimer > 0) { this.speedTimer -= dt; if (this.speedTimer <= 0) this.speedBoost = false; }
    if (this.invisibleTimer > 0) { this.invisibleTimer -= dt; if (this.invisibleTimer <= 0) this.invisible = false; }
    if (this.freezeTimer > 0) { this.freezeTimer -= dt; if (this.freezeTimer <= 0) this.freeze = false; }
  }

  /** 受到伤害 */
  takeDamage(amount) {
    if (this.shield) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true; // 死亡
    }
    return false;
  }

  /** 升级火力 */
  upgradeFire() {
    if (this.fireLevel < 3) {
      this.fireLevel++;
      this.hp = C.FIRE_LEVELS[this.fireLevel].hp;
      this.maxHp = this.hp;
      this.speed = C.FIRE_LEVELS[this.fireLevel].speed;
      this.fireRate = C.FIRE_LEVELS[this.fireLevel].fireRate;
      this.canBreak = [...C.FIRE_LEVELS[this.fireLevel].canBreak];
    }
  }

  /** 降级火力 */
  downgradeFire() {
    if (this.fireLevel > 0) {
      this.fireLevel--;
      this.hp = C.FIRE_LEVELS[this.fireLevel].hp;
      this.maxHp = this.hp;
      this.speed = C.FIRE_LEVELS[this.fireLevel].speed;
      this.fireRate = C.FIRE_LEVELS[this.fireLevel].fireRate;
      this.canBreak = [...C.FIRE_LEVELS[this.fireLevel].canBreak];
    }
  }

  /** 应用道具 */
  applyPowerup(effect) {
    switch (effect) {
      case 'fireUp': this.upgradeFire(); break;
      case 'fireDown': this.downgradeFire(); break;
      case 'shield': this.shield = true; this.shieldTimer = 10; break;
      case 'speedUp': this.speedBoost = true; this.speedTimer = 8; break;
      case 'scatter': this.scatter = true; this.scatterTimer = 10; break;
      case 'invisible': this.invisible = true; this.invisibleTimer = 6; break;
      case 'freeze': this.freeze = true; this.freezeTimer = 12; break;
      case 'oneShot': this.oneShot = true; this.oneShotCount = 1; break;
      case 'bomb': return 'bomb'; // 特殊处理
      case 'teleport': return 'teleport';
      case 'slowTime': return 'slowTime';
    }
    return null;
  }
}

module.exports = Tank;
