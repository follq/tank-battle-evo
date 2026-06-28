// 精灵资源加载器 - 全部素材来自参考图
var Sprites = {};
var SpriteLoaded = false;
var SpriteLoadPromise = null;
var SPRITE_BASE = 'res/sprites/';

function loadSprites() {
  if (SpriteLoadPromise) return SpriteLoadPromise;
  
  var toLoad = {};
  
  // 地图瓦片 (7种)
  var tileNames = ['brick', 'steel', 'water', 'grass', 'crystal', 'energy_can', 'liquid'];
  for (var i = 0; i < tileNames.length; i++) {
    toLoad['tile_' + tileNames[i]] = SPRITE_BASE + 'tiles/' + tileNames[i] + '.png';
  }
  
  // 玩家坦克 (6色 × 4类型 = 24个, 来自参考图)
  var tankTypes = ['armored', 'light', 'medium', 'heavy'];
  var tankColors = ['purple', 'red', 'white', 'black', 'blue', 'pink'];
  var ts = Date.now();
  for (var i = 0; i < tankTypes.length; i++) {
    for (var j = 0; j < tankColors.length; j++) {
      var key = 'tank_' + tankTypes[i] + '_' + tankColors[j];
      toLoad[key] = SPRITE_BASE + 'tanks/' + tankTypes[i] + '_' + tankColors[j] + '.png?v=' + ts;
    }
  }
  
  // 敌人坦克 (4种类型)
  var enemyTypes = ['armored', 'light', 'medium', 'heavy'];
  for (var i = 0; i < enemyTypes.length; i++) {
    toLoad['enemy_' + enemyTypes[i]] = SPRITE_BASE + 'tanks/enemy_' + enemyTypes[i] + '.png?v=' + Date.now();
  }
  
  // 道具图标 (11种)
  var pwNames = ['fireUp', 'fireDown', 'shield', 'speedUp', 'scatter', 'bomb', 'invisible', 'freeze', 'teleport', 'oneShot', 'freezeTime'];
  for (var i = 0; i < pwNames.length; i++) {
    toLoad['pw_' + pwNames[i]] = SPRITE_BASE + 'powerups/' + pwNames[i] + '.png';
  }
  
  // UI元素
  toLoad['ui_bg'] = SPRITE_BASE + 'ui/bg.png?v=' + Date.now();
  toLoad['ui_border'] = SPRITE_BASE + 'ui/border.png?v=' + Date.now();
  
  // 子弹素材 (4级火力 bullet_1~bullet_4)
  for (var i = 1; i <= 4; i++) {
    toLoad['bullet_' + i] = SPRITE_BASE + 'fx/bullet_' + i + '.png?v=' + Date.now();
  }
  
  var promises = [];
  var keys = Object.keys(toLoad);
  for (var i = 0; i < keys.length; i++) {
    (function(key, src) {
      var p = new Promise(function(resolve) {
        var img = new Image();
        img.onload = function() { Sprites[key] = img; resolve(); };
        img.onerror = function() { Sprites[key] = null; resolve(); };
        img.src = src;
      });
      promises.push(p);
    })(keys[i], toLoad[keys[i]]);
  }
  
  SpriteLoadPromise = Promise.all(promises).then(function() {
    SpriteLoaded = true;
    var loaded = 0;
    for (var i = 0; i < keys.length; i++) { if (Sprites[keys[i]] !== null) loaded++; }
    console.log('Sprites loaded: ' + loaded + '/' + keys.length);
  });
  
  return SpriteLoadPromise;
}

function getSprite(key) { return Sprites[key] || null; }
function isSpritesReady() { return SpriteLoaded; }

// 按长边等比缩放, 居中绘制
function fitDraw(ctx, sprite, x, y, size) {
  var iw = sprite.width, ih = sprite.height;
  var scale = size / Math.max(iw, ih);
  var sw = iw * scale, sh = ih * scale;
  var ox = x + (size - sw) / 2, oy = y + (size - sh) / 2;
  ctx.drawImage(sprite, ox, oy, sw, sh);
}

// 绘制地图瓦片
function drawTileSprite(ctx, tileType, x, y, size) {
  var sprite = getSprite('tile_' + tileType);
  if (sprite) fitDraw(ctx, sprite, x, y, size);
}

// 玩家坦克类型名映射
var PLAYER_TANK_TYPES = ['armored', 'light', 'medium', 'heavy'];
// 玩家坦克颜色名映射 (对应EVA 6色)
var PLAYER_TANK_COLORS = ['purple', 'red', 'white', 'black', 'blue', 'pink'];

// 获取坦克精灵 (玩家按颜色索引, 敌人用enemy_前缀)
function getTankSprite(tk) {
  if (tk.isEnemy) {
    var enemyTypeIdx = Math.min(tk.fl || 0, 3);
    return getSprite('enemy_' + PLAYER_TANK_TYPES[enemyTypeIdx]);
  }
  var typeIdx = Math.min(tk.fl || 0, 3);
  var colorIdx = (tk.colorIdx !== undefined) ? Math.min(tk.colorIdx, 5) : 0;
  return getSprite('tank_' + PLAYER_TANK_TYPES[typeIdx] + '_' + PLAYER_TANK_COLORS[colorIdx]);
}

// 绘制坦克 (带旋转)
function drawTankSprite(ctx, tk, size) {
  var sprite = getTankSprite(tk);
  if (sprite) {
    var iw = sprite.width, ih = sprite.height;
    var scale = size / Math.max(iw, ih);
    var sw = iw * scale, sh = ih * scale;
    ctx.save();
    ctx.translate(tk.x, tk.y);
    ctx.rotate((tk.dir || 0) * Math.PI / 2);
    ctx.drawImage(sprite, -sw/2, -sh/2, sw, sh);
    ctx.restore();
  }
}

// 绘制道具
function drawPowerupSprite(ctx, effect, x, y, size) {
  var sprite = getSprite('pw_' + effect);
  if (sprite) fitDraw(ctx, sprite, x, y, size);
}

// 绘制能量罐
function drawCanSprite(ctx, x, y, size) {
  var sprite = getSprite('tile_energy_can');
  if (sprite) fitDraw(ctx, sprite, x, y, size);
}
