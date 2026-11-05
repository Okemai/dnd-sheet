(function(){
"use strict";
var G = GOB, KEY = "gob-sheet-v1", PKEY = "gob-palette";
var ABN = {}; G.AB.forEach(function(a){ ABN[a[0]] = a; });
var SKN = {}; G.SK.forEach(function(s){ SKN[s[0]] = s; });

/* ---------------- helpers ---------------- */
function $(s){ return document.querySelector(s); }
function esc(v){ return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
function num(v){ v = parseFloat(String(v).replace(",",".").replace("−","-")); return isFinite(v) ? v : 0; }
function sg(n){ return n>=0 ? "+"+n : "−"+(-n); }
function rnd(n){ return 1 + Math.floor(Math.random()*n); }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function getPath(o,p){ return p.split(".").reduce(function(a,k){ return a==null?undefined:a[k]; }, o); }
function setPath(o,p,v){ var ks=p.split("."), last=ks.pop(); var t=ks.reduce(function(a,k){ if(a[k]==null) a[k]={}; return a[k]; }, o); t[last]=v; }
function nl(t){ return esc(t).replace(/\n/g,"<br>"); }

/* ---------------- state ---------------- */
var S;
function load(){
  var raw = null; try { raw = localStorage.getItem(KEY); } catch(e){}
  if (raw){ try { S = normalize(JSON.parse(raw)); return; } catch(e){} }
  S = clone(G.SEED);
}
function normalize(o){
  var b = clone(G.SEED);
  Object.keys(b).forEach(function(k){ if (o[k] === undefined) o[k] = b[k]; });
  if ((o.v||1) < 2){ /* v2: слова чар, эффекты, внешность */
    (o.spells||[]).forEach(function(sp){ var src = b.spells.filter(function(x){ return x.en && x.en===sp.en; })[0]; if (!src) return;
      ["incant","incantRu","flavor","fx"].forEach(function(k){ if (!sp[k]) sp[k]=src[k]; });
      if (sp.en==="Thunderwave" && sp.type==="громом") sp.type="звуком"; });
    o.v = 2;
  }
  if (o.v < 3){ /* v3: короткие слова заговоров, транскрипция, кровавый сглаз, рост гоблина */
    (o.spells||[]).forEach(function(sp){ var src = b.spells.filter(function(x){ return x.en && x.en===sp.en; })[0]; if (!src) return;
      ["incant","incantTr","incantRu","flavor","fx","variants"].forEach(function(k){ if (src[k]!==undefined) sp[k]=clone(src[k]); }); });
    if (o.look){ if (o.look.height==="Невысокий") o.look.height=b.look.height; if (o.look.weight==="Лёгкий"||o.look.weight==="Легок") o.look.weight=b.look.weight; }
    if (/самокрут/.test(o.appearance||"")) o.appearance=b.appearance;
    o.feats && o.feats.forEach(function(f){ if (f.name==="Сосуд гения") f.desc=b.feats.filter(function(x){return x.name==="Сосуд гения";})[0].desc; });
    o.v = 3;
  }
  if (o.v < 4){ /* v4: фальшивая личность от Питера Холла */
    if (!(o.items||[]).some(function(it){ return it.name==="Подорожная грамота"; })) o.items.push(clone(b.items.filter(function(it){ return it.name==="Подорожная грамота"; })[0]));
    o.v = 4;
  }
  if (o.v < 5){ /* v5: гадальная колода */
    if (!(o.items||[]).some(function(it){ return it.tarot; })) o.items.splice(Math.max(0,o.items.length-1),0,clone(b.items.filter(function(it){ return it.tarot; })[0]));
    o.v = 5;
  }
  ["abil","coins","look","prof","death","turn","alias"].forEach(function(k){ Object.keys(b[k]).forEach(function(j){ if (o[k][j] === undefined) o[k][j] = b[k][j]; }); });
  return o;
}
var saveT = null;
function save(){
  clearTimeout(saveT);
  saveT = setTimeout(function(){
    try { localStorage.setItem(KEY, JSON.stringify(S)); status("Сохранено"); } catch(e){ status("Не сохраняется!"); }
  }, 250);
}
function status(t){ var el=$("#status"); if(!el) return; el.textContent=t; el.classList.add("on"); clearTimeout(status.t); status.t=setTimeout(function(){ el.classList.remove("on"); }, 1400); }

/* ---------------- rules ---------------- */
function M(k){ return Math.floor((num(S.abil[k]) - 10)/2); }
function lvl(){ return Math.max(1, Math.min(20, num(S.level)||1)); }
function PB(){ return Math.ceil(lvl()/4) + 1; }
function saveB(k){ return M(k) + (S.saveProf[k] ? PB() : 0); }
function skP(k){ return num(S.skills[k]); }
function skillB(k){ return M(SKN[k][2]) + skP(k)*PB(); }
function passive(){ return 10 + skillB("prc"); }
function initB(){ return M("dex") + num(S.initBonus); }
function sDC(){ return 8 + PB() + M(S.castAbil); }
function sAtk(){ return PB() + M(S.castAbil); }
function pact(){ var p = G.PACT[lvl()]; return {n:p[0], c:p[1]}; }
function slotsLeft(){ return Math.max(0, pact().n - num(S.slotsUsed)); }
function beams(){ var l=lvl(); return l>=17?4:l>=11?3:l>=5?2:1; }
function resMax(r){ var m=String(r.max).trim(); return m==="lvl"?lvl():m==="pb"?PB():Math.max(0,num(m)); }
function resLeft(r){ return Math.max(0, resMax(r) - num(r.used)); }
function resVal(x){ return x==="lvl"?lvl():x==="pb"?PB():num(x); }
function hdTotal(){ return lvl(); }
function atkHit(a){ return M(a.abil) + (a.prof?PB():0) + num(a.bonus); }
function atkDmgMod(a){ return a.addMod ? M(a.abil) : 0; }
function dmgStr(dice, m){ return dice + (m ? (m>0?"+":"−")+Math.abs(m) : ""); }
var RESETN = {turn:"за ход", short:"кор. отдых", long:"долг. отдых"};

/* ---------------- dice ---------------- */
function parseDice(s){
  s = String(s||"").replace(/\s/g,"").replace(/[кk]/gi,"d").replace(/−/g,"-");
  var re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/gi, m, terms=[], flat=0;
  while ((m = re.exec(s))){
    if (m[3]) terms.push({n:(+m[2]||1), d:+m[3], neg:m[1]==="-"});
    else if (m[5]) flat += (m[4]==="-"?-1:1) * (+m[5]);
  }
  return {terms:terms, flat:flat};
}
function rollTerms(terms, crit){
  return terms.map(function(t){ var n=t.n*(crit?2:1), r=[]; for (var i=0;i<n;i++) r.push(rnd(t.d)); return {d:t.d, r:r, neg:t.neg, sum:r.reduce(function(a,b){return a+b;},0)*(t.neg?-1:1)}; });
}
function diceRu(s){ return String(s).replace(/d/g,"к"); }

/* ---------------- shell ---------------- */
var TABS = [["fight","Бой"],["sheet","Лист"],["magic","Чары"],["bag","Мешок"],["soul","Душа"]];
var view = "fight"; try { view = localStorage.getItem("gob-view") || "fight"; } catch(e){}
var EDIT = false;

document.getElementById("shell").innerHTML =
  '<header class="top"><div class="top-in">'+
    '<button type="button" class="ava" data-act="mirror" aria-label="Заглянуть в зеркало"><img src="img/portrait.webp" alt=""></button>'+
    '<div class="who"><b id="h-name"></b><small id="h-sub"></small></div>'+
    '<div class="vitals" id="vitals"></div>'+
    '<div class="tools"><span id="status" class="status" role="status" aria-live="polite"></span>'+
      '<button type="button" class="btn edit-btn" data-act="edit" id="b-edit" aria-pressed="false">✎ Правка</button>'+
      '<button type="button" class="btn icon" data-act="menu" aria-label="Меню">☰</button></div>'+
  '</div>'+
  '<nav class="tabs" role="tablist">'+TABS.map(function(t){ return '<button type="button" role="tab" data-tab="'+t[0]+'">'+t[1]+'</button>'; }).join("")+'</nav></header>'+
  '<main id="view" class="wrap"></main>'+
  '<div id="rs" class="rs" hidden><div class="rs-back" data-act="rs-close"></div><div class="rs-card" role="dialog" aria-modal="true" aria-label="Бросок"><button type="button" class="x" data-act="rs-close" aria-label="Закрыть">×</button><div id="rs-body"></div></div></div>'+
  '<div id="modal" class="modal" hidden><div class="m-back" data-act="m-close"></div><div class="m-card" role="dialog" aria-modal="true"><button type="button" class="x" data-act="m-close" aria-label="Закрыть">×</button><div id="m-body"></div></div></div>'+
  '<div id="mirror" class="mirror" hidden data-act="mirror-close"></div>'+
  '<div id="cast" class="cast" hidden data-act="cast-close" role="dialog" aria-modal="true" aria-label="Заклинание"></div>'+
  '<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>'+
  '<input type="file" id="imp" accept=".json,application/json" hidden>';

(function spores(){ var h='<div class="spores" aria-hidden="true">'; for (var i=0;i<18;i++) h+='<i style="left:'+(Math.random()*100).toFixed(1)+'%;top:'+(Math.random()*100).toFixed(1)+'%;animation-delay:'+(Math.random()*9).toFixed(1)+'s;animation-duration:'+(9+Math.random()*9).toFixed(1)+'s"></i>'; document.body.insertAdjacentHTML("afterbegin", h+'</div>'); })();

/* ---------------- themes ---------------- */
var PALS = [
  {k:"bog", n:"Болото", d:"Мох, кожа и янтарные глаза", c:["#12150e","#222a18","#e0a43a","#9bbd52"]},
  {k:"vellum", n:"Пергамент", d:"Светлая страница — для яркого стола", c:["#e6d9b8","#f6eedb","#8a5a12","#4d6a1f"]},
  {k:"mirror", n:"Отражение", d:"Багрянец и золото того, кем он был", c:["#150a0b","#2a1214","#d6b060","#b8343a"]}
];
var pal = "bog"; try { pal = localStorage.getItem(PKEY) || "bog"; } catch(e){}
function applyPal(k){
  if (!PALS.some(function(p){return p.k===k;})) k="bog";
  pal = k; if (k==="bog") document.documentElement.removeAttribute("data-pal"); else document.documentElement.setAttribute("data-pal",k);
  var p = PALS.filter(function(x){return x.k===k;})[0]; var m=document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", p.c[0]);
  var img = document.querySelector(".ava img"); if (img) img.src = k==="mirror" ? "img/mirror.webp" : "img/portrait.webp";
  try { localStorage.setItem(PKEY,k); } catch(e){}
}

/* ---------------- small builders ---------------- */
function lamp(on){ /* перстень джинна — ячейка договора */ return '<svg class="lamp'+(on?' on':'')+'" viewBox="0 0 32 32" aria-hidden="true"><circle class="band" cx="16" cy="20.5" r="8.5"/><path class="rgem" d="M16 2.5l5.5 5.5-5.5 6-5.5-6z"/><path class="facet" d="M10.5 8h11M16 2.5v11.5"/></svg>'; }
function berry(state){ /* искра джинна: пусто / владение / экспертиза */
  state = +state||0;
  return '<span class="gems" aria-hidden="true">'+(state? (state>1?'<i class="gem on"></i><i class="gem on"></i>':'<i class="gem on"></i>') : '<i class="gem"></i>')+'</span>';
}
function pips(n, used, act, attrs){
  var h=''; for (var i=0;i<n;i++) h+='<button type="button" class="pip'+(i<n-used?' on':'')+'" data-act="'+act+'" data-n="'+i+'" '+(attrs||'')+' aria-label="'+(i<n-used?'доступно':'потрачено')+'"></button>';
  return '<span class="pips">'+h+'</span>';
}
function inp(path, o){
  o = o||{}; var v = getPath(S, path); if (v==null) v="";
  var cls = 'in'+(o.cls?' '+o.cls:'');
  if (o.area) return '<textarea class="'+cls+'" data-p="'+path+'" rows="'+(o.rows||3)+'" placeholder="'+esc(o.ph||"")+'">'+esc(v)+'</textarea>';
  if (o.sel) return '<select class="'+cls+'" data-p="'+path+'">'+o.sel.map(function(x){ return '<option value="'+esc(x[0])+'"'+(String(v)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>'; }).join("")+'</select>';
  if (o.chk) return '<input type="checkbox" class="chk" data-p="'+path+'"'+(v?' checked':'')+'>';
  if (o.num) return '<input class="'+cls+' num" data-p="'+path+'" data-t="num" inputmode="numeric" value="'+esc(v)+'" aria-label="'+esc(o.label||"")+'">';
  return '<input class="'+cls+'" data-p="'+path+'" value="'+esc(v)+'" placeholder="'+esc(o.ph||"")+'" aria-label="'+esc(o.label||o.ph||"")+'">';
}
function txt(path, o){ /* поле: в правке — инпут, в игре — текст */
  if (EDIT) return inp(path, o);
  var v = getPath(S, path); return v===""||v==null ? '<span class="dim">'+esc((o&&o.empty)||"—")+'</span>' : (o&&o.area ? nl(v) : esc(v));
}
function card(cls, title, body, extra){ return '<section class="card '+(cls||'')+'">'+(title?'<h2>'+title+(extra||'')+'</h2>':'')+body+'</section>'; }
function C(key){ return '<span data-c="'+key+'">'+calc(key)+'</span>'; }
function calc(key){
  var p = key.split(":"), a = p[1];
  switch (p[0]){
    case "mod": return sg(M(a));
    case "save": return sg(saveB(a));
    case "skill": return sg(skillB(a));
    case "pb": return sg(PB());
    case "dc": return String(sDC());
    case "satk": return sg(sAtk());
    case "pp": return String(passive());
    case "init": return sg(initB());
    case "hit": return sg(atkHit(S.attacks[+a]));
    case "dmg": var at=S.attacks[+a]; return diceRu(dmgStr(at.dice, atkDmgMod(at)));
    case "resmax": return String(resMax(S.res[+a]));
    case "pact": var pp=pact(); return pp.n+" × "+pp.c+" круга";
    case "hd": return (hdTotal()-num(S.hdUsed))+"/"+hdTotal()+" к"+S.hdDie;
    case "beams": return String(beams());
  }
  return "";
}
function refreshCalc(){ document.querySelectorAll("[data-c]").forEach(function(el){ el.textContent = calc(el.getAttribute("data-c")); }); }

/* ---------------- header ---------------- */
function renderTop(){
  $("#h-name").textContent = S.name || "Безымянный";
  $("#h-sub").textContent = [S.race, S.cls+" "+lvl()].filter(Boolean).join(" · ");
  var hpCls = S.hp<=0 ? " down" : S.hp <= S.hpMax/2 ? " low" : "";
  var p = pact(), left = slotsLeft(), lamps="";
  for (var i=0;i<p.n;i++) lamps += lamp(i<left);
  $("#vitals").innerHTML =
    '<button type="button" class="vit hp'+hpCls+'" data-act="hp"><small>Хиты</small><b>'+S.hp+'</b><em>/'+S.hpMax+'</em>'+(S.temp>0?'<span class="tmp">+'+S.temp+'</span>':'')+'</button>'+
    '<div class="vit"><small>КД</small><b>'+S.ac+'</b></div>'+
    '<button type="button" class="vit ini" data-act="roll-init"><small>Иниц.</small><b>'+sg(initB())+'</b></button>'+
    '<button type="button" class="vit slots" data-act="slot-spend" aria-label="Ячейки договора"><small>Ячейки · '+p.c+' кр.</small><span>'+lamps+'</span></button>'+
    (S.conc ? '<button type="button" class="vit conc" data-act="conc-drop"><small>Концентрация</small><b>'+esc(S.conc)+'</b></button>' : '');
  document.querySelectorAll(".tabs [data-tab]").forEach(function(b){ var on=b.getAttribute("data-tab")===view; b.classList.toggle("on",on); b.setAttribute("aria-selected",on); });
  var eb=$("#b-edit"); eb.classList.toggle("on",EDIT); eb.setAttribute("aria-pressed",EDIT); eb.textContent = EDIT ? "✓ Готово" : "✎ Правка";
  document.body.classList.toggle("editing", EDIT);
}

/* ---------------- views ---------------- */
function render(){
  renderTop();
  var h = ({fight:vFight, sheet:vSheet, magic:vMagic, bag:vBag, soul:vSoul})[view]();
  var v = $("#view"); v.innerHTML = h; v.setAttribute("data-view", view);
  autosize();
}

/* ===== Бой ===== */
function vFight(){
  var hp = S.hp, down = hp<=0;
  var hpCard = card("hpcard", "Шкура и кости",
    '<div class="hpbig'+(down?' down':'')+'"><b>'+hp+'</b><span>/ '+S.hpMax+'</span>'+(S.temp>0?'<em>+'+S.temp+' врем.</em>':'')+'</div>'+
    '<div class="hpbar"><i style="width:'+Math.max(0,Math.min(100,hp/S.hpMax*100))+'%"></i>'+(S.temp>0?'<u style="width:'+Math.min(100,S.temp/S.hpMax*100)+'%"></u>':'')+'</div>'+
    '<div class="row3"><button type="button" class="btn bad" data-act="hp" data-mode="dmg">− Урон</button><button type="button" class="btn good" data-act="hp" data-mode="heal">+ Лечение</button><button type="button" class="btn" data-act="hp" data-mode="temp">Врем.</button></div>'+
    (down ? '<div class="death"><div><span class="lab">Успехи</span>'+deathPips("s")+'</div><div><span class="lab">Провалы</span>'+deathPips("f")+'</div><button type="button" class="btn gold" data-act="roll-death">Спасбросок от смерти</button></div>' : '')+
    '<div class="hd"><span>Кости хитов</span><b>'+C("hd")+'</b><button type="button" class="btn small" data-act="hd-roll"'+(num(S.hdUsed)>=hdTotal()?' disabled':'')+'>Потратить</button></div>');

  var stats = '<div class="statline">'+
    stat("КД", S.ac, S.acNote)+
    '<button type="button" class="st tap" data-act="roll-init"><small>Инициатива</small><b>'+C("init")+'</b></button>'+
    stat("Скорость", S.speed+'<i> фт</i>')+
    stat("Мастерство", C("pb"))+
    stat("Пасс. вним.", C("pp"))+'</div>';

  var turn = card("turn", "Мой ход",
    '<div class="econ">'+[["a","Действие"],["b","Бонусное"],["r","Реакция"],["m","Движение"]].map(function(x){ return '<button type="button" class="eco'+(S.turn[x[0]]?' used':'')+'" data-act="eco" data-k="'+x[0]+'">'+x[1]+'</button>'; }).join("")+'</div>'+
    '<button type="button" class="btn gold wide" data-act="new-turn">↻ Новый ход</button>'+
    '<p class="hint">Новый ход снимает отметки и возвращает «Гнев гения».</p>');

  var atk = card("atk", "Чем бить", S.attacks.map(function(a,i){
    return '<div class="arow"><div class="an"><b>'+esc(a.name)+'</b><small>'+esc(a.range||"")+(a.beams&&beams()>1?' · '+beams()+' разряда':'')+'</small></div>'+
      '<button type="button" class="pill hit" data-act="atk" data-i="'+i+'"><small>Атака</small>'+C("hit:"+i)+'</button>'+
      '<button type="button" class="pill dmg" data-act="dmg" data-i="'+i+'"><small>'+esc(a.type||"урон")+'</small>'+C("dmg:"+i)+'</button></div>';
  }).join("") + (EDIT? '' : '<p class="hint">Сглаз и «Гнев гения» добавляются к урону сами — галочками в окне броска.</p>'));

  var sp = card("quick-sp", "Колдовство", spellHead() + S.spells.map(function(s,i){ return quickSpell(s,i); }).join(""), '<button type="button" class="lnk" data-tab="magic">все чары →</button>');

  var res = card("res", "Хитрости", S.res.map(function(r,i){
    return '<div class="resrow"><div><b>'+esc(r.name)+'</b><small>'+esc(RESETN[r.reset]||"")+'</small></div>'+pips(resMax(r), num(r.used), "res", 'data-i="'+i+'"')+'</div>';
  }).join("")+
    '<div class="resrow"><div><b>Вдохновение</b><small>от Мастера</small></div><button type="button" class="insp'+(S.insp?' on':'')+'" data-act="insp" aria-pressed="'+S.insp+'">★</button></div>'+
    (S.hex ? '<div class="hexon">Сглаз висит на цели — +1к6 некротического к каждому попаданию. <button type="button" class="lnk" data-act="conc-drop">снять</button></div>' : ''));

  var saves = card("saves-q", "Спасброски", '<div class="sgrid">'+G.AB.map(function(a){
    return '<button type="button" class="sv'+(S.saveProf[a[0]]?' prof':'')+'" data-act="save" data-k="'+a[0]+'"><small>'+a[1]+'</small><b>'+C("save:"+a[0])+'</b></button>';
  }).join("")+'</div>');

  var fav = G.SK.filter(function(s){ return skP(s[0])>0 || s[0]==="ste"; });
  var skills = card("skills-q", "Ходовые навыки", '<div class="qsk">'+fav.map(function(s){
    return '<button type="button" class="qs" data-act="skill" data-k="'+s[0]+'">'+berry(skP(s[0]))+'<span>'+s[1]+'</span><b>'+C("skill:"+s[0])+'</b></button>';
  }).join("")+'</div>');

  var tray = card("tray", "Кубы", '<div class="dice">'+[4,6,8,10,12,20,100].map(function(d){ return '<button type="button" class="die" data-act="free" data-d="'+d+'">к'+d+'</button>'; }).join("")+'</div>'+
    '<div class="row2"><button type="button" class="btn" data-act="rest" data-k="short">Короткий отдых</button><button type="button" class="btn" data-act="rest" data-k="long">Долгий отдых</button></div>'+
    '<button type="button" class="lnk" data-act="log">журнал бросков →</button>');

  return stats + '<div class="grid g-fight"><div class="col">'+hpCard+turn+saves+'</div><div class="col">'+atk+sp+'</div><div class="col">'+res+skills+tray+'</div></div>';
}
function stat(l, v, n){ return '<div class="st"><small>'+l+'</small><b>'+v+'</b>'+(n?'<em>'+esc(n)+'</em>':'')+'</div>'; }
function deathPips(k){ var h=''; for (var i=0;i<3;i++) h+='<button type="button" class="ds '+k+(i<S.death[k]?' on':'')+'" data-act="death" data-k="'+k+'" data-n="'+i+'" aria-label="'+(k==="s"?"успех":"провал")+'"></button>'; return '<span class="dsr">'+h+'</span>'; }
function spellHead(){
  var p = pact(), left = slotsLeft(), lamps="";
  for (var i=0;i<p.n;i++) lamps += '<button type="button" class="lampb" data-act="slot-toggle" data-n="'+i+'" aria-label="'+(i<left?'ячейка доступна':'ячейка потрачена')+'">'+lamp(i<left)+'</button>';
  return '<div class="sphead"><div><small>Сл спасброска</small><b>'+C("dc")+'</b></div><div><small>Атака чарами</small><b>'+C("satk")+'</b></div><div class="lamps"><small>Ячейки · '+p.c+' круг</small><span>'+lamps+'</span></div></div>';
}
function quickSpell(s,i){
  var btn = s.kind==="attack" ? '<button type="button" class="pill hit" data-act="sp-atk" data-i="'+i+'"><small>Атака</small>'+C("satk")+'</button>'
          : s.kind==="save" ? '<button type="button" class="pill dmg" data-act="sp-cast" data-i="'+i+'"><small>Сл '+C("dc")+' · '+(ABN[s.save]?ABN[s.save][1]:"")+'</small>'+diceRu(upDice(s))+'</button>'
          : s.lvl>0 ? '<button type="button" class="pill" data-act="sp-cast" data-i="'+i+'"><small>'+esc(s.time)+'</small>Наложить</button>'
          : '<span class="pill ghost"><small>'+esc(s.time)+'</small>заговор</span>';
  return '<div class="arow sp"><button type="button" class="an an-b" data-act="cast-show" data-i="'+i+'"><b>'+sigil(s.fx)+esc(s.name)+(s.conc?' <i class="kc" title="Концентрация">К</i>':'')+'</b><small>'+(s.lvl?s.lvl+' круг':'заговор')+' · '+esc(s.range)+'</small></button>'+btn+'</div>';
}
function upDice(s){ /* урон с учётом круга ячейки договора */
  if (!s.dice) return "";
  if (s.lvl>0 && s.upcast){ var extra = pact().c - s.lvl; if (extra>0){ var u=parseDice(s.upcast).terms[0], b=parseDice(s.dice).terms[0]; if (u && b && u.d===b.d) return (b.n+u.n*extra)+"d"+b.d; return s.dice+"+"+(u.n*extra)+"d"+u.d; } }
  return s.dice;
}

/* ===== Лист ===== */
function vSheet(){
  var hero = '<section class="card hero">'+
    '<button type="button" class="portrait" data-act="mirror" aria-label="Заглянуть в зеркало"><img class="pimg" src="'+(pal==="mirror"?"img/mirror.webp":"img/portrait.webp")+'" alt="Портрет">'+'<span class="scrawl">не смотри в зеркало →</span></button>'+
    '<div class="hero-tx">'+
      '<div class="nm">'+(EDIT? inp("name",{cls:"big",label:"Имя"}) : '<h1>'+esc(S.name)+'</h1>')+'</div>'+
      '<div class="idgrid">'+
        idf("Раса","race")+idf("Класс","cls")+idf("Уровень","level",{num:1})+idf("Покровитель","sub")+
        idf("Предыстория","bg")+idf("Мировоззрение","align")+idf("Опыт","xp",{num:1})+idf("Игрок","player",{empty:"—"})+
      '</div>'+
      (EDIT ? inp("quote",{area:1,rows:2,ph:"Фраза-девиз"}) : (S.quote?'<blockquote class="quote">«'+esc(S.quote)+'»</blockquote>':''))+
      (S.appearance && !EDIT ? '<details class="looks"><summary>как он выглядит</summary><p>'+nl(S.appearance)+'</p>'+(S.mirrorLook?'<p class="mirror-l"><b>В зеркале.</b> '+nl(S.mirrorLook)+'</p>':'')+'</details>' : '')+
    '</div></section>';

  var abil = '<div class="abil">'+G.AB.map(function(a){
    return '<div class="ab"><small>'+a[2]+'</small>'+
      '<button type="button" class="abm" data-act="check" data-k="'+a[0]+'" aria-label="Проверка: '+a[2]+'">'+C("mod:"+a[0])+'</button>'+
      '<span class="abs">'+(EDIT? inp("abil."+a[0],{num:1,label:a[2]}) : esc(S.abil[a[0]]))+'</span></div>';
  }).join("")+'</div>';

  var saves = card("saves", "Спасброски", G.AB.map(function(a){
    return '<div class="lrow"><button type="button" class="mark" data-act="tog-save" data-k="'+a[0]+'"'+(EDIT?'':' tabindex="-1"')+' aria-label="Владение">'+berry(S.saveProf[a[0]]?1:0)+'</button>'+
      '<button type="button" class="lr" data-act="save" data-k="'+a[0]+'"><span>'+a[2]+'</span><b>'+C("save:"+a[0])+'</b></button></div>';
  }).join(""));
  var skills = card("skills", "Навыки", G.SK.map(function(s){
    return '<div class="lrow"><button type="button" class="mark" data-act="tog-skill" data-k="'+s[0]+'"'+(EDIT?'':' tabindex="-1"')+' aria-label="Владение">'+berry(skP(s[0]))+'</button>'+
      '<button type="button" class="lr" data-act="skill" data-k="'+s[0]+'"><span>'+s[1]+' <i>'+ABN[s[2]][1]+'</i></span><b>'+C("skill:"+s[0])+'</b></button></div>';
  }).join("") + '<p class="hint">'+(EDIT?'Тапни по искре: пусто → владение → экспертиза.':'Искра джинна — владение, двойная — экспертиза. Тапни навык — бросок.')+'</p>');

  var core = card("core", "Тело", '<div class="coregrid">'+
    cf("КД","ac",{num:1})+cf("Скорость","speed",{num:1})+cf("Макс. хиты","hpMax",{num:1})+cf("Кость хитов","hdDie",{num:1,pre:"к"})+cf("Бонус инициативы","initBonus",{num:1})+
    '<div class="cf"><small>Основа колдовства</small>'+(EDIT?inp("castAbil",{sel:G.AB.map(function(a){return [a[0],a[2]];})}):'<b>'+ABN[S.castAbil][2]+'</b>')+'</div>'+
    '</div>'+(EDIT? '<label class="sub">Откуда КД</label>'+inp("acNote") : '<p class="hint">КД: '+esc(S.acNote)+'</p>'));

  var feats = card("feats", "Умения и способности", S.feats.map(function(f,i){
    if (EDIT) return '<div class="edrow">'+inp("feats."+i+".name",{ph:"Название"})+inp("feats."+i+".src",{ph:"Источник"})+inp("feats."+i+".desc",{area:1,rows:3,ph:"Описание"})+delBtn("feats",i)+'</div>';
    return '<details class="feat"><summary><b>'+esc(f.name)+'</b><small>'+esc(f.src)+'</small></summary><p>'+nl(f.desc)+'</p></details>';
  }).join("")+(EDIT?addBtn("feats","умение"):''));

  var res = EDIT ? card("res-ed", "Ресурсы", S.res.map(function(r,i){
    return '<div class="edrow">'+inp("res."+i+".name",{ph:"Название"})+
      '<div class="ed3"><label>Максимум<br><small>число, lvl или pb</small>'+inp("res."+i+".max",{ph:"1"})+'</label>'+
      '<label>Восстанавливается'+inp("res."+i+".reset",{sel:[["turn","каждый ход"],["short","короткий отдых"],["long","долгий отдых"]]})+'</label>'+
      '<label>Урон-добавка<br><small>пусто, lvl, pb, 1d6…</small>'+inp("res."+i+".dmg",{ph:""})+'</label></div>'+
      inp("res."+i+".note",{ph:"Подсказка"})+delBtn("res",i)+'</div>';
  }).join("")+addBtn("res","ресурс")) : "";

  var profs = card("profs", "Владения и языки", [["armor","Доспехи"],["weapons","Оружие"],["tools","Инструменты"],["langs","Языки"]].map(function(x){
    return '<div class="pf"><small>'+x[1]+'</small><div>'+txt("prof."+x[0],{area:EDIT})+'</div></div>';
  }).join(""));

  var atkEd = EDIT ? card("atk-ed", "Атаки", S.attacks.map(function(a,i){
    return '<div class="edrow">'+inp("attacks."+i+".name",{ph:"Название"})+
      '<div class="ed3"><label>Хар-ка'+inp("attacks."+i+".abil",{sel:G.AB.map(function(x){return [x[0],x[1]];})})+'</label>'+
      '<label>Урон'+inp("attacks."+i+".dice",{ph:"1d6"})+'</label><label>Вид урона'+inp("attacks."+i+".type",{ph:"рубящий"})+'</label></div>'+
      '<div class="ed3"><label>Доп. к атаке'+inp("attacks."+i+".bonus",{num:1})+'</label><label>Дистанция'+inp("attacks."+i+".range",{ph:"5 фт"})+'</label>'+
      '<span class="chks"><label>'+inp("attacks."+i+".prof",{chk:1})+' владение</label><label>'+inp("attacks."+i+".addMod",{chk:1})+' мод. к урону</label><label>'+inp("attacks."+i+".beams",{chk:1})+' разряды</label></span></div>'+
      '<p class="hint">Итог: атака '+C("hit:"+i)+', урон '+C("dmg:"+i)+'</p>'+delBtn("attacks",i)+'</div>';
  }).join("")+addBtn("attacks","атаку")) : "";

  return hero + abil + '<div class="grid g-sheet"><div class="col">'+saves+core+'</div><div class="col">'+skills+'</div><div class="col">'+feats+profs+'</div></div>'+
    (EDIT ? '<div class="grid g-two">'+'<div class="col">'+atkEd+'</div><div class="col">'+res+'</div></div>' : '');
}
function idf(l, path, o){ return '<div class="idf"><small>'+l+'</small><div>'+txt(path,o)+'</div></div>'; }
function cf(l, path, o){ return '<div class="cf"><small>'+l+'</small>'+(EDIT?inp(path,o):'<b>'+((o&&o.pre)||"")+esc(getPath(S,path))+'</b>')+'</div>'; }
function delBtn(list,i){ return '<button type="button" class="del" data-act="del" data-l="'+list+'" data-i="'+i+'">удалить</button>'; }
function addBtn(list,w){ return '<button type="button" class="btn small add" data-act="add" data-l="'+list+'">+ '+w+'</button>'; }

/* ===== Чары ===== */
function vMagic(){
  var head = card("mag-head", "Магия договора",
    '<div class="maghead"><div><small>Основа</small><b>'+ABN[S.castAbil][2]+'</b></div><div><small>Сл спасброска</small><b>'+C("dc")+'</b></div><div><small>Атака</small><b>'+C("satk")+'</b></div><div><small>Ячейки</small><b>'+C("pact")+'</b></div></div>'+
    spellHead().replace('class="sphead"','class="sphead only-lamps"')+
    '<p class="hint">Ячейки колдуна возвращаются после короткого отдыха. Заклинания всегда накладываются ячейкой высшего круга — урон пересчитан сам.</p>'+
    (S.conc?'<div class="hexon">Концентрация: <b>'+esc(S.conc)+'</b> <button type="button" class="lnk" data-act="conc-drop">прервать</button></div>':''));
  var groups = {};
  S.spells.forEach(function(s,i){ (groups[s.lvl]=groups[s.lvl]||[]).push(i); });
  var body = Object.keys(groups).sort(function(a,b){return a-b;}).map(function(l){
    return '<h3 class="lvlh">'+(+l===0?'Заговоры':l+' круг')+'</h3><div class="spgrid">'+groups[l].map(function(i){ return spellCard(S.spells[i], i); }).join("")+'</div>';
  }).join("");
  return head + body + (EDIT?addBtn("spells","заклинание"):'');
}
function spellCard(s,i){
  if (EDIT){
    var P="spells."+i+".";
    return '<section class="card spell ed"><div class="edrow">'+inp(P+"name",{ph:"Название"})+inp(P+"en",{ph:"English"})+
      '<div class="ed3"><label>Круг'+inp(P+"lvl",{num:1})+'</label><label>Школа'+inp(P+"school")+'</label><label>Время'+inp(P+"time")+'</label></div>'+
      '<div class="ed3"><label>Дистанция'+inp(P+"range")+'</label><label>Длительность'+inp(P+"dur")+'</label><label>Компоненты'+inp(P+"comp")+'</label></div>'+
      '<div class="ed3"><label>Тип'+inp(P+"kind",{sel:[["util","без броска"],["attack","атака заклинанием"],["save","спасбросок"]]})+'</label>'+
      '<label>Спасбросок'+inp(P+"save",{sel:[["",""]].concat(G.AB.map(function(a){return [a[0],a[2]];}))})+'</label>'+
      '<label>Урон / вид'+inp(P+"dice",{ph:"2d8"})+inp(P+"type",{ph:"громом"})+'</label></div>'+
      '<div class="ed3"><label>Усиление за круг'+inp(P+"upcast",{ph:"1d8"})+'</label><span class="chks"><label>'+inp(P+"conc",{chk:1})+' концентрация</label><label>'+inp(P+"beams",{chk:1})+' разряды</label><label>'+inp(P+"hex",{chk:1})+' это сглаз</label></span></div>'+
      '<div class="ed3"><label>Слова чар'+inp(P+"incant",{ph:"Tinwë — rista!"})+'</label><label>Как читать'+inp(P+"incantTr",{ph:"Ти́нвэ — ри́ста!"})+'</label><label>Перевод'+inp(P+"incantRu",{ph:"Искра — разорви!"})+'</label></div>'+
      '<div class="ed3"><label>Эффект'+inp(P+"fx",{sel:FXL})+'</label></div>'+
      (s.variants&&s.variants.length ? s.variants.map(function(v,k){ return '<div class="varrow"><label class="sub">Вариант '+(k+1)+'</label>'+inp(P+"variants."+k+".n",{ph:"Название варианта"})+inp(P+"variants."+k+".t",{area:1,rows:4,ph:"Как это выглядит"})+'<button type="button" class="del" data-act="var-del" data-i="'+i+'" data-k="'+k+'">удалить вариант</button></div>'; }).join("")
        : '<label class="sub">Как это выглядит у Ааза</label>'+inp(P+"flavor",{area:1,rows:4,ph:"Что видят все вокруг, когда он колдует"}))+
      '<button type="button" class="btn small add" data-act="var-add" data-i="'+i+'">+ вариант описания</button>'+
      '<label class="sub">Правила</label>'+inp(P+"desc",{area:1,rows:5,ph:"Описание"})+delBtn("spells",i)+'</div></section>';
  }
  var act = s.kind==="attack" ? '<button type="button" class="btn gold" data-act="sp-atk" data-i="'+i+'">Атака '+C("satk")+'</button>'
          : s.kind==="save" ? '<button type="button" class="btn gold" data-act="sp-cast" data-i="'+i+'">Наложить · Сл '+C("dc")+'</button>'
          : s.lvl>0 ? '<button type="button" class="btn gold" data-act="sp-cast" data-i="'+i+'">Наложить</button>' : '';
  var dmg = s.dice ? '<span class="chip warm">'+diceRu(upDice(s))+(s.beams&&beams()>1?' × '+beams():'')+' '+esc(s.type||"")+'</span>' : '';
  return '<section class="card spell fx-'+(s.fx||"sparks")+'"><div class="sp-t"><h4>'+esc(s.name)+'</h4><small>'+esc(s.en||"")+(s.school?' · '+esc(s.school):'')+'</small></div>'+
    '<div class="chips"><span class="chip">'+esc(s.time)+'</span><span class="chip">'+esc(s.range)+'</span><span class="chip">'+esc(s.dur)+'</span><span class="chip">'+esc(s.comp)+'</span>'+(s.conc && !/концентр/i.test(s.dur||"")?'<span class="chip kc">Концентрация</span>':'')+dmg+'</div>'+
    incantBtn(s,i)+
    '<details class="sp-d"><summary>правила</summary><p>'+nl(s.desc)+'</p></details>'+(act?'<div class="sp-a">'+act+'</div>':'')+'</section>';
}

/* ===== произнесение чар (по мотивам гальдура викинга) ===== */
var FXL = [["blast","Разряд из кольца"],["wave","Волна"],["hex","Кровавый глаз"],["sparks","Дым и искры"],["flame","Пламя"],["shadow","Тень"]];
function sigil(fx){
  var P = {
    blast:'<path d="M5 19 11 12 9 11 15 4"/><circle cx="5" cy="19" r="2"/><path d="M15 4l3 1"/>',
    wave:'<rect x="9" y="9" width="6" height="6"/><rect x="5.5" y="5.5" width="13" height="13" opacity=".6"/><rect x="2" y="2" width="20" height="20" opacity=".3"/>',
    hex:'<path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7z"/><circle cx="12" cy="12" r="3"/>',
    sparks:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><path d="M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" opacity=".6"/>',
    flame:'<path d="M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 3 3 3 0-3-1-5 0-7z"/>',
    shadow:'<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>'
  }[fx] || '';
  return '<svg class="sig" viewBox="0 0 24 24" aria-hidden="true">'+P+'</svg>';
}
function incantBtn(s,i){
  if (!s.incant && !s.flavor) return "";
  return '<button type="button" class="inc-btn" data-act="cast-show" data-i="'+i+'">'+sigil(s.fx)+'<span class="inc-q">«'+esc(s.incant||s.name)+'»'+(s.incantTr?' <i>'+esc(s.incantTr)+'</i>':'')+'</span><b>произнести ✦</b></button>';
}
function fxHtml(fx){
  var h = '', i;
  if (fx==="blast"){
    h = '<svg class="bolt" viewBox="0 0 400 300" preserveAspectRatio="none"><path class="b1" d="M40 270 L120 190 L100 175 L190 120 L170 105 L300 40 L285 70 L370 30"/><path class="b2" d="M40 270 L110 210 L95 198 L200 140 L185 125 L330 60"/></svg><i class="orb"></i>';
    for (i=0;i<14;i++) h += '<i class="smoke" style="--x:'+(Math.random()*100).toFixed(0)+'%;--d:'+(Math.random()*2).toFixed(2)+'s"></i>';
  } else if (fx==="wave"){
    for (i=0;i<4;i++) h += '<i class="ring" style="animation-delay:'+(i*0.45)+'s"></i>';
    for (i=0;i<16;i++) h += '<i class="leaf" style="--a:'+(i*22.5)+'deg;--d:'+(Math.random()*0.6).toFixed(2)+'s"></i>';
  } else if (fx==="hex"){
    h = '<svg class="eye" viewBox="0 0 200 100"><path class="lid" d="M5 50 Q100 -20 195 50 Q100 120 5 50Z"/><circle class="iris" cx="100" cy="50" r="22"/><ellipse class="pupil" cx="100" cy="50" rx="5" ry="18"/></svg>';
    for (i=0;i<10;i++) h += '<i class="drop" style="--x:'+(10+Math.random()*80).toFixed(0)+'%;--d:'+(1+Math.random()*3).toFixed(2)+'s"></i>';
  } else {
    for (i=0;i<26;i++) h += '<i class="spark" style="--x:'+(Math.random()*100).toFixed(0)+'%;--y:'+(30+Math.random()*70).toFixed(0)+'%;--d:'+(Math.random()*3).toFixed(2)+'s;--s:'+(0.5+Math.random()).toFixed(2)+'"></i>';
    h += '<i class="smoke-ring"></i><i class="smoke-ring r2"></i>';
  }
  return h;
}
function showCast(i){
  var s = S.spells[i]; if (!s) return;
  var fx = s.fx || "sparks", el = $("#cast");
  var words = String(s.incant||"").split(/\s+/).filter(Boolean);
  var mech = [esc(s.time), esc(s.range), esc(s.dur)];
  if (s.kind==="attack") mech.push("атака "+sg(sAtk()));
  if (s.kind==="save") mech.push("Сл "+sDC()+" · "+(ABN[s.save]?ABN[s.save][2]:""));
  if (s.dice) mech.push(diceRu(upDice(s))+(s.beams&&beams()>1?" × "+beams():"")+" "+esc(s.type||""));
  if (s.conc && !/концентр/i.test(s.dur||"")) mech.push("концентрация");
  var act = s.kind==="attack" ? '<button type="button" class="btn gold big" data-act="sp-atk" data-i="'+i+'">Атака '+sg(sAtk())+'</button>'
          : (s.lvl>0 || s.kind==="save") ? '<button type="button" class="btn gold big" data-act="sp-cast" data-i="'+i+'">Наложить'+(s.lvl>0?' · ячейка '+pact().c+' круга':'')+'</button>' : '';
  el.className = "cast fx-"+fx;
  el.innerHTML = '<div class="cast-fx" aria-hidden="true">'+fxHtml(fx)+'</div>'+
    '<div class="cast-in"><span class="cast-eye">'+(s.lvl?s.lvl+' круг':'заговор')+(s.school?' · '+esc(s.school):'')+'</span>'+
    '<h2>'+sigil(fx)+esc(s.name)+'</h2>'+
    (words.length?'<p class="cast-words">'+words.map(function(w,k){ return '<span style="animation-delay:'+(0.45+k*0.32).toFixed(2)+'s">'+esc(w)+'</span>'; }).join(" ")+'</p>':'')+
    (s.incantTr?'<p class="cast-tr" style="animation-delay:'+(0.5+words.length*0.32).toFixed(2)+'s">'+esc(s.incantTr)+'</p>':'')+
    (s.incantRu?'<p class="cast-ru" style="animation-delay:'+(0.8+words.length*0.32).toFixed(2)+'s">'+esc(s.incantRu)+'</p>':'')+
    flavorHtml(s, i)+
    '<div class="cast-mech">'+mech.filter(Boolean).map(function(m){ return '<span class="chip">'+m+'</span>'; }).join("")+'</div>'+
    (act?'<div class="cast-act">'+act+'</div>':'')+
    '<span class="cast-hint">тап в любом месте — закрыть · слова по мотивам квенья и синдарина, с гоблинским выговором</span></div>';
  el.hidden = false; document.body.classList.add("cast-open");
  requestAnimationFrame(function(){ el.classList.add("open"); });
}
function flavorHtml(s, i){
  var V = s.variants||[];
  if (V.length){
    var k = Math.min(num(s.vsel), V.length-1);
    return '<div class="cast-vars" role="group" aria-label="Как это выглядит">'+V.map(function(v,j){ return '<button type="button" class="'+(j===k?'on':'')+'" data-act="cast-var" data-i="'+i+'" data-k="'+j+'">'+esc(v.n||("Вариант "+(j+1)))+'</button>'; }).join("")+'</div><p class="cast-flavor" id="cast-fl">'+nl(V[k].t)+'</p>';
  }
  return s.flavor?'<p class="cast-flavor">'+nl(s.flavor)+'</p>':'<p class="cast-flavor dim">Как это выглядит — допиши в «Правке».</p>';
}
function hideCast(){ var el=$("#cast"); if (el.hidden) return; el.classList.remove("open"); document.body.classList.remove("cast-open"); setTimeout(function(){ el.hidden=true; el.innerHTML=""; }, 250); }

/* ===== гадальная колода ===== */
var TG = {
  cards:'<rect x="3" y="5" width="10" height="15" rx="1.5" transform="rotate(-12 8 12)"/><rect x="10" y="4" width="10" height="15" rx="1.5" transform="rotate(10 15 11)"/>',
  mirror:'<ellipse cx="12" cy="10" rx="6" ry="8"/><path d="M12 18v4M8 22h8"/><path d="M10 7c1-1 3-1 4 0" opacity=".6"/>',
  rose:'<path d="M12 4c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z"/><path d="M12 7c1.5 0 2.5 1 2.5 2.5M12 14v8M12 18l-4-2M12 19l4-2"/>',
  crown:'<path d="M3 18h18M4.5 18 3 7l5 4 4-7 4 7 5-4-1.5 11"/>',
  scroll:'<path d="M6 4h11a2 2 0 0 1 0 4H8v12a2 2 0 0 1-4 0V6a2 2 0 0 1 2-2z"/><circle cx="15" cy="16" r="3"/><path d="M14 19l-1 3M16 19l1 3"/>',
  apple:'<path d="M12 7c-4-2-8 1-7 6s4 8 7 7c3 1 6-2 7-7s-3-8-7-6z"/><path d="M12 7c0-2 1-3 3-4M10 13l1 3 1-3M12 13l1 3 1-3"/>',
  carriage:'<path d="M4 7h14l-1 7H5z"/><circle cx="7" cy="18" r="3"/><circle cx="16" cy="18" r="3"/><path d="M18 9l3-4 1 3M2 5l2 2"/>',
  crossbow:'<path d="M3 8c5-5 13-5 18 0"/><path d="M3 8l9 5 9-5M12 4v18M10 20h4"/>',
  berries:'<circle cx="8" cy="15" r="3"/><circle cx="14" cy="17" r="3"/><circle cx="12" cy="11" r="2.5"/><path d="M12 8.5c0-3 2-5 5-6M17 4a4 4 0 1 0 3 5"/>',
  moon:'<circle cx="12" cy="9" r="6"/><path d="M3 22v-3h3v3M9 22v-4h2v4M15 22v-3h2v3M20 22v-4"/>',
  scales:'<path d="M12 3v18M7 21h10M4 7h16M4 7l-2.5 6h5zM20 7l-2.5 6h5z"/><circle cx="4" cy="13" r="1.2"/>',
  shield:'<path d="M5 20V10c0-3 3-6 7-7 4 1 7 4 7 7v10z"/><path d="M12 7v9M9 13l3 3 3-3"/>',
  castle:'<path d="M3 21V11h3v2h2v-4h3v-3h2v3h3v4h2v-2h3v10z"/><path d="M2 21h20"/><circle cx="12" cy="21" r="5" opacity=".5"/>',
  flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7 15h10"/><circle cx="18" cy="5" r="2"/>',
  eyes:'<path d="M3 9c2-3 4-4 6-4s4 1 6 4c-2 3-4 4-6 4s-4-1-6-4z"/><circle cx="9" cy="9" r="1.5"/><path d="M10 17c1.5-2 3-3 5-3s3.5 1 5 3c-1.5 2-3 3-5 3s-3.5-1-5-3z"/><circle cx="15" cy="17" r="1.2"/>',
  broken:'<ellipse cx="12" cy="11" rx="7" ry="9"/><path d="M12 2l-2 6 4 2-3 5 2 6M5 9l5-1M14 10l5 3"/>',
  star:'<path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M7 15h10l-2 4h-6zM12 19v3M9 22h6"/>',
  moons:'<path d="M8 3a6 6 0 1 0 5 9 5 5 0 0 1-5-9z"/><circle cx="18" cy="6" r="2.5"/><path d="M3 22l3-6 3 6M11 22l3-7 3 7M17 22l2-4 2 4"/>',
  sunrise:'<path d="M2 18h20M5 18a7 7 0 0 1 14 0"/><path d="M12 4v3M4.5 9.5l2 2M19.5 9.5l-2 2M12 13v5M10 22h4"/>',
  hands:'<ellipse cx="12" cy="12" rx="7" ry="10"/><path d="M8 16v-5M10 15v-6M12 15V8M14 15v-6M9 18c1 1 5 1 6 0"/>',
  mask:'<path d="M3 8c3-2 6-2 9 0 3-2 6-2 9 0 0 6-3 9-6 9-1 0-2-1-3-2-1 1-2 2-3 2-3 0-6-3-6-9z"/><path d="M6 10c1-1 3-1 4 0M14 10c1-1 3-1 4 0"/>',
  goblin:'<path d="M2 7l5 4M22 7l-5 4"/><circle cx="12" cy="12" r="6"/><path d="M9 11h.01M14 10.5c.5-.5 1.5-.5 2 0M9 14.5c1.5 1.5 4.5 1.5 6 0M10.5 15.5v1M13.5 15.5v1"/>'
};
function tglyph(k){ return '<svg class="tg" viewBox="0 0 24 24" aria-hidden="true">'+(TG[k]||TG.cards)+'</svg>'; }
function drawTarot(){
  var deck = G.TAROT.slice(), out = [];
  for (var i=0;i<3;i++) out.push(deck.splice(Math.floor(Math.random()*deck.length),1)[0]);
  return out;
}
function tcardFace(c){
  if (c.img) return '<div class="tface art"><img src="img/tarot/'+c.img+'.webp" alt="'+esc(c.n+". "+c.name)+'"></div>';
  return '<div class="tface"><span class="tnum">'+c.n+'</span><span class="tart">'+tglyph(c.g)+'</span><b class="tname">'+esc(c.name)+'</b><i class="tscene">'+esc(c.scene)+'</i></div>';
}
function showTarot(){
  var hand = drawTarot(), el = $("#cast");
  addLog("Гадание: три карты", "", hand.map(function(c,i){ return G.TAROT_POS[i]+" — "+c.n+". "+c.name; }).join("; "));
  el.className = "cast fx-tarot";
  el.innerHTML = '<div class="cast-fx" aria-hidden="true">'+fxHtml("sparks")+'</div><div class="cast-in tarot-in">'+
    '<span class="cast-eye">гадальная колода · старшие арканы</span><h2>'+tglyph("cards")+'Что скажут карты</h2>'+
    '<div class="tspread">'+hand.map(function(c,i){
      return '<div class="tslot"><small class="tpos">'+G.TAROT_POS[i]+'</small>'+
        '<div class="tcard" style="--dl:'+(0.4+i*0.6).toFixed(1)+'s"><div class="tin"><div class="tback"><span>'+tglyph("moon")+'</span></div>'+tcardFace(c)+'</div></div>'+
        '<p class="tmean" style="animation-delay:'+(1.2+i*0.6).toFixed(1)+'s"><span class="tmn">'+c.n+'. '+esc(c.name)+'</span><b>'+esc(c.mean)+'</b>'+(c.img?'<i>'+esc(c.scene)+'</i>':'')+'</p></div>';
    }).join("")+'</div>'+
    '<div class="cast-act"><button type="button" class="btn gold big" data-act="tarot">Перетасовать и тянуть снова</button></div>'+
    '<span class="cast-hint">тап в любом месте — закрыть · расклад записан в журнал бросков</span></div>';
  el.hidden = false; document.body.classList.add("cast-open");
  requestAnimationFrame(function(){ el.classList.add("open"); });
}

/* ===== Мешок ===== */
function vBag(){
  var coins = [["cp","мм","медные"],["sp","см","серебряные"],["ep","эм","электрумовые"],["gp","зм","золотые"],["pp","пм","платиновые"]];
  var c = card("coins", "Кошель", '<div class="coinrow">'+coins.map(function(x){
    return '<div class="coin c-'+x[0]+'"><span class="cface">'+x[1]+'</span>'+inp("coins."+x[0],{num:1,label:x[2]+" монеты"})+
      '<div class="cbtn"><button type="button" data-act="coin" data-k="'+x[0]+'" data-d="-1" aria-label="минус">−</button><button type="button" data-act="coin" data-k="'+x[0]+'" data-d="1" aria-label="плюс">+</button></div></div>';
  }).join("")+'</div><p class="hint">В пересчёте: <b data-c-gold>'+goldTotal()+'</b> зм</p>');
  var items = card("items", "Пожитки", '<div class="itemlist">'+S.items.map(function(it,i){
    return '<div class="item"><div class="qty"><button type="button" data-act="qty" data-i="'+i+'" data-d="-1" aria-label="меньше">−</button>'+inp("items."+i+".qty",{num:1,label:"количество"})+'<button type="button" data-act="qty" data-i="'+i+'" data-d="1" aria-label="больше">+</button></div>'+
      '<div class="itx">'+inp("items."+i+".name",{ph:"Предмет",cls:"bare b"})+inp("items."+i+".note",{ph:"заметка",cls:"bare s"})+
      (it.tarot?'<button type="button" class="tarot-btn" data-act="tarot">'+tglyph("cards")+'тянуть карты</button>':'')+'</div>'+
      '<button type="button" class="del x2" data-act="del" data-l="items" data-i="'+i+'" aria-label="Выбросить">✕</button></div>';
  }).join("")+'</div>'+addBtn("items","предмет"));
  var tr = card("trinkets", "Блестяшки", '<p class="scrawl-note">моё. не трогать. особенно ты, Джинни.</p><div class="trs">'+
    (S.trinkets.length? S.trinkets.map(function(t,i){
      return '<div class="tr"><span class="shine" aria-hidden="true"></span>'+inp("trinkets."+i+".name",{ph:"Что блестит",cls:"bare b"})+inp("trinkets."+i+".note",{ph:"где стащил",cls:"bare s"})+
        '<button type="button" class="del x2" data-act="del" data-l="trinkets" data-i="'+i+'" aria-label="Расстаться">✕</button></div>';
    }).join("") : '<p class="empty">Пока пусто. Подозрительно пусто.</p>')+'</div>'+addBtn("trinkets","блестяшку"));
  var al = card("alias", "Фальшивая личность", '<p class="scrawl-note">для стражи на воротах — только так. выдал Питер Холл.</p>'+
    [["name","Имя по бумагам",1],["who","Кем представляется",3],["papers","Документы",3],["legend","Легенда",3],["knows","Кто знает правду",2]].map(function(x){
      return '<label class="al-f"><small>'+x[1]+'</small>'+inp("alias."+x[0], x[2]>1?{area:1,rows:x[2],cls:"paper"}:{cls:"paper al-name"})+'</label>';
    }).join(""));
  return '<div class="grid g-two g-bag"><div class="col">'+c+items+'</div><div class="col">'+al+tr+'</div></div>';
}
function goldTotal(){ var k=S.coins; var g = num(k.cp)/100 + num(k.sp)/10 + num(k.ep)/2 + num(k.gp) + num(k.pp)*10; return (Math.round(g*100)/100).toString().replace(".",","); }

/* ===== Душа ===== */
function vSoul(){
  var look = card("look", "Наружность", '<div class="lookgrid">'+[["age","Возраст"],["height","Рост"],["weight","Вес"],["eyes","Глаза"],["skin","Кожа"],["hair","Волосы"]].map(function(x){
    return '<label><small>'+x[1]+'</small>'+inp("look."+x[0],{cls:"bare"})+'</label>';
  }).join("")+'</div>');
  function ta(k, t, ph, rows){ return card("ta", t, inp(k,{area:1,rows:rows||3,ph:ph,cls:"paper"})); }
  var appear = card("appear", "Как он выглядит", inp("appearance",{area:1,rows:6,cls:"paper"})+'<label class="sub">В зеркале</label>'+inp("mirrorLook",{area:1,rows:4,cls:"paper mirror-ta"})+
    '<button type="button" class="lnk" data-act="mirror">заглянуть в зеркало →</button>');
  return '<div class="soul-top">'+appear+'</div><div class="grid g-two"><div class="col">'+look+
    ta("traits","Черты характера","")+ta("ideals","Идеалы","")+ta("bonds","Привязанности","")+ta("flaws","Слабости","")+
    '</div><div class="col">'+ta("allies","Союзники и организации","",4)+ta("backstory","Предыстория","Откуда ты, гоблин? Кем был до зеркала?",6)+ta("goals","Цели и задачи","",3)+ta("notes","Заметки с сессий","Имена, долги, обиды…",8)+'</div></div>';
}

/* ---------------- autosize ---------------- */
function autosize(){ document.querySelectorAll("textarea").forEach(fit); }
function fit(t){ t.style.height="auto"; t.style.height=(t.scrollHeight+2)+"px"; }

/* ---------------- roll sheet ---------------- */
var R = null;
function d20(){ return [rnd(20), rnd(20)]; }
function openRoll(o){
  R = o; R.mode = R.mode || 0;
  if (R.k==="d20"){ R.rows = []; for (var i=0;i<(R.n||1);i++) R.rows.push(d20()); logD20(); }
  showRS(); renderRS(true);
}
function kept(row){ return R.mode>0 ? Math.max(row[0],row[1]) : R.mode<0 ? Math.min(row[0],row[1]) : row[0]; }
function logD20(){ R.rows.forEach(function(r,i){ var k=kept(r); addLog(R.title+(R.rows.length>1?" #"+(i+1):""), k+R.bonus, "к20 "+(R.mode?("["+r[0]+","+r[1]+"] → "+k):k)+" "+sg(R.bonus)+(k===20?" · НАТ 20":k===1?" · НАТ 1":"")); }); }
function showRS(){ var el=$("#rs"); el.hidden=false; requestAnimationFrame(function(){ el.classList.add("open"); }); }
function closeRS(){ var el=$("#rs"); el.classList.remove("open"); setTimeout(function(){ el.hidden=true; }, 200); R=null; }
function hexD(n, cls, dim){ return '<span class="d20 '+(cls||"")+(dim?' dim':'')+'"><b>'+n+'</b></span>'; }
function renderRS(anim){
  var h = '<div class="rs-h"><h3>'+esc(R.title)+'</h3>'+(R.sub?'<small>'+R.sub+'</small>':'')+'</div>';
  if (R.k==="d20"){
    h += '<div class="advt" role="group" aria-label="Режим броска">'+[[-1,"Помеха"],[0,"Обычный"],[1,"Преимущество"]].map(function(m){ return '<button type="button" class="'+(R.mode===m[0]?'on':'')+'" data-act="rs-mode" data-m="'+m[0]+'">'+m[1]+'</button>'; }).join("")+'</div>';
    h += R.rows.map(function(r,i){
      var k = kept(r), tot = k + R.bonus, cls = k===20?"crit":k===1?"fumble":"";
      var dice = R.mode ? hexD(r[0], r[0]===k?cls:"", r[0]!==k) + hexD(r[1], r[1]===k&&r[0]!==k?cls:"", r[1]!==k || r[0]===k) : hexD(r[0], cls);
      var msg = k===20 ? pick(G.NAT20) : k===1 ? pick(G.NAT1) : "";
      if (R.k==="d20" && R.dc) msg = (tot>=R.dc?"Успех":"Провал")+" против Сл "+R.dc+(msg?" · "+msg:"");
      return '<div class="rrow '+cls+'">'+dice+'<span class="op">'+sg(R.bonus)+'</span><span class="eq">=</span><b class="tot'+(anim?' spin':'')+'" data-v="'+tot+'">'+tot+'</b>'+
        (R.atk ? '<button type="button" class="btn '+(k===20?'gold':'')+'" data-act="rs-dmg" data-row="'+i+'">Урон'+(k===20?' ×2':'')+'</button>' : '')+
        (msg?'<p class="rmsg">'+esc(msg)+'</p>':'')+'</div>';
    }).join("");
    h += '<div class="rs-f"><button type="button" class="btn" data-act="rs-reroll">Перебросить</button></div>';
  }
  if (R.k==="dmg"){
    var o = R.opt;
    h += '<div class="addons">'+
      tg("crit","Крит — кости ×2", o.crit)+
      (S.hex ? tg("hex","Сглаз +1к6 некрот.", o.hex) : "")+
      S.res.map(function(r,i){ if(!r.dmg) return ""; var left=resLeft(r); return tg("r"+i, r.name+" +"+(/d/i.test(r.dmg)?diceRu(r.dmg):resVal(r.dmg))+(left?"":" (потрачено)"), o["r"+i], !left && !o["r"+i]); }).join("")+
    '</div>';
    if (R.out){
      h += '<div class="dmgout"><b class="tot big'+(anim?' spin':'')+'" data-v="'+R.out.total+'">'+R.out.total+'</b>'+(R.half?'<span class="half">половина: <b>'+Math.floor(R.out.total/2)+'</b></span>':'')+
        '<ul class="brk">'+R.out.parts.map(function(p){ return '<li><span>'+esc(p.l)+'</span><i>'+esc(p.d)+'</i><b>'+p.v+'</b></li>'; }).join("")+'</ul></div>';
      h += '<div class="rs-f">'+backB()+'<button type="button" class="btn" data-act="rs-dmgroll">Бросить ещё</button></div>';
    } else h += '<div class="rs-f">'+backB()+'<button type="button" class="btn gold big" data-act="rs-dmgroll">Бросить урон</button></div>';
  }
  if (R.k==="free"){
    h += '<div class="freebar"><button type="button" class="btn" data-act="free-n" data-d="-1">−</button><b>'+R.n+'к'+R.d+'</b><button type="button" class="btn" data-act="free-n" data-d="1">+</button></div>';
    h += '<div class="dmgout"><b class="tot big'+(anim?' spin':'')+'" data-v="'+R.sum+'">'+R.sum+'</b><p class="fr">'+R.r.join(" · ")+'</p></div>';
    h += '<div class="rs-f"><button type="button" class="btn gold" data-act="free-again">Бросить снова</button></div>';
  }
  if (R.k==="note"){ h += R.html; }
  $("#rs-body").innerHTML = h;
  if (anim) spinNums();
}
function backB(){ return R.back ? '<button type="button" class="btn ghost" data-act="rs-back">← к броскам</button>' : ''; }
function tg(k,l,on,dis){ return '<button type="button" class="tgl'+(on?' on':'')+'" data-act="rs-opt" data-k="'+k+'"'+(dis?' disabled':'')+' aria-pressed="'+!!on+'">'+esc(l)+'</button>'; }
function spinNums(){
  if (document.documentElement.classList.contains("calm")) return;
  document.querySelectorAll("#rs .spin").forEach(function(el){
    var v=+el.getAttribute("data-v"), t=0, mx=Math.max(20,Math.abs(v)+6);
    var iv=setInterval(function(){ t++; el.textContent = t<9 ? rnd(mx) : v; if (t>=9){ clearInterval(iv); el.classList.add("land"); } }, 38);
  });
}

/* атаки */
function rollAttack(a){
  var n = a.beams ? beams() : 1;
  openRoll({k:"d20", title:a.name, sub:"атака "+sg(atkHit(a))+(n>1?" · "+n+" разряда":""), bonus:atkHit(a), n:n, atk:{name:a.name, dice:a.dice, mod:atkDmgMod(a), type:a.type}});
}
function dmgDialog(atk, crit, half, title){
  var opt = {crit:!!crit};
  if (S.hex && !half) opt.hex = true;
  S.res.forEach(function(r,i){ if (r.dmg && r.reset==="turn" && resLeft(r) && !half) opt["r"+i]=true; });
  R = {k:"dmg", title:title||("Урон: "+atk.name), sub:diceRu(dmgStr(atk.dice, atk.mod))+" "+(atk.type||""), atk:atk, opt:opt, half:half, out:null};
  showRS(); renderRS(false);
}
function rollDamage(){
  var a = R.atk, o = R.opt, parts = [], total = 0;
  var p = parseDice(a.dice), rr = rollTerms(p.terms, o.crit);
  rr.forEach(function(t){ parts.push({l:a.name+" ("+(a.type||"урон")+")", d:t.r.join("+"), v:t.sum}); total+=t.sum; });
  var flat = p.flat + (a.mod||0); if (flat){ parts.push({l:"модификатор", d:"", v:flat}); total+=flat; }
  if (o.hex && S.hex){ var hx = rollTerms([{n:1,d:6}], o.crit)[0]; parts.push({l:"Сглаз (некротический)", d:hx.r.join("+"), v:hx.sum}); total+=hx.sum; }
  S.res.forEach(function(r,i){
    if (!o["r"+i] || !r.dmg) return;
    if (!resLeft(r)) return;
    var v, d="";
    if (/d/i.test(r.dmg)){ var t=rollTerms(parseDice(r.dmg).terms, o.crit); v=t.reduce(function(s,x){return s+x.sum;},0); d=t.map(function(x){return x.r.join("+");}).join("+"); }
    else v = resVal(r.dmg);
    parts.push({l:r.name+(r.dtype?" ("+r.dtype+")":""), d:d, v:v}); total+=v;
    r.used = num(r.used)+1; o["r"+i]=false;
  });
  total = Math.max(0,total);
  R.out = {total:total, parts:parts};
  addLog("Урон: "+a.name, total, parts.map(function(x){return x.l+" "+x.v;}).join(", ")+(o.crit?" · крит":""));
  save(); render(); renderRS(true);
}

/* заклинания */
function castSpell(i){
  var s = S.spells[i];
  if (s.lvl>0){
    if (!slotsLeft()){ toast("Ячеек договора нет — нужен короткий отдых."); return; }
    S.slotsUsed = num(S.slotsUsed)+1;
  }
  if (s.conc){
    if (S.conc && S.conc!==s.name) toast("Концентрация на «"+S.conc+"» прервана.");
    S.conc = s.name; S.hex = !!s.hex;
  }
  addLog("Наложено: "+s.name, "", s.lvl>0?"ячейка "+pact().c+" круга":"заговор");
  save(); render();
  if (s.kind==="save" && s.dice){
    dmgDialog({name:s.name, dice:upDice(s), mod:0, type:s.type}, false, true, s.name+" · Сл "+sDC()+" "+(ABN[s.save]?ABN[s.save][2]:""));
  } else if (s.hex){
    toast("Сглаз наложен. +1к6 некротического к каждому попаданию.");
  } else if (s.lvl>0) toast("«"+s.name+"» наложено, ячейка потрачена.");
}

/* ---------------- log ---------------- */
function addLog(t, v, d){ S.log.unshift({t:Date.now(), n:t, v:v, d:d}); if (S.log.length>40) S.log.length=40; save(); }
function logHtml(){
  return '<h2>Журнал бросков</h2>'+(S.log.length? '<ul class="log">'+S.log.map(function(l){ var dt=new Date(l.t); return '<li><time>'+String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")+'</time><span>'+esc(l.n)+'<small>'+esc(l.d||"")+'</small></span><b>'+esc(l.v)+'</b></li>'; }).join("")+'</ul><button type="button" class="btn small" data-act="log-clear">Очистить</button>' : '<p class="empty">Ещё ничего не бросали.</p>');
}

/* ---------------- modal ---------------- */
function openModal(h, cls){ var m=$("#modal"); $("#m-body").innerHTML=h; m.className="modal "+(cls||""); m.hidden=false; requestAnimationFrame(function(){ m.classList.add("open"); }); }
function closeModal(){ var m=$("#modal"); m.classList.remove("open"); setTimeout(function(){ m.hidden=true; }, 180); }

var HPV = "";
function hpModal(mode){
  HPV = "";
  openModal('<h2>Хиты</h2><div class="hpnow"><b>'+S.hp+'</b> / '+S.hpMax+(S.temp?' <em>+'+S.temp+' врем.</em>':'')+'</div>'+
    '<div class="hpin" id="hpv">0</div><div class="pad">'+[1,2,3,4,5,6,7,8,9,"⌫",0,"C"].map(function(k){ return '<button type="button" data-act="pad" data-k="'+k+'">'+k+'</button>'; }).join("")+'</div>'+
    '<div class="row3"><button type="button" class="btn bad'+(mode==="dmg"?' pre':'')+'" data-act="hp-apply" data-m="dmg">Урон</button><button type="button" class="btn good'+(mode==="heal"?' pre':'')+'" data-act="hp-apply" data-m="heal">Лечение</button><button type="button" class="btn'+(mode==="temp"?' pre':'')+'" data-act="hp-apply" data-m="temp">Врем. хиты</button></div>', "hpm");
}
function applyHP(m, v){
  if (!v) { closeModal(); return; }
  if (m==="dmg"){
    var t = Math.min(S.temp, v); S.temp -= t; var rest = v - t;
    var wasDown = S.hp<=0, before = S.hp;
    S.hp = Math.max(0, S.hp - rest);
    if (wasDown && rest>0){ S.death.f = Math.min(3, S.death.f+1); toast("Урон без сознания — провал спасброска от смерти."); }
    else if (before>0 && S.hp===0 && rest - before >= S.hpMax) toast("Мгновенная смерть: урон сверх нуля ≥ максимуму хитов.");
    if (S.conc && rest+t>0){ var dc=Math.max(10, Math.floor(v/2)); toastAct("Концентрация на «"+S.conc+"»: спасбросок ТЕЛ Сл "+dc, "Бросить", "conc-save", dc); }
    addLog("Получен урон", -v, t?("врем. хиты поглотили "+t):"");
  } else if (m==="heal"){
    if (S.hp<=0){ S.death={s:0,f:0}; }
    S.hp = Math.min(S.hpMax, S.hp + v); addLog("Лечение", "+"+v, "");
  } else { S.temp = Math.max(S.temp, v); addLog("Временные хиты", v, "берётся большее"); }
  save(); closeModal(); render();
}

/* ---------------- toast ---------------- */
function toast(t){ var el=$("#toast"); el.innerHTML=esc(t); el.hidden=false; el.classList.add("on"); clearTimeout(toast.t); toast.t=setTimeout(function(){ el.classList.remove("on"); setTimeout(function(){ el.hidden=true; },200); }, 3200); }
function toastAct(t, l, act, v){ var el=$("#toast"); el.innerHTML=esc(t)+' <button type="button" class="btn small gold" data-act="'+act+'" data-v="'+v+'">'+esc(l)+'</button>'; el.hidden=false; el.classList.add("on"); clearTimeout(toast.t); toast.t=setTimeout(function(){ el.classList.remove("on"); setTimeout(function(){ el.hidden=true; },200); }, 9000); }

/* ---------------- rests ---------------- */
function restModal(k){
  if (k==="short"){
    openModal('<h2>Короткий отдых</h2><p>Вернутся: ячейки договора'+S.res.filter(function(r){return r.reset!=="long";}).map(function(r){return ", «"+esc(r.name)+"»";}).join("")+'.</p>'+
      '<p>Кости хитов: <b>'+C("hd")+'</b> — потратить можно сейчас или кнопкой на вкладке «Бой».</p>'+
      '<div class="row2"><button type="button" class="btn" data-act="hd-roll">Потратить кость хитов</button><button type="button" class="btn gold" data-act="rest-do" data-k="short">Отдохнуть</button></div>');
  } else {
    openModal('<h2>Долгий отдых</h2><p>Хиты до максимума, все ячейки и ресурсы, половина костей хитов, спасброски от смерти сбрасываются. Концентрация прерывается.</p><button type="button" class="btn gold wide" data-act="rest-do" data-k="long">Спать до рассвета</button>');
  }
}
function doRest(k){
  S.slotsUsed = 0;
  S.res.forEach(function(r){ if (r.reset!=="long" || k==="long") r.used = 0; });
  if (k==="long"){
    S.hp = S.hpMax; S.temp = 0; S.death = {s:0,f:0};
    S.hdUsed = Math.max(0, num(S.hdUsed) - Math.max(1, Math.floor(hdTotal()/2)));
    S.conc = ""; S.hex = false;
  }
  S.turn = {a:0,b:0,r:0,m:0};
  addLog(k==="long"?"Долгий отдых":"Короткий отдых","","");
  save(); closeModal(); render(); toast(k==="long"?"Утро. Гоблин отдохнул и снова зол на зеркало.":"Передышка. Ячейки и хитрости вернулись.");
}
function spendHD(){
  if (num(S.hdUsed) >= hdTotal()){ toast("Костей хитов не осталось."); return; }
  S.hdUsed = num(S.hdUsed)+1;
  var r = rnd(num(S.hdDie)||8), v = Math.max(0, r + M("con"));
  S.hp = Math.min(S.hpMax, S.hp + v); if (S.hp>0) S.death={s:0,f:0};
  addLog("Кость хитов", "+"+v, "к"+S.hdDie+" "+r+" "+sg(M("con")));
  save(); render(); if (!$("#modal").hidden) restModal("short");
  toast("Кость хитов: "+r+" "+sg(M("con"))+" = +"+v+" хитов.");
}

/* ---------------- death ---------------- */
function rollDeath(){
  var r = rnd(20), msg;
  if (r===20){ S.hp=1; S.death={s:0,f:0}; msg="НАТ 20! Ааз вскакивает с 1 хитом и очень недоволен."; }
  else if (r===1){ S.death.f=Math.min(3,S.death.f+2); msg="Единица — два провала."; }
  else if (r>=10){ S.death.s=Math.min(3,S.death.s+1); msg="Успех."; }
  else { S.death.f=Math.min(3,S.death.f+1); msg="Провал."; }
  if (S.death.s>=3 && S.hp<=0){ msg+=" Три успеха — стабилизирован."; }
  if (S.death.f>=3){ msg+=" Три провала. Зеркало победило…"; }
  addLog("Спасбросок от смерти", r, msg);
  save(); render();
  R = {k:"note", title:"Спасбросок от смерти", html:'<div class="dmgout">'+hexD(r, r===20?"crit":r===1?"fumble":"")+'<p class="rmsg">'+esc(msg)+'</p></div>'}; showRS(); renderRS(false);
}

/* ---------------- menu ---------------- */
function menuHtml(){
  return '<h2>Меню гоблина</h2><div class="menu">'+
    '<button type="button" class="btn" data-act="rest" data-k="short">Короткий отдых</button><button type="button" class="btn" data-act="rest" data-k="long">Долгий отдых</button>'+
    '<button type="button" class="btn" data-act="log">Журнал бросков</button><button type="button" class="btn" data-act="mirror">Заглянуть в зеркало</button>'+
    '<button type="button" class="btn" data-act="export">Экспорт героя</button><button type="button" class="btn" data-act="import">Импорт героя</button>'+
    '<button type="button" class="btn" data-act="install" '+(deferred?'':'hidden')+'>Установить на планшет</button>'+
    '<button type="button" class="btn'+(wakeOn?' on':'')+'" data-act="wake">'+(wakeOn?'✓ ':'')+'Не гасить экран</button>'+
    '</div><h3>Тема</h3><div class="pals">'+PALS.map(function(p){ return '<button type="button" class="pal'+(p.k===pal?' on':'')+'" data-act="pal" data-k="'+p.k+'" style="background:'+p.c[1]+';color:'+(p.k==="vellum"?"#2a2116":"#eee3cc")+';border-color:'+p.c[2]+'"><span class="sw">'+p.c.map(function(c){return '<i style="background:'+c+'"></i>';}).join("")+'</span><b>'+p.n+'</b><small>'+p.d+'</small></button>'; }).join("")+'</div>'+
    '<label class="calm-l"><input type="checkbox" class="chk" data-act="calm"'+(document.documentElement.classList.contains("calm")?' checked':'')+'> Без анимаций</label>'+
    '<details class="danger"><summary>Сброс</summary><p>Вернуть лист к исходному Аазу из PDF. Сначала сделай экспорт, если жалко.</p><button type="button" class="btn bad" data-act="reset">Сбросить лист</button></details>';
}

/* ---------------- mirror ---------------- */
function showMirror(){
  var m=$("#mirror");
  m.innerHTML = '<div class="mir-in"><div class="frame"><img src="img/mirror.webp" alt="Ааз перед зеркалом: в отражении — человек в багряном облачении"></div><p class="mir-q">«'+esc(S.flaws)+'»</p><small>тап — отвернуться</small></div>';
  m.hidden=false; requestAnimationFrame(function(){ m.classList.add("open"); });
}

/* ---------------- export / import ---------------- */
function doExport(){
  var name = (S.name||"герой").replace(/[^\wа-яё\- ]/gi,"").trim() || "герой";
  var blob = new Blob([JSON.stringify(S,null,1)], {type:"application/json"});
  var file = null; try { file = new File([blob], name+".gob.json", {type:"application/json"}); } catch(e){}
  if (file && navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file], title:name}).catch(function(){});
  } else {
    var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name+".gob.json"; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  toast("Копия героя сохранена.");
}
$("#imp").addEventListener("change", function(e){
  var f = e.target.files[0]; if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){ try { var o=JSON.parse(rd.result); if (!o || !o.abil) throw 0; S = normalize(o); save(); closeModal(); render(); toast("Герой загружен: "+S.name); } catch(err){ toast("Это не файл героя."); } };
  rd.readAsText(f); e.target.value="";
});

/* ---------------- install & wake ---------------- */
var deferred = null;
window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); deferred = e; });
var wakeOn = false, wakeLock = null;
function setWake(on){
  wakeOn = on;
  if (on && navigator.wakeLock){ navigator.wakeLock.request("screen").then(function(l){ wakeLock=l; }).catch(function(){ wakeOn=false; toast("Экран не удержать в этом браузере."); }); }
  if (!on && wakeLock){ wakeLock.release(); wakeLock=null; }
  if (on && !navigator.wakeLock){ wakeOn=false; toast("Этот браузер не умеет держать экран."); }
}
document.addEventListener("visibilitychange", function(){ if (wakeOn && document.visibilityState==="visible") setWake(true); });

/* ---------------- events ---------------- */
function onField(e){
  var el = e.target; if (!el.matches || !el.matches("[data-p]")) return;
  var p = el.getAttribute("data-p"), v;
  if (el.type==="checkbox") v = el.checked;
  else if (el.getAttribute("data-t")==="num") v = el.value.trim()==="" ? "" : num(el.value);
  else v = el.value;
  if (/^spells\.\d+\.lvl$/.test(p)) v = Math.max(0, Math.min(9, num(v)));
  setPath(S, p, v);
  if (p==="hpMax" && S.hp > num(v)) S.hp = num(v);
  if (el.tagName==="TEXTAREA") fit(el);
  if (/^coins\./.test(p)){ var g=document.querySelector("[data-c-gold]"); if (g) g.textContent=goldTotal(); }
  refreshCalc(); renderTop(); save();
}
document.addEventListener("input", onField);
document.addEventListener("change", function(e){
  if (e.target.matches && e.target.matches("[data-act=calm]")){ document.documentElement.classList.toggle("calm", e.target.checked); try{ localStorage.setItem("gob-calm", e.target.checked?"1":""); }catch(x){} return; }
  if (e.target.matches && e.target.matches("select[data-p], input[type=checkbox][data-p]")){ onField(e); if (EDIT && view!=="bag" && view!=="soul") {/* ничего — значения уже пересчитаны */} }
});

document.addEventListener("click", function(e){
  var tab = e.target.closest("[data-tab]");
  if (tab){ view = tab.getAttribute("data-tab"); try{ localStorage.setItem("gob-view",view); }catch(x){} render(); window.scrollTo({top:0}); return; }
  var b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  var act = b.getAttribute("data-act"), i = +b.getAttribute("data-i"), k = b.getAttribute("data-k");
  switch (act){
    case "edit": EDIT=!EDIT; render(); toast(EDIT?"Режим правки: меняй цифры, списки и владения.":"Лист закрыт от случайных правок."); break;
    case "menu": openModal(menuHtml(), "menu-m"); break;
    case "m-close": closeModal(); break;
    case "rs-close": closeRS(); break;
    case "hp": hpModal(b.getAttribute("data-mode")||"dmg"); break;
    case "pad": var kk=b.getAttribute("data-k"); if (kk==="⌫") HPV=HPV.slice(0,-1); else if (kk==="C") HPV=""; else if (HPV.length<4) HPV+=kk; $("#hpv").textContent = HPV||"0"; break;
    case "hp-apply": applyHP(b.getAttribute("data-m"), num(HPV)); break;
    case "roll-init": openRoll({k:"d20", title:"Инициатива", sub:"Ловкость "+sg(initB()), bonus:initB()}); break;
    case "check": openRoll({k:"d20", title:"Проверка: "+ABN[k][2], bonus:M(k)}); break;
    case "save": openRoll({k:"d20", title:"Спасбросок: "+ABN[k][2], sub:S.saveProf[k]?"с владением":"", bonus:saveB(k)}); break;
    case "skill": openRoll({k:"d20", title:SKN[k][1], sub:ABN[SKN[k][2]][2]+(skP(k)?(skP(k)>1?" · экспертиза":" · владение"):""), bonus:skillB(k)}); break;
    case "atk": rollAttack(S.attacks[i]); break;
    case "dmg": var at=S.attacks[i]; dmgDialog({name:at.name, dice:at.dice, mod:atkDmgMod(at), type:at.type}, false, false); break;
    case "cast-show": showCast(i); break;
    case "tarot": showTarot(); break;
    case "cast-close": hideCast(); break;
    case "cast-var": var cs=S.spells[i]; cs.vsel=+k; save(); var fl=$("#cast-fl"); if (fl){ fl.innerHTML=nl(cs.variants[+k].t); fl.classList.remove("swap"); void fl.offsetWidth; fl.classList.add("swap"); } document.querySelectorAll(".cast-vars button").forEach(function(x){ x.classList.toggle("on", x.getAttribute("data-k")===k); }); break;
    case "var-add": var vs=S.spells[i]; if (!vs.variants||!vs.variants.length) vs.variants=[{n:"Вариант 1", t:vs.flavor||""}]; vs.variants.push({n:"Вариант "+(vs.variants.length+1), t:""}); save(); render(); break;
    case "var-del": var vd=S.spells[i]; vd.variants.splice(+k,1); if (vd.variants.length===1){ vd.flavor=vd.variants[0].t; vd.variants=[]; } vd.vsel=0; save(); render(); break;
    case "sp-atk": hideCast(); var s=S.spells[i]; openRoll({k:"d20", title:s.name, sub:"атака заклинанием "+sg(sAtk())+(s.beams&&beams()>1?" · "+beams()+" разряда":""), bonus:sAtk(), n:s.beams?beams():1, atk:{name:s.name, dice:s.dice||"1d10", mod:0, type:s.type}}); break;
    case "sp-cast": hideCast(); castSpell(i); break;
    case "rs-mode": R.mode=+b.getAttribute("data-m"); R.rows=R.rows.map(function(){return d20();}); logD20(); renderRS(true); break;
    case "rs-reroll": R.rows=R.rows.map(function(){return d20();}); logD20(); renderRS(true); break;
    case "rs-dmg": var prev=R, row=R.rows[+b.getAttribute("data-row")], crit=kept(row)===20; dmgDialog(R.atk, crit, false); R.back=prev; R.title="Урон: "+prev.atk.name+(prev.rows.length>1?" · разряд "+(+b.getAttribute("data-row")+1):""); renderRS(false); break;
    case "rs-back": R=R.back; renderRS(false); break;
    case "rs-opt": R.opt[k]=!R.opt[k]; renderRS(false); break;
    case "rs-dmgroll": rollDamage(); break;
    case "free": R={k:"free", d:+b.getAttribute("data-d"), n:1}; showRS(); freeRoll(); break;
    case "free-n": R.n=Math.max(1,Math.min(20,R.n+(+b.getAttribute("data-d")))); freeRoll(); break;
    case "free-again": freeRoll(); break;
    case "res": var r=S.res[i], n=+b.getAttribute("data-n"), mx=resMax(r); var avail = n < mx-num(r.used); r.used = avail ? mx-n : mx-n-1; r.used=Math.max(0,Math.min(mx,r.used)); save(); render(); break;
    case "insp": S.insp=!S.insp; save(); render(); break;
    case "eco": S.turn[k]=S.turn[k]?0:1; save(); render(); break;
    case "new-turn": S.turn={a:0,b:0,r:0,m:0}; S.res.forEach(function(r){ if (r.reset==="turn") r.used=0; }); save(); render(); toast("Новый ход. Гнев гения снова наготове."); break;
    case "slot-toggle": var left=slotsLeft(), nn=+b.getAttribute("data-n"); S.slotsUsed = nn<left ? pact().n-nn : pact().n-nn-1; S.slotsUsed=Math.max(0,Math.min(pact().n,S.slotsUsed)); save(); render(); break;
    case "slot-spend": view="magic"; render(); break;
    case "conc-drop": if (S.conc) toast("Концентрация на «"+S.conc+"» прервана."); S.conc=""; S.hex=false; save(); render(); break;
    case "conc-save": var dc=+b.getAttribute("data-v"); $("#toast").hidden=true; openRoll({k:"d20", title:"Концентрация: "+(S.conc||""), sub:"спасбросок Телосложения, Сл "+dc, bonus:saveB("con"), dc:dc}); break;
    case "death": var dk=k, dn=+b.getAttribute("data-n"); S.death[dk] = S.death[dk]>dn ? dn : dn+1; save(); render(); break;
    case "roll-death": rollDeath(); break;
    case "hd-roll": spendHD(); break;
    case "rest": restModal(k); break;
    case "rest-do": doRest(k); break;
    case "tog-save": if (!EDIT){ openRoll({k:"d20", title:"Спасбросок: "+ABN[k][2], bonus:saveB(k)}); break; } S.saveProf[k]=S.saveProf[k]?0:1; save(); render(); break;
    case "tog-skill": if (!EDIT){ openRoll({k:"d20", title:SKN[k][1], bonus:skillB(k)}); break; } S.skills[k]=(skP(k)+1)%3; save(); render(); break;
    case "add": addItem(b.getAttribute("data-l")); break;
    case "del": var l=b.getAttribute("data-l"); var nm = (S[l][i]&&S[l][i].name)||"запись"; if (confirmDel(b)) { S[l].splice(i,1); save(); render(); toast("Удалено: "+nm); } break;
    case "coin": var ck=k; S.coins[ck]=Math.max(0,num(S.coins[ck])+(+b.getAttribute("data-d"))); save(); render(); break;
    case "qty": var it=S.items[i]; it.qty=Math.max(0,num(it.qty)+(+b.getAttribute("data-d"))); save(); render(); break;
    case "log": openModal(logHtml(), "log-m"); break;
    case "log-clear": S.log=[]; save(); openModal(logHtml(), "log-m"); break;
    case "pal": applyPal(k); render(); openModal(menuHtml(), "menu-m"); break;
    case "export": doExport(); break;
    case "import": $("#imp").click(); break;
    case "install": if (deferred){ deferred.prompt(); deferred=null; closeModal(); } break;
    case "wake": setWake(!wakeOn); setTimeout(function(){ openModal(menuHtml(), "menu-m"); }, 150); break;
    case "reset": S = clone(G.SEED); save(); closeModal(); render(); toast("Лист вернулся к исходному Аазу."); break;
    case "mirror": closeModal(); showMirror(); break;
    case "mirror-close": var mm=$("#mirror"); mm.classList.remove("open"); setTimeout(function(){ mm.hidden=true; }, 300); break;
  }
});
function confirmDel(b){
  if (b.classList.contains("sure")) return true;
  b.classList.add("sure"); var t=b.textContent; b.textContent = b.classList.contains("x2") ? "точно?" : "точно удалить?";
  setTimeout(function(){ if (b.isConnected){ b.classList.remove("sure"); b.textContent=t; } }, 2600);
  return false;
}
function freeRoll(){ R.r=[]; for (var i=0;i<R.n;i++) R.r.push(rnd(R.d)); R.sum=R.r.reduce(function(a,b){return a+b;},0); R.title="Бросок "+R.n+"к"+R.d; addLog(R.title, R.sum, R.r.join(", ")); renderRS(true); }
function addItem(l){
  var blank = {
    feats:{name:"Новое умение", src:"", desc:""},
    res:{name:"Новый ресурс", max:"1", reset:"long", used:0, note:""},
    attacks:{name:"Новое оружие", abil:"str", prof:true, bonus:0, dice:"1d6", addMod:true, type:"", range:"5 фт", beams:false},
    spells:{lvl:1, name:"Новое заклинание", en:"", school:"", time:"Действие", range:"", dur:"Мгновенная", comp:"В, С", conc:false, kind:"util", dice:"", type:"", desc:""},
    items:{name:"", qty:1, note:""},
    trinkets:{name:"", note:""}
  }[l];
  S[l].push(blank); save(); render();
  var els = document.querySelectorAll('[data-p^="'+l+'.'+(S[l].length-1)+'."]'); if (els[0]) { els[0].focus(); if (els[0].select) els[0].select(); els[0].scrollIntoView({block:"center", behavior:"smooth"}); }
}
document.addEventListener("keydown", function(e){
  if (e.key==="Escape"){ if (!$("#cast").hidden) hideCast(); else if (!$("#rs").hidden) closeRS(); else if (!$("#modal").hidden) closeModal(); else if (!$("#mirror").hidden) $("#mirror").click(); }
});

/* ---------------- boot ---------------- */
try { if (localStorage.getItem("gob-calm")) document.documentElement.classList.add("calm"); } catch(e){}
load(); save(); applyPal(pal); render();
if ("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("sw.js").catch(function(){});
})();
