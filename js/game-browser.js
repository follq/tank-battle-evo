/**
 * 坦克大战 EVO — 浏览器完整版
 */
// ========== CONFIG ==========
const GAME_W=750, GAME_H=750, COLS=15, ROWS=15, CS=GAME_W/COLS;
const TS=CS*0.8, T_SPD=120, T_FAST=200, T_SLOW=80;
const B_SPD=300, B_SZ=6, FR_FAST=0.5, FR_SLOW=1.0;
const DIR={UP:0,RIGHT:1,DOWN:2,LEFT:3};
const DV={0:{dx:0,dy:-1},1:{dx:1,dy:0},2:{dx:0,dy:1},3:{dx:-1,dy:0}};
const ST={MENU:'menu',PLAY:'playing',OVER:'gameover',WIN:'victory'};
const FC={0:{hp:1,spd:200,fr:0.5,brk:['W']},1:{hp:2,spd:120,fr:1.0,brk:['W','#']},2:{hp:3,spd:120,fr:0.5,brk:['W','#','S']},3:{hp:5,spd:80,fr:1.0,brk:['W','#','S','G']}};
const EC={'1':{fl:1,hp:2,spd:200,fr:0.5,sc:100,cl:'#ff6666'},'2':{fl:2,hp:1,spd:120,fr:1.0,sc:200,cl:'#ffaa00'},'3':{fl:2,hp:3,spd:120,fr:0.5,sc:300,cl:'#ff4444'},'4':{fl:3,hp:5,spd:80,fr:1.0,sc:500,cl:'#cc0000'}};
const CANS=[0,2,2,3,4,5,5];
const LV1=[
['.','1','.','.','.','.','.','.','.','.','.','.','.','2','.'],
['.','.','.','#','.','#','.','#','.','#','.','#','.','.','.'],
['.','.','#','.','#','.','#','.','#','.','#','.','#','.','.'],
['.','.','.','#','.','#','.','.','.','#','.','#','.','.','.'],
['.','.','#','.','#','.','#','.','#','.','#','.','#','.','.'],
['.','.','.','#','.','#','.','.','.','#','.','#','.','.','.'],
['.','.','#','.','#','.','#','.','#','.','#','.','#','.','.'],
['.','.','.','#','.','#','.','.','.','#','.','#','.','.','.'],
['.','.','#','.','#','.','#','.','#','.','#','.','#','.','.'],
['.','.','.','#','.','#','.','.','.','#','.','#','.','.','.'],
['.','.','#','.','#','.','#','.','#','.','#','.','#','.','.'],
['.','.','.','#','.','#','.','.','.','#','.','#','.','.','.'],
['.','.','.','.','.','.','.','.','.','.','.','.','.','.','.'],
['.','.','.','.','.','#','#','#','#','#','.','.','.','.','.'],
['.','.','.','.','.','P','#','B','#','P','.','.','.','.','.']];

// ========== TANK ==========
class Tank{
  constructor(c,r,dir,fl,isP,cl){
    this.c=c;this.r=r;this.x=c*CS;this.y=r*CS;this.dir=dir;this.fl=fl;this.isP=isP;this.cl=cl||'#4488ff';
    let o=FC[fl];this.hp=o.hp;this.mhp=o.hp;this.spd=o.spd;this.fr=o.fr;this.brk=[...o.brk];
    this.fcd=0;this.alive=true;this.mv=false;this.md=dir;
    this.sh=false;this.st=0;this.sc=false;this.sct=0;this.bo=false;this.bt=0;
  }
  move(d){if(d!=null){this.mv=true;this.md=d;this.dir=d;}else this.mv=false;}
  fire(){
    if(this.fcd>0)return null;this.fcd=this.fr;
    let v=DV[this.dir],bx=this.c+v.dx,by=this.r+v.dy;
    if(this.sc)return[{c:bx,r:by,dir:this.dir},{c:bx,r:by,dir:(this.dir+3)%4},{c:bx,r:by,dir:(this.dir+1)%4}];
    return[{c:bx,r:by,dir:this.dir}];
  }
  upd(dt){
    if(!this.alive)return;
    if(this.fcd>0)this.fcd-=dt;
    if(this.mv){let v=DV[this.md],s=this.bo?this.spd*2:this.spd;this.x+=v.dx*s*dt;this.y+=v.dy*s*dt;let tc=Math.round(this.x/CS),tr=Math.round(this.y/CS);if(Math.abs(this.x-tc*CS)<2&&Math.abs(this.y-tr*CS)<2){this.c=tc;this.r=tr;this.x=this.c*CS;this.y=this.r*CS;this.mv=false;}}
    if(this.st>0){this.st-=dt;if(this.st<=0)this.sh=false;}
    if(this.sct>0){this.sct-=dt;if(this.sct<=0)this.sc=false;}
    if(this.bt>0){this.bt-=dt;if(this.bt<=0)this.bo=false;}
  }
  dmg(n){if(this.sh)return false;this.hp-=n;if(this.hp<=0){this.alive=false;return true;}return false;}
  up(){if(this.fl<3){this.fl++;let o=FC[this.fl];this.hp=o.hp;this.mhp=o.hp;this.spd=o.spd;this.fr=o.fr;this.brk=[...o.brk];}}
  down(){if(this.fl>0){this.fl--;let o=FC[this.fl];this.hp=o.hp;this.mhp=o.hp;this.spd=o.spd;this.fr=o.fr;this.brk=[...o.brk];}}
  apply(e){
    switch(e){
      case'fireUp':this.up();break;case'fireDown':this.down();break;
      case'shield':this.sh=true;this.st=10;break;case'speedUp':this.bo=true;this.bt=8;break;
      case'scatter':this.sc=true;this.sct=10;break;case'bomb':return'bomb';
    }return null;
  }
}

// ========== RENDERER ==========
class Rnd{
  constructor(cv,ctx){this.cv=cv;this.ctx=ctx;}
  cls(){this.ctx.fillStyle='#0a0a16';this.ctx.fillRect(0,0,GAME_W,GAME_H);}
  map(d){
    let ctx=this.ctx;
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      let x=c*CS,y=r*CS,s=CS-1,t=d[r][c];
      if(t=='#'){ctx.fillStyle='#8b4513';ctx.fillRect(x+1,y+1,s-1,s-1);ctx.fillStyle='#a0522d';ctx.fillRect(x+1,y+1,s-1,s/2);ctx.strokeStyle='#6b3410';ctx.lineWidth=1;ctx.strokeRect(x+1.5,y+1.5,s-3,s-3);}
      else if(t=='S'){ctx.fillStyle='#667788';ctx.fillRect(x+1,y+1,s-1,s-1);ctx.fillStyle='#8899aa';ctx.fillRect(x+3,y+3,s-5,s-5);ctx.strokeStyle='#445566';ctx.lineWidth=1.5;ctx.strokeRect(x+1.5,y+1.5,s-3,s-3);}
      else if(t=='W'){ctx.fillStyle='#1a5588';ctx.fillRect(x,y,s+1,s+1);ctx.strokeStyle='#3388cc';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+3,y+CS/2);ctx.lineTo(x+CS/3,y+CS/2-4);ctx.lineTo(x+CS*2/3,y+CS/2+4);ctx.lineTo(x+s-2,y+CS/2);ctx.stroke();}
      else if(t=='G'){ctx.fillStyle='#1d4518';ctx.fillRect(x,y,s+1,s+1);ctx.fillStyle='#2d6a24';for(let i=0;i<8;i++)ctx.fillRect(x+3+(i*6)%(s-5),y+3+(i*4)%(s-5),2,6);}
      else if(t=='B'){ctx.fillStyle='#1a0a0a';ctx.fillRect(x,y,s+1,s+1);let g=ctx.createRadialGradient(x+CS/2,y+CS/2,0,x+CS/2,y+CS/2,s/2);g.addColorStop(0,'#ff6688');g.addColorStop(.5,'#cc2244');g.addColorStop(1,'#660011');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x+CS/2,y+3);ctx.lineTo(x+s-3,y+CS/2);ctx.lineTo(x+CS/2,y+s-3);ctx.lineTo(x+3,y+CS/2);ctx.closePath();ctx.fill();ctx.strokeStyle='#ff88aa';ctx.lineWidth=1;ctx.stroke();}
      else{ctx.fillStyle='#111125';ctx.fillRect(x,y,s+1,s+1);ctx.strokeStyle='#181830';ctx.lineWidth=.3;ctx.strokeRect(x,y,s+1,s+1);}
    }
  }
  tank(x,y,dir,cl,isP){
    let ctx=this.ctx,hw=TS/2,cx=x+CS/2,cy=y+CS/2;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(dir*Math.PI/2);
    ctx.fillStyle=cl;ctx.fillRect(-hw,-hw+4,TS,TS-8);
    ctx.fillStyle='#333';ctx.fillRect(-hw,-hw,TS,6);ctx.fillRect(-hw,hw-6,TS,6);
    ctx.fillStyle=isP?'#44dd44':'#dd4444';ctx.beginPath();ctx.arc(0,0,hw*.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#888';ctx.fillRect(-3,-hw,6,hw*.6);
    ctx.restore();
  }
  bullet(x,y){let ctx=this.ctx,cx=x+CS/2,cy=y+CS/2;ctx.fillStyle='#ff0';ctx.beginPath();ctx.arc(cx,cy,B_SZ,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cx,cy,B_SZ/2,0,Math.PI*2);ctx.fill();}
  can(x,y){let ctx=this.ctx,cx=x+CS/2,cy=y+CS/2;ctx.fillStyle='#0d3d1a';ctx.fillRect(x,y,CS,CS);ctx.fillStyle='#0c6';ctx.beginPath();ctx.arc(cx,cy,CS/3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0f8';ctx.beginPath();ctx.arc(cx-1,cy-1,CS/6,0,Math.PI*2);ctx.fill();}
  pwup(x,y,icon){let ctx=this.ctx;ctx.fillStyle='rgba(240,192,64,.3)';ctx.fillRect(x+2,y+2,CS-4,CS-4);ctx.fillStyle='#f0c040';ctx.font=CS*.6+'px sans-serif';ctx.textAlign='center';ctx.fillText(icon||'?',x+CS/2,y+CS/2+6);}
  hud(lv,el,hp,fl){let ctx=this.ctx;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,GAME_W,28);ctx.fillStyle='#f0c040';ctx.font='14px sans-serif';ctx.textAlign='left';ctx.fillText('Lv'+lv,10,20);ctx.fillStyle='#f66';ctx.fillText('Enemy:'+el,120,20);ctx.fillStyle='#4d4';ctx.fillText('HP:'+'?'.repeat(hp),240,20);ctx.fillStyle='#f0c040';ctx.fillText('Fire:Lv'+fl,380,20);}
  end(won){let ctx=this.ctx;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,GAME_W,GAME_H);ctx.fillStyle=won?'#4d4':'#f44';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(won?'VICTORY!':'GAME OVER',GAME_W/2,GAME_H/2-20);ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.fillText('Click to restart',GAME_W/2,GAME_H/2+30);}
}

// ========== GAME ==========
class Game{
  constructor(cv){
    this.cv=cv;this.ctx=cv.getContext('2d');this.rnd=new Rnd(cv,this.ctx);
    this.state=ST.MENU;this.keys={};
    this._input();
  }
  _input(){
    let k=this.keys;
    document.addEventListener('keydown',e=>{k[e.key.toLowerCase()]=true;if(e.key==' '||e.key=='j')this.tf=true;});
    document.addEventListener('keyup',e=>{k[e.key.toLowerCase()]=false;if(e.key==' '||e.key=='j')this.tf=false;});
    this.cv.addEventListener('touchstart',e=>{e.preventDefault();this._touch(e.touches[0]);});
    this.cv.addEventListener('touchmove',e=>{e.preventDefault();this._touch(e.touches[0]);});
    this.cv.addEventListener('touchend',e=>{e.preventDefault();this.td=null;this.tf=false;});
    this.cv.addEventListener('mousedown',e=>{this._mouse(e);});
    this.cv.addEventListener('mousemove',e=>{if(e.buttons)this._mouse(e);});
    this.cv.addEventListener('mouseup',()=>{this.td=null;this.tf=false;});
    this.cv.addEventListener('click',()=>{
      if(this.state===ST.MENU)this.start(1);
      if(this.state===ST.OVER||this.state===ST.WIN)this.start(1);
    });
  }
  _touch(t){let r=this.cv.getBoundingClientRect(),x=t.clientX-r.left,y=t.clientY-r.top;if(x>GAME_W*.6){this.tf=true;this.td=null;return;}let cx=GAME_W*.25,cy=GAME_H*.75,dx=x-cx,dy=y-cy,d=Math.sqrt(dx*dx+dy*dy);if(d<15)this.td=null;else if(Math.abs(dx)>Math.abs(dy))this.td=dx>0?DIR.RIGHT:DIR.LEFT;else this.td=dy>0?DIR.DOWN:DIR.UP;}
  _mouse(e){let r=this.cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(x>GAME_W*.6){this.tf=true;return;}let cx=GAME_W*.25,cy=GAME_H*.75,dx=x-cx,dy=y-cy;if(Math.abs(dx)<15&&Math.abs(dy)<15)this.td=null;else if(Math.abs(dx)>Math.abs(dy))this.td=dx>0?DIR.RIGHT:DIR.LEFT;else this.td=dy>0?DIR.DOWN:DIR.UP;}
  _kd(){let k=this.keys;if(k['arrowup']||k['w'])return DIR.UP;if(k['arrowdown']||k['s'])return DIR.DOWN;if(k['arrowleft']||k['a'])return DIR.LEFT;if(k['arrowright']||k['d'])return DIR.RIGHT;return null;}

  start(lv){
    this.map=LV1.map(r=>[...r]);
    this.pl=new Tank(5,14,DIR.UP,1,true,'#9955dd');
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(this.map[r][c]=='P'){this.pl.c=c;this.pl.r=r;this.pl.x=c*CS;this.pl.y=r*CS;this.map[r][c]='.';}
    this.en=[];this.bl=[];this.pw=[];this.lq=new Set();this.cans=[];
    this.toSp=0;this.spd=0;this.spT=2;
    for(let c=0;c<COLS;c++){let t=this.map[0][c];if(t>='1'&&t<='4'){this.toSp++;this.map[0][c]='.';}}
    this.tot=this.toSp;
    let br=[];for(let r=1;r<ROWS-1;r++)for(let c=1;c<COLS-1;c++)if(this.map[r][c]=='#')br.push({r,c});
    let cn=Math.min(CANS[1]||2,br.length);
    for(let i=0;i<cn;i++){let idx=Math.floor(Math.random()*br.length);this.cans.push(br[idx]);br.splice(idx,1);}
    this.state=ST.PLAY;this.lt=performance.now();
  }

  upd(ts){
    if(this.state!==ST.PLAY)return;
    let dt=Math.min((ts-this.lt)/1000,.1);this.lt=ts;
    let kd=this._kd(),md=this.td!=null?this.td:kd;
    this.pl.move(md);
    if(this.tf||this.keys[' ']||this.keys['j'])this._fire(this.pl,true);
    this.pl.upd(dt);this._clamp(this.pl);
    if(this.spd<this.tot&&this.en.length<5){this.spT-=dt;if(this.spT<=0){this.spT=2+Math.random()*2;this._spawn();}}
    for(let e of this.en){if(!e.alive)continue;this._ai(e,dt);e.upd(dt);this._clamp(e);}
    for(let b of this.bl){let v=DV[b.dir];b.x+=v.dx*B_SPD*dt;b.y+=v.dy*B_SPD*dt;b.c=Math.round(b.x/CS);b.r=Math.round(b.y/CS);}
    this.bl=this.bl.filter(b=>b.c>=0&&b.c<COLS&&b.r>=0&&b.r<ROWS);
    this._col();
    if(this.map[14][7]!=='B')this.state=ST.OVER;
    if(this.spd>=this.tot&&!this.en.some(e=>e.alive))this.state=ST.WIN;
  }

  _fire(tk,isP){let bs=tk.fire();if(!bs)return;for(let b of bs)this.bl.push({c:b.c,r:b.r,dir:b.dir,x:b.c*CS,y:b.r*CS,isP});}
  _spawn(){let tp=this.spd<4?['1','2']:['1','2','3'];let t=tp[Math.floor(Math.random()*tp.length)],cfg=EC[t],sc=1+Math.floor(Math.random()*13);let e=new Tank(sc,0,DIR.DOWN,cfg.fl,false,cfg.cl);e.hp=cfg.hp;e.mhp=cfg.hp;e.spd=cfg.spd;e.fr=cfg.fr;e.type=t;e.score=cfg.sc;this.en.push(e);this.spd++;}
  _ai(e,dt){if(Math.random()<.02)e.move(Math.floor(Math.random()*4));if(Math.random()<.03){let dx=7-e.c,dy=14-e.r;e.move(Math.abs(dx)>Math.abs(dy)?(dx>0?DIR.RIGHT:DIR.LEFT):(dy>0?DIR.DOWN:DIR.UP));}if(Math.random()<.05*dt*60)this._fire(e,false);}
  _clamp(tk){tk.c=Math.max(0,Math.min(14,tk.c));tk.r=Math.max(0,Math.min(14,tk.r));let t=this.map[tk.r][tk.c];if(t=='#'||t=='S'||t=='W'||t=='B'){tk.x=tk.c*CS;tk.y=tk.r*CS;}if(this.lq.has(tk.r+','+tk.c)){let v=DV[tk.dir],nr=tk.r+v.dy,nc=tk.c+v.dx;if(nr>=0&&nr<15&&nc>=0&&nc<15){let nt=this.map[nr][nc];if(nt!=='#'&&nt!=='S'&&nt!=='W'&&nt!=='B'){tk.r=nr;tk.c=nc;tk.x=nc*CS;tk.y=nr*CS;}}}for(let i=this.pw.length-1;i>=0;i--){let p=this.pw[i];if(p.r===tk.r&&p.c===tk.c){let r=tk.apply(p.effect);this.pw.splice(i,1);if(r==='bomb'){this.en.forEach(e=>e.alive=false);this.en=[];}}}}
  _col(){
    let rb=new Set(),re=new Set();
    for(let i=0;i<this.bl.length;i++){
      let b=this.bl[i];if(rb.has(i))continue;
      let t=this.map[b.r]?.[b.c];if(!t){rb.add(i);continue;}
      let brk=b.isP?this.pl.brk:['W','#','S','G'];
      if(t=='#'&&brk.includes('#')){this.map[b.r][b.c]='.';this._hitCan(b.r,b.c);rb.add(i);continue;}
      if(t=='S'&&brk.includes('S')){this.map[b.r][b.c]='.';rb.add(i);continue;}
      if(t=='G'&&brk.includes('G')){this.map[b.r][b.c]='.';rb.add(i);continue;}
      if(t=='S'||t=='#'){rb.add(i);continue;}
      if(t=='B'){this.state=ST.OVER;return;}
      if(!b.isP&&this.pl.alive&&b.c===this.pl.c&&b.r===this.pl.r){if(this.pl.dmg(1)){this.state=ST.OVER;return;}rb.add(i);}
      if(b.isP){for(let j=0;j<this.en.length;j++){let e=this.en[j];if(!e.alive)continue;if(b.c===e.c&&b.r===e.r){if(e.dmg(1)){re.add(j);if(Math.random()<.3||e.type=='4')this._drop(b.r,b.c);}rb.add(i);break;}}}
    }
    this.bl=this.bl.filter((_,i)=>!rb.has(i));this.en=this.en.filter((_,i)=>!re.has(i));
  }
  _hitCan(r,c){let idx=this.cans.findIndex(p=>p.r===r&&p.c===c);if(idx>=0){this.cans.splice(idx,1);this._drop(r,c);this.lq.add(r+','+c);}}
  _drop(r,c){let tp=['fireUp','fireUp','fireDown','shield','speedUp','scatter','bomb'];this.pw.push({r,c,effect:tp[Math.floor(Math.random()*tp.length)]});}

  render(){
    this.rnd.cls();
    if(this.state===ST.MENU){let ctx=this.ctx;ctx.fillStyle='#fff';ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.fillText('TANK BATTLE EVO',GAME_W/2,GAME_H/2-30);ctx.font='18px sans-serif';ctx.fillText('Click to Start',GAME_W/2,GAME_H/2+20);ctx.fillText('WASD/Arrows Move | Space Fire',GAME_W/2,GAME_H/2+50);return;}
    if(!this.map)return;
    this.rnd.map(this.map);
    for(let p of this.cans)this.rnd.can(p.c*CS,p.r*CS);
    for(let k of this.lq){let[a,b]=k.split(',').map(Number);this.ctx.fillStyle='rgba(0,255,100,.3)';this.ctx.fillRect(b*CS,a*CS,CS,CS);}
    let icons={fireUp:'?',fireDown:'?',shield:'?',speedUp:'?',scatter:'?',bomb:'?'};
    for(let p of this.pw)this.rnd.pwup(p.c*CS,p.r*CS,icons[p.effect]||'?');
    for(let e of this.en)if(e.alive)this.rnd.tank(e.x,e.y,e.dir,e.cl,false);
    if(this.pl&&this.pl.alive)this.rnd.tank(this.pl.x,this.pl.y,this.pl.dir,'#9955dd',true);
    for(let b of this.bl)this.rnd.bullet(b.x,b.y);
    let al=this.en.filter(e=>e.alive).length;
    this.rnd.hud(1,this.tot-this.spd+al,this.pl?this.pl.hp:0,this.pl?this.pl.fl:1);
    if(this.state===ST.OVER)this.rnd.end(false);
    if(this.state===ST.WIN)this.rnd.end(true);
  }
  run(){let loop=ts=>{this.upd(ts);this.render();requestAnimationFrame(loop);};requestAnimationFrame(loop);}
}

// ========== BOOT ==========
let cv=document.getElementById('gameCanvas');
cv.width=GAME_W;cv.height=GAME_H;
new Game(cv).run();
