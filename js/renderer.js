/**
 * 坦克大战 EVO — Canvas渲染器
 */

const C = require('./config.js');

class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  clear() {
    this.ctx.fillStyle = '#0a0a16';
    this.ctx.fillRect(0, 0, C.GAME_WIDTH, C.GAME_HEIGHT);
  }

  /** 绘制地图 */
  drawMap(mapData) {
    const ctx = this.ctx;
    for (let r = 0; r < C.MAP_ROWS; r++) {
      for (let c = 0; c < C.MAP_COLS; c++) {
        const x = c * C.CELL_SIZE;
        const y = r * C.CELL_SIZE;
        const tile = mapData[r][c];
        this._drawTile(ctx, x, y, tile);
      }
    }
  }

  _drawTile(ctx, x, y, tile) {
    const s = C.CELL_SIZE - 1;
    switch (tile) {
      case '#': // 砖块
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(x + 1, y + 1, s - 1, s - 1);
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(x + 1, y + 1, s - 1, s / 2);
        ctx.strokeStyle = '#6b3410';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
        break;
      case 'S': // 钢铁
        ctx.fillStyle = '#667788';
        ctx.fillRect(x + 1, y + 1, s - 1, s - 1);
        ctx.fillStyle = '#8899aa';
        ctx.fillRect(x + 3, y + 3, s - 5, s - 5);
        ctx.strokeStyle = '#445566';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
        // 铆钉
        ctx.fillStyle = '#334455';
        ctx.beginPath(); ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + s - 5, y + 6, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 6, y + s - 5, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + s - 5, y + s - 5, 2, 0, Math.PI * 2); ctx.fill();
        break;
      case 'W': // 水域
        ctx.fillStyle = '#1a5588';
        ctx.fillRect(x, y, s + 1, s + 1);
        ctx.strokeStyle = '#3388cc';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + C.CELL_SIZE / 2);
        ctx.lineTo(x + C.CELL_SIZE / 3, y + C.CELL_SIZE / 2 - 4);
        ctx.lineTo(x + C.CELL_SIZE * 2 / 3, y + C.CELL_SIZE / 2 + 4);
        ctx.lineTo(x + s - 2, y + C.CELL_SIZE / 2);
        ctx.stroke();
        break;
      case 'G': // 草地
        ctx.fillStyle = '#1d4518';
        ctx.fillRect(x, y, s + 1, s + 1);
        ctx.fillStyle = '#2d6a24';
        for (let i = 0; i < 8; i++) {
          ctx.fillRect(x + 3 + (i * 6) % (s - 5), y + 3 + (i * 4) % (s - 5), 2, 6);
        }
        break;
      case 'B': // 水晶
        ctx.fillStyle = '#1a0a0a';
        ctx.fillRect(x, y, s + 1, s + 1);
        const grad = ctx.createRadialGradient(x + C.CELL_SIZE / 2, y + C.CELL_SIZE / 2, 0, x + C.CELL_SIZE / 2, y + C.CELL_SIZE / 2, s / 2);
        grad.addColorStop(0, '#ff6688');
        grad.addColorStop(0.5, '#cc2244');
        grad.addColorStop(1, '#660011');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x + C.CELL_SIZE / 2, y + 3);
        ctx.lineTo(x + s - 3, y + C.CELL_SIZE / 2);
        ctx.lineTo(x + C.CELL_SIZE / 2, y + s - 3);
        ctx.lineTo(x + 3, y + C.CELL_SIZE / 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ff88aa';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      default:
        // 空地
        ctx.fillStyle = '#111125';
        ctx.fillRect(x, y, s + 1, s + 1);
        ctx.strokeStyle = '#181830';
        ctx.lineWidth = 0.3;
        ctx.strokeRect(x, y, s + 1, s + 1);
    }
  }

  /** 绘制坦克 */
  drawTank(x, y, dir, color, isPlayer) {
    const ctx = this.ctx;
    const hw = C.TANK_SIZE / 2;
    const cx = x + C.CELL_SIZE / 2;
    const cy = y + C.CELL_SIZE / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * Math.PI / 2);

    // 车身
    ctx.fillStyle = color;
    ctx.fillRect(-hw, -hw + 4, C.TANK_SIZE, C.TANK_SIZE - 8);
    // 履带
    ctx.fillStyle = '#333';
    ctx.fillRect(-hw, -hw, C.TANK_SIZE, 6);
    ctx.fillRect(-hw, hw - 6, C.TANK_SIZE, 6);
    // 炮塔
    ctx.fillStyle = isPlayer ? '#44dd44' : '#dd4444';
    ctx.beginPath();
    ctx.arc(0, 0, hw * 0.5, 0, Math.PI * 2);
    ctx.fill();
    // 炮管
    ctx.fillStyle = '#888';
    ctx.fillRect(-3, -hw, 6, hw * 0.6);

    ctx.restore();
  }

  /** 绘制炮弹 */
  drawBullet(x, y) {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x + C.CELL_SIZE / 2, y + C.CELL_SIZE / 2, C.BULLET_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x + C.CELL_SIZE / 2, y + C.CELL_SIZE / 2, C.BULLET_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 绘制能量罐 */
  drawEnergyCan(x, y) {
    const ctx = this.ctx;
    const cx = x + C.CELL_SIZE / 2;
    const cy = y + C.CELL_SIZE / 2;
    ctx.fillStyle = '#0d3d1a';
    ctx.fillRect(x, y, C.CELL_SIZE, C.CELL_SIZE);
    ctx.fillStyle = '#00cc66';
    ctx.beginPath();
    ctx.arc(cx, cy, C.CELL_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 1, C.CELL_SIZE / 6, 0, Math.PI * 2);
    ctx.fill();
  }

  /** 绘制道具 */
  drawPowerup(x, y, type) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(240, 192, 64, 0.3)';
    ctx.fillRect(x + 2, y + 2, C.CELL_SIZE - 4, C.CELL_SIZE - 4);
    ctx.fillStyle = '#f0c040';
    ctx.font = `${C.CELL_SIZE * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(type, x + C.CELL_SIZE / 2, y + C.CELL_SIZE / 2 + 6);
  }

  /** 绘制HUD */
  drawHUD(level, enemiesLeft, playerHP, fireLevel, powerups) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, C.GAME_WIDTH, 28);

    ctx.fillStyle = '#f0c040';
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第${level}关`, 10, 20);

    ctx.fillStyle = '#ff6666';
    ctx.fillText(`敌人: ${enemiesLeft}`, 120, 20);

    ctx.fillStyle = '#44dd44';
    ctx.fillText(`HP: ${'❤️'.repeat(playerHP)}`, 240, 20);

    ctx.fillStyle = '#f0c040';
    ctx.fillText(`火力: Lv${fireLevel}`, 380, 20);

    // 道具栏
    if (powerups && powerups.length > 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif';
      ctx.fillText('道具:', 500, 20);
      powerups.forEach((p, i) => {
        ctx.fillText(p.icon || '?', 545 + i * 28, 20);
      });
    }
  }

  /** 绘制游戏结束 */
  drawGameOver(won) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, C.GAME_WIDTH, C.GAME_HEIGHT);

    ctx.fillStyle = won ? '#44dd44' : '#ff4444';
    ctx.font = 'bold 48px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(won ? '🎉 胜利!' : '💀 失败', C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2 - 20);

    ctx.fillStyle = '#fff';
    ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('点击重新开始', C.GAME_WIDTH / 2, C.GAME_HEIGHT / 2 + 30);
  }
}

module.exports = Renderer;
