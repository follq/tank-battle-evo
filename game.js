/**
 * 坦克大战 EVO — 微信小游戏入口（经典模式）
 */
var wx = typeof wx !== 'undefined' ? wx : null;
var isWx = !!wx;

// ============================================================
// 初始化 Canvas
// ============================================================
var cv, ctx, GW, GH, dpr;
if (isWx) {
  var info = wx.getSystemInfoSync();
  dpr = info.pixelRatio || 2;
  GW = info.windowWidth;
  GH = info.windowHeight;
  cv = wx.createCanvas();
  cv.width = GW * dpr;
  cv.height = GH * dpr;
  ctx = cv.getContext('2d');
  ctx.scale(dpr, dpr);
} else {
  // 浏览器调试
  GW = 1254; GH = 1254;
  cv = document.getElementById('gameCanvas');
  if (!cv) {
    cv = document.createElement('canvas');
    cv.id = 'gameCanvas';
    cv.width = GW; cv.height = GH;
    cv.style.display = 'block'; cv.style.margin = '0 auto';
    document.body.style.background = '#0a0a16';
    document.body.style.display = 'flex'; document.body.style.justifyContent = 'center';
    document.body.style.alignItems = 'center'; document.body.style.minHeight = '100vh';
    document.body.appendChild(cv);
  }
  ctx = cv.getContext('2d');
}

// ============================================================
// 游戏常量
// ============================================================
var COLS = 15, ROWS = 15, CS, MAP_OX, MAP_OY;
if (isWx) {
  // 微信小游戏：自适应屏幕，保持边框比例
  var scale = Math.min(GW / 1254, GH / 1254);
  CS = Math.floor(72 * scale);
  var mapW = COLS * CS, mapH = ROWS * CS;
  MAP_OX = Math.floor((GW - mapW) / 2);
  MAP_OY = Math.floor((GH - mapH) / 2);
} else {
  CS = 72;
  MAP_OX = 85; MAP_OY = 85;
}

var BSPD = 480, BSZ = 8;
var DIR = {UP:0, RIGHT:1, DOWN:2, LEFT:3};
var DV = {0:{dx:0,dy:-1}, 1:{dx:1,dy:0}, 2:{dx:0,dy:1}, 3:{dx:-1,dy:0}};

var FC = {
  0:{hp:1,spd:160,fr:0.45,brk:'W'},
  1:{hp:2,spd:120,fr:0.9,brk:'W#'},
  2:{hp:3,spd:120,fr:0.45,brk:'W#S'},
  3:{hp:5,spd:80,fr:0.9,brk:'W#SG'}
};
var EC = {
  '1':{fl:0,hp:1,spd:160,fr:0.8,sc:100,cl:'#ff6666'},
  '2':{fl:1,hp:2,spd:140,fr:1.2,sc:200,cl:'#ffaa00'},
  '3':{fl:2,hp:3,spd:120,fr:0.8,sc:300,cl:'#ff4444'},
  '4':{fl:3,hp:5,spd:100,fr:1.2,sc:500,cl:'#cc0000'}
};
var CANS_PER_CH = [0,2,2,3,4,5,5];
var PLAYER_TANK_TYPES = ['armored','light','medium','heavy'];
var PLAYER_TANK_COLORS = ['purple','red','white','black','blue','pink'];

// ============================================================
// 图片加载器（兼容微信）
// ============================================================
var Sprites = {};
var SpriteLoaded = false;
var SpriteLoadPromise = null;

function loadSprites() {
  if (SpriteLoadPromise) return SpriteLoadPromise;
  var toLoad = {};
  
  var tileNames = ['brick','steel','water','grass','crystal','energy_can','liquid'];
  for (var i = 0; i < tileNames.length; i++) {
    toLoad['tile_'+tileNames[i]] = 'res/sprites/tiles/'+tileNames[i]+'.png';
  }
  
  for (var i = 0; i < PLAYER_TANK_TYPES.length; i++) {
    for (var j = 0; j < PLAYER_TANK_COLORS.length; j++) {
      var key = 'tank_'+PLAYER_TANK_TYPES[i]+'_'+PLAYER_TANK_COLORS[j];
      toLoad[key] = 'res/sprites/tanks/'+PLAYER_TANK_TYPES[i]+'_'+PLAYER_TANK_COLORS[j]+'.png';
    }
  }
  
  for (var i = 0; i < PLAYER_TANK_TYPES.length; i++) {
    toLoad['enemy_'+PLAYER_TANK_TYPES[i]] = 'res/sprites/tanks/enemy_'+PLAYER_TANK_TYPES[i]+'.png';
  }
  
  var pwNames = ['fireUp','fireDown','shield','speedUp','scatter','bomb','invisible','freeze','teleport','oneShot','freezeTime'];
  for (var i = 0; i < pwNames.length; i++) {
    toLoad['pw_'+pwNames[i]] = 'res/sprites/powerups/'+pwNames[i]+'.png';
  }
  
  toLoad['ui_bg'] = 'res/sprites/ui/bg.png';
  for (var i = 1; i <= 4; i++) {
    toLoad['bullet_'+i] = 'res/sprites/fx/bullet_'+i+'.png';
  }
  
  var keys = Object.keys(toLoad);
  var promises = [];
  for (var i = 0; i < keys.length; i++) {
    (function(key, src) {
      promises.push(new Promise(function(resolve) {
        if (isWx) {
          var img = wx.createImage();
          img.onload = function() { Sprites[key] = img; resolve(); };
          img.onerror = function() { Sprites[key] = null; resolve(); };
          img.src = src;
        } else {
          var img = new Image();
          img.onload = function() { Sprites[key] = img; resolve(); };
          img.onerror = function() { Sprites[key] = null; resolve(); };
          img.src = src + '?v=' + Date.now();
        }
      }));
    })(keys[i], toLoad[keys[i]]);
  }
  
  SpriteLoadPromise = Promise.all(promises).then(function() {
    SpriteLoaded = true;
    var loaded = 0;
    for (var i = 0; i < keys.length; i++) { if (Sprites[keys[i]] !== null) loaded++; }
    console.log('Sprites: '+loaded+'/'+keys.length);
  });
  return SpriteLoadPromise;
}

function getSprite(key) { return Sprites[key] || null; }

function fitDraw(c, sprite, x, y, size) {
  var iw = sprite.width, ih = sprite.height;
  var s = size / Math.max(iw, ih);
  var sw = iw*s, sh = ih*s;
  c.drawImage(sprite, x+(size-sw)/2, y+(size-sh)/2, sw, sh);
}

function getTankSprite(tk) {
  if (tk.isEnemy) {
    var ei = Math.min(tk.fl || 0, 3);
    return getSprite('enemy_'+PLAYER_TANK_TYPES[ei]);
  }
  var ti = Math.min(tk.fl || 0, 3);
  var ci = (tk.colorIdx !== undefined) ? Math.min(tk.colorIdx, 5) : 0;
  return getSprite('tank_'+PLAYER_TANK_TYPES[ti]+'_'+PLAYER_TANK_COLORS[ci]);
}

// ============================================================
// 地图数据（内联，避免wx.request）
// ============================================================
var ALL_MAPS = {
  "1":[ [".","1","1",".",".",".",".",".","2","2",".",".",".",".","."],
        ["#",".","#","#","#","#","#","#","#","#","#","#","#","#","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".",".","#",".",".","#",".","#",".",".","#",".",".","#"],
        ["#",".","#","#","#","#","#",".","#","#","#","#","#","#","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".",".","#",".",".","#",".","#",".",".","#",".",".","#"],
        ["#",".","#","#","#","#","#",".","#","#","#","#","#","#","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".",".","#",".",".","#",".","#",".",".","#",".",".","#"],
        ["#",".","#","#","#","#","#",".","#","#","#","#","#","#","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".",".","#",".",".","#",".","#",".",".","#",".",".","#"],
        ["#",".",".","#",".",".","S","S","S",".",".","#",".",".","#"],
        ["#",".",".",".",".","P",".","B","#","P",".","#",".",".","#"] ],
  "2":[ [".","1","2",".",".",".",".",".","2","3",".",".",".",".","."],
        ["#",".","#","#","#","#","#","#","#","#","#","#","#",".","#"],
        ["#",".",".","#","#","#","#","#","#","#","#","#",".",".","#"],
        ["#",".","#",".",".",".",".",".",".",".",".",".","#",".","#"],
        ["#",".","#",".",".",".",".",".",".",".",".",".","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#",".",".",".",".",".",".",".",".",".","#",".","#"],
        ["#",".","#",".",".",".",".",".",".",".",".",".","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#",".",".",".",".",".",".",".",".",".","#",".","#"],
        ["#",".","#",".",".",".",".",".",".",".",".",".","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#","#","#","#","#","#","#","#","#","#","#",".","#"],
        ["#",".",".",".",".",".","#","#","#",".",".",".",".",".","#"],
        ["#",".",".",".",".","P",".","B","#","P",".","#","#","#","#"] ],
  "3":[ [".","1","2",".",".",".",".",".","2","3","3",".",".",".","."],
        ["#",".","#","G","#","#","#","#","#","#","#","G","#","#","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#","#","#",".","#",".","#",".","#","#","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#",".","#","#","#",".","#","#","#",".","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#",".","#","#","#",".","#","#","#",".","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#",".","#","#","#",".","#","#","#",".","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#",".","#","#","#",".","#",".","#",".","#","#","#",".","#"],
        ["#",".",".",".",".",".",".",".",".",".",".",".",".",".","#"],
        ["#","#","#","#","#",".","#","#","#",".","#","#","#","#","#"],
        ["#","#","#","#",".","P",".","B","#","P",".","#","#","#","#"] ]
};

// ============================================================
// 坦克
// ============================================================
var tankUid = 0;
function Tank(c, r, dir, fl, isP, cl) {
  this.uid = ++tankUid;
  this.c = c; this.r = r;
  this.x = c*CS+CS/2; this.y = r*CS+CS/2;
  this.dir = dir; this.fl = fl; this.isP = isP; this.cl = cl||'#4488ff';
  var o = FC[fl];
  this.hp = o.hp; this.mhp = o.hp; this.spd = o.spd; this.fr = o.fr; this.brk = o.brk;
  this.fcd = 0; this.alive = true; this.moving = false; this.mdir = dir; this.moveProgress = 0;
  this.sh = false; this.st = 0; this.sc = false; this.sct = 0; this.bo = false; this.bt = 0;
  this.isEnemy = false; this.colorIdx = 0;
}
Tank.prototype.fire = function() {
  if (this.fcd > 0) return null;
  this.fcd = this.fr;
  var v = DV[this.dir], bx = this.c+v.dx, by = this.r+v.dy;
  if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return null;
  var res = [{c:bx,r:by,dir:this.dir,x:bx*CS+CS/2,y:by*CS+CS/2,isP:this.isP,firerId:this.uid,fl:this.fl}];
  if (this.sc) {
    res.push({c:bx,r:by,dir:(this.dir+3)%4,x:bx*CS+CS/2,y:by*CS+CS/2,isP:this.isP,firerId:this.uid,fl:this.fl});
    res.push({c:bx,r:by,dir:(this.dir+1)%4,x:bx*CS+CS/2,y:by*CS+CS/2,isP:this.isP,firerId:this.uid,fl:this.fl});
  }
  return res;
};

function isBlocked(t) { return t=='#'||t=='S'||t=='W'||t=='B'; }

function hasTankAt(r, c, self) {
  if (player.alive && player !== self && player.r === r && player.c === c) return true;
  if (player.moving) { var v=DV[player.mdir]; if (player.r+v.dy===r && player.c+v.dx===c) return true; }
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive || e === self) continue;
    if (e.r === r && e.c === c) return true;
    if (e.moving) { var v=DV[e.mdir]; if (e.r+v.dy===r && e.c+v.dx===c) return true; }
  }
  return false;
}

function tankMove(tk, dt) {
  if (!tk.moving) return;
  var spd = tk.bo ? tk.spd*2 : tk.spd;
  tk.moveProgress += spd*dt/CS;
  if (tk.moveProgress >= 1) {
    var v = DV[tk.mdir], nc = tk.c+v.dx, nr = tk.r+v.dy;
    if (hasTankAt(nr, nc, tk)) { tk.moving = false; tk.moveProgress = 0; return; }
    tk.c = nc; tk.r = nr;
    tk.x = tk.c*CS+CS/2; tk.y = tk.r*CS+CS/2;
    tk.moving = false; tk.moveProgress = 0;
  } else {
    var v = DV[tk.mdir];
    tk.x = (tk.c+v.dx*tk.moveProgress)*CS+CS/2;
    tk.y = (tk.r+v.dy*tk.moveProgress)*CS+CS/2;
  }
}

// ============================================================
// 游戏状态
// ============================================================
var state = 0, map = [], player, enemies = [], bullets = [], powerups = [], liquids = {}, cans = [];
var toSp = 0, spd = 0, tot = 0, spT = 2, lt = 0;
var curLevel = 1, curChapter = 1;

// ============================================================
// 游戏逻辑
// ============================================================
function startGame(lv) {
  if (lv) curLevel = lv;
  curChapter = Math.min(6, Math.ceil(curLevel/5));
  var mapData = ALL_MAPS[curLevel];
  if (!mapData) { curLevel = 1; mapData = ALL_MAPS[1]; }
  map = mapData.map(function(r) { return r.slice(); });
  
  var savedFl = player && player.alive ? player.fl : 1;
  var savedColor = player && player.alive ? player.colorIdx : 0;
  player = new Tank(5,14,DIR.UP,savedFl,true,'#9955dd');
  player.colorIdx = savedColor;
  
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
    if (map[r][c] == 'P') { player.c = c; player.r = r; player.x = c*CS+CS/2; player.y = r*CS+CS/2; map[r][c] = '.'; break; }
  }
  if (player.r-1 >= 0) map[player.r-1][player.c] = '.';
  
  enemies = []; bullets = []; powerups = []; liquids = {}; cans = [];
  toSp = 0; spd = 0; spT = 2;
  for (var c = 0; c < COLS; c++) { var t = map[0][c]; if (t>='1'&&t<='4') { toSp++; map[0][c] = '.'; } }
  tot = toSp;
  
  var br = [];
  for (var r = 1; r < ROWS-1; r++) for (var c = 1; c < COLS-1; c++) if (map[r][c]=='#') br.push({r:r,c:c});
  var cn = Math.min(CANS_PER_CH[curChapter]||2, br.length);
  for (var i = 0; i < cn; i++) {
    var idx = Math.floor(Math.random()*br.length);
    cans.push(br[idx]); br.splice(idx, 1);
  }
  state = 1; lt = performance.now();
}

function spawnEnemy() {
  var types = spd < 4 ? ['1','2'] : ['1','2','3'];
  var t = types[Math.floor(Math.random()*types.length)], cfg = EC[t], sc = 1+Math.floor(Math.random()*13);
  var e = new Tank(sc,0,DIR.DOWN,cfg.fl,false,cfg.cl);
  e.hp = cfg.hp; e.mhp = cfg.hp; e.spd = cfg.spd; e.fr = cfg.fr; e.type = t; e.score = cfg.sc;
  e.isEnemy = true;
  enemies.push(e); spd++;
}

function dropItem(r, c) {
  var tp = ['fireUp','fireUp','fireDown','shield','speedUp','scatter','bomb'];
  powerups.push({r:r,c:c,effect:tp[Math.floor(Math.random()*tp.length)]});
}

function applyPowerup(tk, p) {
  switch(p.effect) {
    case'fireUp':if(tk.fl<3){tk.fl++;var o=FC[tk.fl];tk.hp=o.hp;tk.mhp=o.hp;tk.fr=o.fr;tk.brk=o.brk;tk.spd=o.spd;}break;
    case'fireDown':if(tk.fl>0){tk.fl--;var o=FC[tk.fl];tk.hp=o.hp;tk.mhp=o.hp;tk.fr=o.fr;tk.brk=o.brk;tk.spd=o.spd;}break;
    case'shield':tk.sh=true;tk.st=10;break;
    case'speedUp':tk.bo=true;tk.bt=8;break;
    case'scatter':tk.sc=true;tk.sct=10;break;
    case'bomb':return'bomb';
  }
  return null;
}

function checkPickup(tk) {
  for (var i = powerups.length-1; i >= 0; i--) {
    var p = powerups[i], dc = Math.abs(tk.x-p.c*CS-CS/2), dr = Math.abs(tk.y-p.r*CS-CS/2);
    if (dc < CS*0.4 && dr < CS*0.4) {
      var r = applyPowerup(tk, p);
      powerups.splice(i, 1);
      if (r === 'bomb') { enemies.forEach(function(e){e.alive=false;}); enemies = []; }
    }
  }
  if (!tk.moving && tk.moveProgress===0 && liquids[tk.r+','+tk.c]) {
    var v = DV[tk.dir], nr = tk.r+v.dy, nc = tk.c+v.dx;
    if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&!isBlocked(map[nr][nc])&&!hasTankAt(nr,nc,tk)) {
      tk.r = nr; tk.c = nc; tk.x = nc*CS+CS/2; tk.y = nr*CS+CS/2;
    }
  }
}

function aiEnemy(e, dt) {
  if (!e.moving) {
    var d;
    if (Math.random() < 0.7) {
      var dx = 7-e.c, dy = 14-e.r;
      d = Math.abs(dx) > Math.abs(dy) ? (dx>0?DIR.RIGHT:DIR.LEFT) : (dy>0?DIR.DOWN:DIR.UP);
    } else d = Math.floor(Math.random()*4);
    e.dir = d;
    var v = DV[d], nc = e.c+v.dx, nr = e.r+v.dy;
    if (nc>=0&&nc<COLS&&nr>=0&&nr<ROWS&&!isBlocked(map[nr][nc])&&!hasTankAt(nr,nc,e)) {
      e.moving = true; e.mdir = d; e.moveProgress = 0;
    }
  }
  if (Math.random() < 0.03) { var bs = e.fire(); if (bs) for (var i = 0; i < bs.length; i++) bullets.push(bs[i]); }
}

function checkCollisions() {
  for (var i = bullets.length-1; i >= 0; i--) {
    for (var j = i-1; j >= 0; j--) {
      var a = bullets[i], b = bullets[j];
      if (a.firerId && b.firerId && a.firerId === b.firerId) continue;
      var dx = a.x-b.x, dy = a.y-b.y;
      if (Math.sqrt(dx*dx+dy*dy) < CS*0.3) {
        bullets.splice(i, 1); bullets.splice(j<i?j:j-1, 1); i--; break;
      }
    }
  }
  
  for (var i = bullets.length-1; i >= 0; i--) {
    var b = bullets[i], bc = Math.round((b.x-CS/2)/CS), br = Math.round((b.y-CS/2)/CS);
    if (bc<0||bc>=COLS||br<0||br>=ROWS) { bullets.splice(i,1); continue; }
    var tile = map[br][bc];
    if (tile == 'B') { state = 2; bullets.splice(i,1); continue; }
    
    var firer = null;
    if (b.firerId) {
      if (player.uid === b.firerId) firer = player;
      else for (var j = 0; j < enemies.length; j++) { if (enemies[j].uid===b.firerId&&enemies[j].alive) { firer = enemies[j]; break; } }
    }
    var canBreak = firer ? firer.brk : '';
    
    if (tile == '#') {
      if (canBreak.indexOf('#') >= 0) {
        map[br][bc] = '.';
        for (var j = cans.length-1; j >= 0; j--) {
          if (cans[j].r===br&&cans[j].c===bc) { cans.splice(j,1); dropItem(br,bc); liquids[br+','+bc]=true; break; }
        }
      }
      bullets.splice(i,1); continue;
    }
    if (tile == 'S') { if (canBreak.indexOf('S')>=0) map[br][bc]='.'; bullets.splice(i,1); continue; }
    if (tile == 'G') { if (canBreak.indexOf('G')>=0) map[br][bc]='.'; bullets.splice(i,1); continue; }
    if (tile == 'W') { bullets.splice(i,1); continue; }
    
    if (b.isP) {
      for (var j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (!e.alive) continue;
        if (bc===e.c&&br===e.r) {
          if (e.sh) { e.sh = false; bullets.splice(i,1); break; }
          e.hp--;
          bullets.splice(i,1);
          if (e.hp <= 0) { e.alive = false; if (Math.random()<0.3||e.type=='4') dropItem(e.r,e.c); }
          break;
        }
      }
    } else {
      if (player.alive && bc===player.c&&br===player.r) {
        if (player.sh) { player.sh = false; } else { player.hp--; }
        bullets.splice(i,1);
        if (player.hp <= 0) { player.alive = false; state = 2; }
      }
    }
  }
}

// ============================================================
// 渲染
// ============================================================
function drawMapLayer(grassOnly) {
  var canSet = {};
  for (var i = 0; i < cans.length; i++) canSet[cans[i].r+','+cans[i].c] = true;
  
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
    var x = c*CS, y = r*CS, t = map[r][c];
    if (canSet[r+','+c]) continue;
    
    if (grassOnly) {
      if (t == 'G') {
        var sprite = getSprite('tile_grass');
        if (sprite) fitDraw(ctx, sprite, x, y, CS);
        else { ctx.fillStyle='#2a4a2a'; ctx.fillRect(x,y,CS,CS); }
      }
      continue;
    }
    
    if (t == 'G') continue; // 草丛在第一层不画
    
    var spriteKey = null;
    if (t == '#') spriteKey = 'tile_brick';
    else if (t == 'S') spriteKey = 'tile_steel';
    else if (t == 'W') spriteKey = 'tile_water';
    else if (t == 'B') spriteKey = 'tile_crystal';
    
    if (spriteKey) {
      var sprite = getSprite(spriteKey);
      if (sprite) fitDraw(ctx, sprite, x, y, CS);
    } else {
      ctx.fillStyle = t=='#'?'#884422':t=='S'?'#aaaaaa':t=='W'?'#1a5588':'#1a1a2a';
      ctx.fillRect(x, y, CS, CS);
    }
  }
}

function drawBullet(b) {
  var bulletLv = (b.fl||0)+1;
  var sprite = getSprite('bullet_'+bulletLv);
  if (sprite) {
    var bw = sprite.width, bh = sprite.height;
    var scale = CS*0.8/Math.max(bw,bh);
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.rotate((b.dir||0)*Math.PI/2);
    ctx.drawImage(sprite, -bw*scale/2, -bh*scale/2, bw*scale, bh*scale);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ff0'; ctx.beginPath(); ctx.arc(b.x, b.y, BSZ, 0, Math.PI*2); ctx.fill();
  }
}

function drawTank(tk) {
  var sprite = getTankSprite(tk);
  if (sprite) {
    var iw = sprite.width, ih = sprite.height;
    var scale = CS/Math.max(iw, ih);
    var sw = iw*scale, sh = ih*scale;
    ctx.save(); ctx.translate(tk.x, tk.y);
    ctx.rotate((tk.dir||0)*Math.PI/2);
    ctx.drawImage(sprite, -sw/2, -sh/2, sw, sh);
    ctx.restore();
    if (tk.sh) { ctx.strokeStyle='#0ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(tk.x,tk.y,CS*0.55,0,Math.PI*2);ctx.stroke(); }
  } else {
    ctx.fillStyle = tk.cl; ctx.fillRect(tk.x-CS*0.4, tk.y-CS*0.4, CS*0.8, CS*0.8);
    ctx.fillStyle = '#222'; ctx.fillRect(tk.x-CS*0.15, tk.y-CS*0.5, CS*0.3, CS*0.15);
  }
}

function update(ts) {
  if (state !== 1) return;
  var dt = Math.min((ts-lt)/1000, 0.1); lt = ts;
  
  var kd = null;
  if (keys['arrowup']||keys['w']) kd = DIR.UP;
  else if (keys['arrowdown']||keys['s']) kd = DIR.DOWN;
  else if (keys['arrowleft']||keys['a']) kd = DIR.LEFT;
  else if (keys['arrowright']||keys['d']) kd = DIR.RIGHT;
  if (touchDir !== null) kd = touchDir;
  
  if (kd !== null && !player.moving) {
    player.dir = kd;
    var v = DV[kd], nc = player.c+v.dx, nr = player.r+v.dy;
    if (nc>=0&&nc<COLS&&nr>=0&&nr<ROWS&&!isBlocked(map[nr][nc])&&!hasTankAt(nr,nc,player)) {
      player.moving = true; player.mdir = kd; player.moveProgress = 0;
    }
  }
  if (touchFire || keys[' '] || keys['j']) { var bs = player.fire(); if (bs) for (var i = 0; i < bs.length; i++) bullets.push(bs[i]); }
  
  if (player.fcd > 0) player.fcd -= dt;
  if (player.st > 0) { player.st -= dt; if (player.st <= 0) player.sh = false; }
  if (player.sct > 0) { player.sct -= dt; if (player.sct <= 0) player.sc = false; }
  if (player.bt > 0) { player.bt -= dt; if (player.bt <= 0) player.bo = false; }
  
  tankMove(player, dt);
  checkPickup(player);
  
  if (spd < tot && enemies.length < 5) { spT -= dt; if (spT <= 0) { spT = 2+Math.random()*2; spawnEnemy(); } }
  
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    if (!e.alive) continue;
    if (e.fcd > 0) e.fcd -= dt;
    aiEnemy(e, dt); tankMove(e, dt); checkPickup(e);
  }
  
  for (var i = 0; i < bullets.length; i++) {
    var b = bullets[i], v = DV[b.dir];
    b.x += v.dx*BSPD*dt; b.y += v.dy*BSPD*dt;
  }
  bullets = bullets.filter(function(b) {
    var bc = Math.round((b.x-CS/2)/CS), br = Math.round((b.y-CS/2)/CS);
    return bc >= 0 && bc < COLS && br >= 0 && br < ROWS;
  });
  
  checkCollisions();
  if (map[14][7] !== 'B') state = 2;
  var al = 0; for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) al++;
  if (spd >= tot && al === 0) state = 3;
}

function render() {
  var bg = getSprite('ui_bg');
  if (bg) ctx.drawImage(bg, 0, 0, GW, GH);
  else { ctx.fillStyle = '#0a0a16'; ctx.fillRect(0, 0, GW, GH); }
  
  if (state === 0) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('坦克大战 EVO', GW/2, GH/2-70);
    ctx.font = '18px sans-serif';
    ctx.fillText('经典模式', GW/2, GH/2-30);
    ctx.fillStyle = '#f0c040';
    ctx.fillText('点击开始第'+curLevel+'关', GW/2, GH/2+10);
    ctx.fillStyle = '#888'; ctx.font = '14px sans-serif';
    ctx.fillText('虚拟摇杆移动 | 点击右侧射击', GW/2, GH/2+45);
    return;
  }
  
  ctx.save(); ctx.translate(MAP_OX, MAP_OY);
  drawMapLayer(false);
  for (var i = 0; i < cans.length; i++) {
    var p = cans[i];
    var sprite = getSprite('tile_energy_can');
    if (sprite) {
      var scale = CS*0.9/Math.max(sprite.width, sprite.height);
      var sw = sprite.width*scale, sh = sprite.height*scale;
      ctx.drawImage(sprite, p.c*CS+(CS-sw)/2, p.r*CS+(CS-sh)/2, sw, sh);
    }
  }
  for (var k in liquids) {
    var a = k.split(','), lx = parseInt(a[1])*CS, ly = parseInt(a[0])*CS;
    var liqSprite = getSprite('tile_liquid');
    if (liqSprite) { var lw=CS*0.95, lh=CS*1.2; ctx.drawImage(liqSprite, lx+(CS-lw)/2, ly+(CS-lh)/2, lw, lh); }
    else { ctx.fillStyle='rgba(0,255,100,.3)'; ctx.fillRect(lx,ly,CS,CS); }
  }
  
  var icons = {fireUp:'\u2b50',fireDown:'\ud83d\udfe2',shield:'\ud83d\udee1',speedUp:'\u26a1',scatter:'\ud83d\udd2b',bomb:'\ud83d\udca3'};
  for (var i = 0; i < powerups.length; i++) {
    var p = powerups[i], px = p.c*CS, py = p.r*CS;
    var pwSprite = getSprite('pw_'+p.effect);
    if (pwSprite) fitDraw(ctx, pwSprite, px+2, py+2, CS-4);
    else { ctx.fillStyle='rgba(240,192,64,.3)';ctx.fillRect(px+1,py+1,CS-2,CS-2);ctx.fillStyle='#f0c040';ctx.textAlign='center';ctx.fillText(icons[p.effect]||'?',px+CS/2,py+CS/2+4); }
  }
  
  for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) drawTank(enemies[i]);
  if (player.alive) drawTank(player);
  for (var i = 0; i < bullets.length; i++) drawBullet(bullets[i]);
  drawMapLayer(true);
  ctx.restore();
  
  // HUD
  var al = 0; for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) al++;
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, GW, 32);
  ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('关: '+curLevel+' | 敌: '+(tot-spd+al)+' | HP: '+player.hp+' | 火力: '+player.fl, 10, 22);
  
  if (state === 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GW/2, GH/2-20);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
    ctx.fillText('点击重新开始', GW/2, GH/2+30);
  }
  if (state === 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#44ff44'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('胜利!', GW/2, GH/2-20);
    ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
    ctx.fillText('点击进入第'+(curLevel+1)+'关', GW/2, GH/2+30);
  }
}

// ============================================================
// 输入处理
// ============================================================
var keys = {}, touchDir = null, touchFire = false;

if (isWx) {
  wx.onTouchStart(function(e) { handleTouch(e.touches[0]); });
  wx.onTouchMove(function(e) { handleTouch(e.touches[0]); });
  wx.onTouchEnd(function() { touchDir = null; touchFire = false; });
} else {
  document.addEventListener('keydown', function(e) {
    keys[e.key.toLowerCase()] = true;
    if (e.key == ' ' || e.key == 'j') touchFire = true;
    if (state === 0 && e.key === 'Enter') startGame();
    if ((state===2||state===3) && e.key === 'r') startGame();
    if (state===3 && e.key==='n' && curLevel<30) { curLevel++; startGame(); }
  });
  document.addEventListener('keyup', function(e) {
    keys[e.key.toLowerCase()] = false;
    if (e.key == ' ' || e.key == 'j') touchFire = false;
  });
  
  cv.addEventListener('touchstart', function(e) { e.preventDefault(); handleTouch(e.touches[0]); });
  cv.addEventListener('touchmove', function(e) { e.preventDefault(); handleTouch(e.touches[0]); });
  cv.addEventListener('touchend', function(e) { e.preventDefault(); touchDir = null; touchFire = false; });
  
  cv.addEventListener('mousedown', function(e) { handleMouse(e); });
  cv.addEventListener('mousemove', function(e) { if (e.buttons) handleMouse(e); });
  cv.addEventListener('mouseup', function() { touchDir = null; touchFire = false; });
  
  cv.addEventListener('click', function(e) {
    var r = cv.getBoundingClientRect(), mx = e.clientX-r.left, my = e.clientY-r.top;
    if (state === 0) startGame();
    else if (state === 2) startGame();
    else if (state === 3) { curLevel++; startGame(); }
  });
}

function handleTouch(t) {
  var x = t.clientX, y = t.clientY;
  if (isWx) { x = t.x; y = t.y; }
  
  if (x > GW * 0.6) { touchFire = true; touchDir = null; return; }
  var cx = GW*0.25, cy = GH*0.75, dx = x-cx, dy = y-cy, d = Math.sqrt(dx*dx+dy*dy);
  if (d < 15) touchDir = null;
  else if (Math.abs(dx) > Math.abs(dy)) touchDir = dx>0?DIR.RIGHT:DIR.LEFT;
  else touchDir = dy>0?DIR.DOWN:DIR.UP;
}

function handleMouse(e) {
  var r = cv.getBoundingClientRect(), x = e.clientX-r.left, y = e.clientY-r.top;
  if (x > GW*0.6) { touchFire = true; return; }
  var cx = GW*0.25, cy = GH*0.75, dx = x-cx, dy = y-cy;
  if (Math.abs(dx)<15 && Math.abs(dy)<15) touchDir = null;
  else if (Math.abs(dx) > Math.abs(dy)) touchDir = dx>0?DIR.RIGHT:DIR.LEFT;
  else touchDir = dy>0?DIR.DOWN:DIR.UP;
}

// ============================================================
// 主循环
// ============================================================
function loop(ts) {
  update(ts);
  render();
  if (isWx) {
    requestAnimationFrame(loop);
  } else {
    requestAnimationFrame(loop);
  }
}

// 启动
loadSprites().then(function() {
  requestAnimationFrame(loop);
});
