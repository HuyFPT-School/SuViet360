/**
 * Generates an inline HTML page with a complete Phaser 2D game for mobile WebView.
 * Features: tilemap, Matter.js physics, camera follow, quiz popups, hint popups, touch D-pad.
 */
export function generateGameHtml(lesson: {
  title: string;
  game: {
    tilemapJsonUrl: string;
    tilesets: { name: string; imageUrl: string }[];
    character: { animations: Record<string, { key: string; imageUrl: string }[]> };
    spawnPoint: { x: number; y: number };
  };
}): string {
  const tilemapUrl = lesson.game.tilemapJsonUrl;
  const tilesetImages = lesson.game.tilesets || [];
  const spawn = lesson.game.spawnPoint || { x: 400, y: 300 };

  // Build JS arrays
  const tilesetUrls = tilesetImages.map((t) => `"${t.imageUrl}"`).join(',');
  const tilesetKeys = tilesetImages.map((t) => `"${t.name}"`).join(',');
  const idleFrames = (lesson.game.character?.animations?.idle || []).map((f) => `"${f.imageUrl}"`).join(',');
  const runFrames = (lesson.game.character?.animations?.run || []).map((f) => `"${f.imageUrl}"`).join(',');
  const allFrameUrls = [...(lesson.game.character?.animations?.idle || []), ...(lesson.game.character?.animations?.run || [])].map((f) => `"${f.imageUrl}"`).join(',');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>${escapeHtml(lesson.title)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#1a0a06;touch-action:none;}
canvas{display:block}
#dpad{position:fixed;bottom:16px;left:12px;z-index:200;display:grid;grid-template-columns:52px 52px 52px;grid-template-rows:52px 52px 52px;opacity:0.9;user-select:none;-webkit-user-select:none;}
.dbtn{width:48px;height:48px;border-radius:10px;border:2px solid rgba(184,134,11,0.85);background:rgba(26,10,6,0.82);display:flex;align-items:center;justify-content:center;font-size:26px;color:#ffd700;margin:2px;}
.dbtn:active{background:rgba(184,134,11,0.5);transform:scale(0.9)}
.empty{background:transparent;border:none}
#quiz-popup{display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:88%;max-width:520px;background:rgba(255,248,220,0.97);border:3px solid #8B6914;border-radius:12px;padding:14px 18px;font-family:serif;font-size:15px;line-height:1.45;color:#3b2000;box-shadow:0 6px 28px rgba(0,0,0,0.6);z-index:300;pointer-events:auto;}
#quiz-popup h4{margin-bottom:6px;font-size:16px;color:#5c3a00;border-bottom:1px solid #d4b96a;padding-bottom:6px;}
#quiz-popup .q-question{margin-bottom:10px;font-weight:600;font-size:15px;}
#quiz-popup .q-options{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
#quiz-popup .q-opt{padding:8px 12px;border:2px solid #b8860b;border-radius:8px;background:#fff8e1;color:#3b2000;font-size:14px;font-weight:600;cursor:pointer;text-align:left;transition:background 0.15s;}
#quiz-popup .q-opt:active{background:#f5deb3}
#quiz-popup .q-opt.correct{background:#2e7d32;color:#fff;border-color:#1b5e20}
#quiz-popup .q-opt.wrong{background:#c62828;color:#fff;border-color:#8b0000}
#quiz-popup .q-close{display:block;margin:10px auto 0;padding:6px 24px;background:#8B6914;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer;}
#hint-popup{display:none;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:88%;max-width:520px;background:rgba(240,248,255,0.97);border:3px solid #1e5a8b;border-radius:12px;padding:14px 18px;font-family:serif;font-size:15px;line-height:1.45;color:#0a2a40;box-shadow:0 6px 28px rgba(0,0,0,0.6);z-index:300;}
#hint-popup h4{margin-bottom:6px;font-size:16px;color:#0a2a40;border-bottom:1px solid #7bb3d9;padding-bottom:6px;}
#hint-popup .h-close{display:block;margin:10px auto 0;padding:6px 24px;background:#1e5a8b;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:700;cursor:pointer;}
#score-bar{position:fixed;top:8px;right:8px;z-index:200;background:rgba(0,0,0,0.65);color:#ffd700;padding:4px 12px;border-radius:8px;font-family:serif;font-size:14px;font-weight:700;}
</style>
</head>
<body>
<div id="dpad">
<div class="empty"></div><div class="dbtn" id="bu">▲</div><div class="empty"></div>
<div class="dbtn" id="bl">◀</div><div class="empty"></div><div class="dbtn" id="br">▶</div>
<div class="empty"></div><div class="dbtn" id="bd">▼</div><div class="empty"></div>
</div>
<div id="quiz-popup"><h4></h4><div class="q-question"></div><div class="q-options"></div><button class="q-close" onclick="closePopup('quiz-popup')">Đóng</button></div>
<div id="hint-popup"><h4></h4><p></p><button class="h-close" onclick="closePopup('hint-popup')">Đóng</button></div>
<div id="score-bar">🏆 0/0</div>
<script src="https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js"></script>
<script>
(function(){
var W=window.innerWidth,H=window.innerHeight;
var tilemapUrl="${tilemapUrl}";
var tilesetUrls=[${tilesetUrls}];
var tilesetKeys=[${tilesetKeys}];
var idleUrls=[${idleFrames}];
var runUrls=[${runFrames}];
var allUrls=[${allFrameUrls}];
var spawnX=${spawn.x},spawnY=${spawn.y};
var keys={up:false,down:false,left:false,right:false};
var SPEED=5;
var INTERACT_DIST=70;
var quizData=[];
var hintData=[];
var currentHintId=null;
var currentQuiz=null;
var dismissedHints=new Set();
var correctCount=0;
var answeredIds=new Set();
var isAnswering=false;
var bgTilesetKey=tilesetKeys[0]||null;

// Expose closePopup globally for onclick handlers
window.closePopup=function(id) {
  document.getElementById(id).style.display='none';
  if(id==='hint-popup'&&currentHintId!==null){dismissedHints.add(currentHintId);currentHintId=null;}
  if(id==='quiz-popup'){if(currentQuiz!==null){answeredIds.add(currentQuiz);}currentQuiz=null;isAnswering=false;}
};

['up','down','left','right'].forEach(function(d){
  var b=document.getElementById('b'+d[0]);if(!b)return;
  b.addEventListener('pointerdown',function(e){e.preventDefault();keys[d]=true;});
  b.addEventListener('pointerup',function(e){e.preventDefault();keys[d]=false;});
  b.addEventListener('pointerleave',function(e){keys[d]=false;});
});

function showQuiz(q){
  currentQuiz=q.id;
  var el=document.getElementById('quiz-popup');
  el.querySelector('h4').textContent=q.title||'Câu hỏi';
  el.querySelector('.q-question').textContent=q.question;
  var opts=el.querySelector('.q-options');
  opts.innerHTML='';
  ['A','B','C','D'].forEach(function(k){
    var ans=q['dapAn'+k];
    if(!ans)return;
    var btn=document.createElement('button');
    btn.className='q-opt';
    btn.textContent=k+'. '+ans;
    btn.onclick=function(){
      if(isAnswering)return;
      isAnswering=true;
      if(!answeredIds.has(q.id)){answeredIds.add(q.id);if(ans.trim().toLowerCase()===q.answer.trim().toLowerCase())correctCount++;updateScore();}
      var all=opts.querySelectorAll('.q-opt');
      all.forEach(function(a){
        a.disabled=true;a.style.pointerEvents='none';
        if(a.textContent.slice(0,1)===q.answer.slice(0,1))a.classList.add('correct');
        else if(a===btn&&ans.trim().toLowerCase()!==q.answer.trim().toLowerCase())a.classList.add('wrong');
      });
      setTimeout(function(){el.style.display='none';isAnswering=false;currentQuiz=null;},2000);
    };
    opts.appendChild(btn);
  });
  el.style.display='block';
}

function showHint(h,id){
  currentHintId=id;
  var el=document.getElementById('hint-popup');
  el.querySelector('h4').textContent=h.title||'Gợi ý';
  el.querySelector('p').textContent=h.text;
  el.style.display='block';
}

function updateScore(){
  document.getElementById('score-bar').textContent='🏆 '+correctCount+'/'+quizData.length;
}

var config={
  type:Phaser.AUTO,width:W,height:H,backgroundColor:'#1a0a06',
  physics:{default:'matter',matter:{gravity:{y:0},debug:false}},
  scene:{preload:preload,create:create,update:update},
  scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH}
};
var game=new Phaser.Game(config);
var player,cursors,mapW=1920,mapH=1088;

function preload(){
  if(tilemapUrl)this.load.tilemapTiledJSON('map',tilemapUrl);
  for(var i=0;i<tilesetUrls.length;i++){if(tilesetUrls[i])this.load.image(tilesetKeys[i]||('ts'+i),tilesetUrls[i]);}
  var allFrames=[];for(var j=0;j<idleUrls.length;j++){if(idleUrls[j]){var k='idle'+j;this.load.image(k,idleUrls[j]);allFrames.push({key:k,url:idleUrls[j]});}}
  for(var r=0;r<runUrls.length;r++){if(runUrls[r]){var k2='run'+r;this.load.image(k2,runUrls[r]);allFrames.push({key:k2,url:runUrls[r]});}}
}

function create(){
  var scene=this;
  quizData=[];hintData=[];correctCount=0;answeredIds=new Set();dismissedHints=new Set();currentHintId=null;currentQuiz=null;updateScore();

  // ── Tilemap ──
  var map=null;
  try{map=scene.make.tilemap({key:'map'});}catch(e){}
  var mapData=scene.cache.tilemap.get('map')?.data;
  if(map){mapW=map.widthInPixels||1920;mapH=map.heightInPixels||1088;}

  // Background image
  if(bgTilesetKey&&scene.textures.exists(bgTilesetKey)){
    scene.add.image(0,0,bgTilesetKey).setOrigin(0,0).setDisplaySize(mapW,mapH).setDepth(-1);
  }

  // Tile layers
  if(map){
    var phaserTs=[];
    for(var i=0;i<tilesetKeys.length;i++){
      if(tilesetKeys[i]){try{var ts=map.addTilesetImage(tilesetKeys[i],tilesetKeys[i]);if(ts)phaserTs.push(ts);}catch(e){}}
    }
    var tileLayers=(mapData?.layers||[]).filter(function(l){return l.type==='tilelayer'});
    tileLayers.forEach(function(ld,idx){
      try{var layer=map.createLayer(ld.name,phaserTs,0,0);if(layer)layer.setDepth(1+idx);}catch(e){}
    });
  }

  // ── Object layers: questions & hints & colliders ──
  var objLayers=(mapData?.layers||[]).filter(function(l){return l.type==='objectgroup'&&Array.isArray(l.objects)});
  objLayers.forEach(function(ol){
    (ol.objects||[]).forEach(function(obj){
      var props={};
      if(Array.isArray(obj.properties))obj.properties.forEach(function(p){if(p.name)props[p.name]=String(p.value);});

      var cx=obj.x||0,cy=obj.y||0;
      if(obj.width&&obj.height){cx+=obj.width/2;cy+=obj.height/2;}

      // Matter colliders
      if(obj.polygon&&obj.polygon.length>0){
        var pts=obj.polygon;var pcx=0,pcy=0;
        pts.forEach(function(p){pcx+=p.x;pcy+=p.y;});
        pcx/=pts.length;pcy/=pts.length;
        var verts=pts.map(function(p){return{x:p.x-pcx,y:p.y-pcy}});
        try{scene.matter.add.fromVertices((obj.x||0)+pcx,(obj.y||0)+pcy,verts,{isStatic:true,friction:0,restitution:0},true);}catch(e){}
      }else if(obj.width&&obj.height){
        scene.matter.add.rectangle(cx,cy,obj.width,obj.height,{isStatic:true,friction:0,restitution:0});
      }

      var objTitle=(obj.name||'').replace(/_/g,' ');

      // Question layer
      if(ol.name==='Layer_CauHoi'){
        // Animated question mark marker
        var qContainer=scene.add.container(cx,cy);
        // Outer glow ring
        var glow=scene.add.graphics();
        glow.fillStyle(0xc6eb34,0.25);
        glow.fillCircle(0,0,24);
        qContainer.add(glow);
        // Main circle
        var circ=scene.add.graphics();
        circ.fillStyle(0xc6eb34,0.9);
        circ.fillCircle(0,0,18);
        circ.lineStyle(2.5,0x8B6914,1);
        circ.strokeCircle(0,0,18);
        qContainer.add(circ);
        // Question mark text
        var qtxt=scene.add.text(0,0,'?',{fontSize:'22px',fontFamily:'serif',fontWeight:'bold',color:'#5c3a00'}).setOrigin(0.5,0.5);
        qContainer.add(qtxt);
        qContainer.setDepth(90);
        // Floating hint text above
        scene.add.text(cx,cy-30,objTitle||'❓',{fontSize:'13px',color:'#ffd700',fontWeight:'bold',backgroundColor:'#00000088',padding:{x:6,y:2}}).setOrigin(0.5).setDepth(91);
        // Pulsing tween
        scene.tweens.add({targets:qContainer,scaleX:1.15,scaleY:1.15,duration:800,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
        // Store reference for quizData
        var qSprite=qContainer;

        var cauHoi=props['cau_hoi']||props['cau hoi'];
        var dapAnA=props['dap_an_A']||props['dap an A'];
        var dapAnB=props['dap_an_B']||props['dap an B'];
        var dapAnC=props['dap_an_C']||props['dap an C'];
        var dapAnD=props['dap_an_D']||props['dap an D'];
        var dapAnDung=props['dap_an_dung']||props['dap an dung'];

        // Parse pipe-delimited questions
        if(cauHoi&&cauHoi.includes('|')){
          var parts=cauHoi.split('|').map(function(x){return x.trim()});
          if(parts.length>=6){cauHoi=parts[0];dapAnA=parts[1];dapAnB=parts[2];dapAnC=parts[3];dapAnD=parts[4];dapAnDung=parts[5];}
        }

        quizData.push({
          id:obj.id?String(obj.id):'q_'+cx+'_'+cy,
          cx:cx,cy:cy,
          title:objTitle||'Câu Hỏi',
          question:cauHoi||'Nội dung câu hỏi chưa nhập',
          dapAnA:dapAnA||'',dapAnB:dapAnB||'',dapAnC:dapAnC||'',dapAnD:dapAnD||'',
          answer:dapAnDung||'',
          sprite:qSprite
        });
      }

      // Hint layer
      if(ol.name==='Layer_GoiY'){
        var goiY=props['goi_y']||props['goi y'];
        if(!goiY&&obj.properties&&obj.properties.length>0)goiY=String(obj.properties[0].value||'');
        hintData.push({
          id:'h_'+cx+'_'+cy,
          cx:cx,cy:cy,
          title:objTitle||'Gợi Ý',
          text:goiY||'Thông tin đang cập nhật'
        });
      }
    });
  });

  updateScore();

  // ── Player ──
  var startFrame=idleUrls.length>0?'idle0':(allUrls.length>0?'idle0':null);
  if(!startFrame){
    var gfx=scene.add.graphics();gfx.fillStyle(0xb8860b,1);gfx.fillRect(0,0,32,48);
    gfx.generateTexture('pl_fb',32,48);gfx.destroy();startFrame='pl_fb';
  }
  player=scene.matter.add.sprite(spawnX,spawnY,startFrame);
  player.setDepth(100);
  player.setDisplaySize(40,56);
  player.setBody({type:'rectangle',width:28,height:38});
  player.setFixedRotation();
  player.setFriction(0);
  player.setFrictionAir(0.15);

  // Animations
  if(idleUrls.length>0){
    scene.anims.create({key:'idle',frames:idleUrls.map(function(f,i){return{key:'idle'+i}}),frameRate:6,repeat:-1});
    player.play('idle');
  }
  if(runUrls.length>0){
    scene.anims.create({key:'run',frames:runUrls.map(function(f,i){return{key:'run'+i}}),frameRate:10,repeat:-1});
  }

  // World & camera
  scene.matter.world.setBounds(0,0,mapW,mapH);
  scene.cameras.main.setBounds(0,0,mapW,mapH);
  scene.cameras.main.startFollow(player,true,0.08,0.08);

  // Guide text
  scene.add.text(mapW/2,16,'👆 Dùng mũi tên để di chuyển — đến gần ❓ để trả lời câu hỏi',{
    fontSize:'13px',color:'#ffffff',backgroundColor:'#00000066',padding:{x:10,y:4}
  }).setOrigin(0.5,0).setScrollFactor(0).setDepth(200);

  cursors=scene.input.keyboard.createCursorKeys();
}

function update(){
  if(!player)return;
  var vx=0,vy=0;
  if(cursors.left.isDown||keys.left)vx=-SPEED;
  else if(cursors.right.isDown||keys.right)vx=SPEED;
  if(cursors.up.isDown||keys.up)vy=-SPEED;
  else if(cursors.down.isDown||keys.down)vy=SPEED;
  player.setVelocity(vx,vy);

  if(vx!==0||vy!==0){
    if(runUrls.length>0&&player.anims&&!player.anims.currentAnim?.key?.startsWith('run')){try{player.play('run');}catch(e){}}
    player.setFlipX(vx<0);
  }else{
    if(idleUrls.length>0&&player.anims&&!player.anims.currentAnim?.key?.startsWith('idle')){try{player.play('idle');}catch(e){}}
  }

  // Check proximity to questions/hints
  if(!isAnswering&&player.body&&!currentQuiz&&!currentHintId){
    var px=player.body.position.x,py=player.body.position.y;

    for(var i=0;i<quizData.length;i++){
      var q=quizData[i];
      if(answeredIds.has(q.id))continue;
      var dx=px-q.cx,dy=py-q.cy;
      if(Math.sqrt(dx*dx+dy*dy)<INTERACT_DIST){
        showQuiz(q);
        return;
      }
    }
    for(var j=0;j<hintData.length;j++){
      var h=hintData[j];
      if(dismissedHints.has(h.id))continue;
      if(currentHintId&&currentHintId!==h.id)continue;
      var hdx=px-h.cx,hdy=py-h.cy;
      if(Math.sqrt(hdx*hdx+hdy*hdy)<INTERACT_DIST){
        showHint(h,h.id);
        return;
      }
    }
  }
}

window.addEventListener('resize',function(){
  W=window.innerWidth;H=window.innerHeight;
  game.scale.resize(W,H);
});
})();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
