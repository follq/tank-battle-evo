/**
 * 坦克大战 EVO — 游戏常量配置
 */

// 画布
const GAME_WIDTH = 750;
const GAME_HEIGHT = 750;

// 地图
const MAP_COLS = 15;
const MAP_ROWS = 15;
const CELL_SIZE = GAME_WIDTH / MAP_COLS; // 50px

// 坦克
const TANK_SIZE = CELL_SIZE * 0.8;
const TANK_SPEED = 120; // px/s
const TANK_FAST_SPEED = 200;
const TANK_SLOW_SPEED = 80;

// 炮弹
const BULLET_SPEED = 300;
const BULLET_SIZE = 6;
const FIRE_RATE_FAST = 0.5;  // 秒
const FIRE_RATE_SLOW = 1.0;

// 火力等级对应的坦克属性
const FIRE_LEVELS = {
  0: { name: '装甲车', hp: 1, speed: TANK_FAST_SPEED, fireRate: FIRE_RATE_FAST, canBreak: ['W'] },
  1: { name: '轻坦', hp: 2, speed: TANK_SPEED, fireRate: FIRE_RATE_SLOW, canBreak: ['W', '#'] },
  2: { name: '中坦', hp: 3, speed: TANK_SPEED, fireRate: FIRE_RATE_FAST, canBreak: ['W', '#', 'S'] },
  3: { name: '重坦', hp: 5, speed: TANK_SLOW_SPEED, fireRate: FIRE_RATE_SLOW, canBreak: ['W', '#', 'S', 'G'] },
};

// 敌人配置
const ENEMY_TYPES = {
  '1': { name: '装甲车', fireLevel: 1, hp: 2, speed: TANK_FAST_SPEED, fireRate: FIRE_RATE_FAST, score: 100, color: '#ff6666' },
  '2': { name: '轻坦', fireLevel: 2, hp: 1, speed: TANK_SPEED, fireRate: FIRE_RATE_SLOW, score: 200, color: '#ffaa00' },
  '3': { name: '中坦', fireLevel: 2, hp: 3, speed: TANK_SPEED, fireRate: FIRE_RATE_FAST, score: 300, color: '#ff4444' },
  '4': { name: '重坦', fireLevel: 3, hp: 5, speed: TANK_SLOW_SPEED, fireRate: FIRE_RATE_SLOW, score: 500, color: '#cc0000' },
};

// 地图元素
const TILE_EMPTY = '.';
const TILE_BRICK = '#';
const TILE_STEEL = 'S';
const TILE_WATER = 'W';
const TILE_GRASS = 'G';
const TILE_CRYSTAL = 'B';
const TILE_PLAYER = 'P';

// 能量罐
const ENERGY_CANS_PER_CHAPTER = [0, 2, 2, 3, 4, 5, 5];

// 道具
const POWERUP_TYPES = {
  'star': { name: '火力星', icon: '⭐', effect: 'fireUp', duration: 0, rarity: 'common' },
  'green_star': { name: '降级星', icon: '🟢', effect: 'fireDown', duration: 0, rarity: 'common' },
  'shield': { name: '护盾', icon: '🛡', effect: 'shield', duration: 10, rarity: 'common' },
  'speed': { name: '加速', icon: '⚡', effect: 'speedUp', duration: 8, rarity: 'common' },
  'scatter': { name: '散射', icon: '🔫', effect: 'scatter', duration: 10, rarity: 'rare' },
  'bomb': { name: '炸弹', icon: '💣', effect: 'bomb', duration: 0, rarity: 'rare' },
  'invisible': { name: '隐身', icon: '👻', effect: 'invisible', duration: 6, rarity: 'epic' },
  'freeze': { name: '冰冻弹', icon: '❄', effect: 'freeze', duration: 12, rarity: 'epic' },
  'teleport': { name: '传送', icon: '🌀', effect: 'teleport', duration: 0, rarity: 'legend' },
  'oneshot': { name: '一击必杀', icon: '💀', effect: 'oneShot', duration: 1, rarity: 'legend' },
  'slowtime': { name: '时间减缓', icon: '⏳', effect: 'slowTime', duration: 10, rarity: 'legend' },
};

// 方向
const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
};

const DIR_VECTORS = {
  [DIR.UP]:    { dx: 0,  dy: -1 },
  [DIR.RIGHT]: { dx: 1,  dy: 0 },
  [DIR.DOWN]:  { dx: 0,  dy: 1 },
  [DIR.LEFT]:  { dx: -1, dy: 0 },
};

// 游戏状态
const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
  VICTORY: 'victory',
};

module.exports = {
  GAME_WIDTH, GAME_HEIGHT, MAP_COLS, MAP_ROWS, CELL_SIZE,
  TANK_SIZE, TANK_SPEED, TANK_FAST_SPEED, TANK_SLOW_SPEED,
  BULLET_SPEED, BULLET_SIZE, FIRE_RATE_FAST, FIRE_RATE_SLOW,
  FIRE_LEVELS, ENEMY_TYPES,
  TILE_EMPTY, TILE_BRICK, TILE_STEEL, TILE_WATER, TILE_GRASS, TILE_CRYSTAL, TILE_PLAYER,
  ENERGY_CANS_PER_CHAPTER, POWERUP_TYPES,
  DIR, DIR_VECTORS, STATE,
};
