(function(){
"use strict";
var G = GOB, KEY = "ennio-sheet-v1", PKEY = "ennio-palette", VKEY = "ennio-view", CKEY = "ennio-calm";
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
  ["abil","coins","look","prof","death","turn","secret","fac"].forEach(function(k){ if (!o[k] || typeof o[k]!=="object") o[k]={}; Object.keys(b[k]).forEach(function(j){ if (o[k][j] === undefined) o[k][j] = b[k][j]; }); });
  if (!Array.isArray(o.slotsUsed)) o.slotsUsed = [0,0,0,0,0,0,0,0,0];
  while (o.slotsUsed.length < 9) o.slotsUsed.push(0);
  if (!Array.isArray(o.favors)) o.favors = [];
  if (!Array.isArray(o.fac.items)) o.fac.items = [];
  if (!Array.isArray(o.res)) o.res = [];
  if ((o.v||1) < 3){ /* v3: Посвящённый в магию (чародей) вместо Вундеркинда */
    ["spells","feats","skills","prof","feat"].forEach(function(k){ o[k] = clone(b[k]); });
    o.items = (o.items||[]).filter(function(x){ return x.name!=="Инструменты отравителя"; });
    if (o.coins && num(o.coins.gp)===44) o.coins.gp = 94;
    o.miUsed = 0;
  }
  if ((o.v||1) < 4){ /* v4: инструменты, набор путешественника, безделушка */
    o.prof.tools = b.prof.tools;
    ["Набор путешественника","Коробочка с пуговицами"].forEach(function(nm){ if (!(o.items||[]).some(function(x){ return x.name===nm; })) o.items.push(clone(b.items.filter(function(x){ return x.name===nm; })[0])); });
    if (o.coins && num(o.coins.gp)===94) o.coins.gp = 84;
  }
  if ((o.v||1) < 5){ /* v5: факелы проданы, куплен фонарь */
    (o.items||[]).forEach(function(x){ if (x.name==="Набор путешественника") x.note = String(x.note||"").replace("трутница, 10 факелов,","трутница,"); });
    if (!(o.items||[]).some(function(x){ return x.name==="Фонарь с колпаком"; })){ o.items.push(clone(b.items.filter(function(x){ return x.name==="Фонарь с колпаком"; })[0])); if (o.coins){ o.coins.gp = num(o.coins.gp) - 5; o.coins.sp = num(o.coins.sp) + 1; } }
  }
  if ((o.v||1) < 6){ /* v6: свиток Волны грома */
    if (!o.spells.some(function(x){ return x.scroll; })){ var sc=b.spells.filter(function(x){ return x.scroll; })[0], at=o.spells.findIndex(function(x){ return x.name==="Жуткий смех Таши"; }); o.spells.splice(at<0?o.spells.length:at, 0, clone(sc)); }
    if (!(o.items||[]).some(function(x){ return x.name==="Свиток: Волна грома"; })){ o.items.push(clone(b.items.filter(function(x){ return x.name==="Свиток: Волна грома"; })[0])); if (o.coins) o.coins.gp = num(o.coins.gp) - 50; }
  }
  if ((o.v||1) < 7){ /* v7: варианты для иллюзий */
    ["Малая иллюзия","Безмолвный образ"].forEach(function(nm){ var src=b.spells.filter(function(x){ return x.name===nm; })[0], dst=o.spells.filter(function(x){ return x.name===nm; })[0]; if (src && dst && !(dst.variants&&dst.variants.length)){ dst.variants=clone(src.variants); dst.vsel=0; } });
  }
  if ((o.v||1) < 8){ /* v8: вариант «Дымовая завеса» */
    var siB=b.spells.filter(function(x){ return x.name==="Безмолвный образ"; })[0], siO=o.spells.filter(function(x){ return x.name==="Безмолвный образ"; })[0];
    if (siB && siO && siO.variants && !siO.variants.some(function(v){ return v.n==="Дымовая завеса"; })){ var sm=siB.variants.filter(function(v){ return v.n==="Дымовая завеса"; })[0]; if (sm) siO.variants.push(clone(sm)); }
  }
  o.v = b.v;
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
function lvl(){ return Math.max(1, Math.min(20, num(S.level)||1)); }
function PB(){ return Math.ceil(lvl()/4) + 1; }
function abilVal(k){ return num(S.abil[k]); }
function M(k){ return Math.floor((abilVal(k) - 10)/2); }
function hpMax(){ return Math.max(1, num(S.hpMax)); }
function jat(){ return lvl()>=2 ? Math.floor(PB()/2) : 0; } /* Мастер на все руки */
function saveB(k){ return M(k) + (S.saveProf[k] ? PB() : 0); }
function skP(k){ return num(S.skills[k]); }
function skillB(k){ return M(SKN[k][2]) + (skP(k) ? skP(k)*PB() : jat()); }
function checkB(k){ return M(k) + jat(); }
function passive(){ return 10 + skillB("prc"); }
function initB(){ return M("dex") + num(S.initBonus) + jat(); }
function acVal(){ return num(S.ac); }
/* чары */
function spAb(s){ return (s && s.abil) || S.castAbil; }
function sDC(s){ return 8 + PB() + M(spAb(s)); }
function sAtk(s){ return PB() + M(spAb(s)); }
function slotArr(){ return G.SLOTS[lvl()] || []; }
function slotMax(L){ return slotArr()[L-1] || 0; }
function slotLeft(L){ return Math.max(0, slotMax(L) - num(S.slotsUsed[L-1])); }
function slotsAny(){ var n=0; for (var L=1; L<=slotArr().length; L++) n+=slotLeft(L); return n; }
function knownMax(){ return G.KNOWN[lvl()] || 0; }
function knownCount(){ return S.spells.filter(function(s){ return s.lvl>0 && !s.mi && !s.scroll; }).length; }
function cantripMax(){ return G.CANTRIPS[lvl()] || 0; }
function cantripCount(){ return S.spells.filter(function(s){ return !s.lvl && !s.mi; }).length; }
function cantripMul(){ var l=lvl(); return l>=17?4:l>=11?3:l>=5?2:1; }
/* бард */
function biMax(){ return Math.max(1, M("cha")); }
function biLeft(){ return Math.max(0, biMax() - num(S.biUsed)); }
function biDie(){ var l=lvl(); return l>=15?12:l>=10?10:l>=5?8:6; }
function biShort(){ return lvl()>=5; }
function songDie(){ var l=lvl(); return l>=17?12:l>=13?10:l>=9?8:6; }
function glamour(){ return lvl()>=3; }
function mantleHP(){ var l=lvl(); return l>=15?14:l>=10?11:l>=5?8:5; }
function resOn(r){ return !r.minLvl || lvl()>=num(r.minLvl); }

function resMax(r){ var m=String(r.max).trim(); return m==="lvl"?lvl():m==="pb"?PB():m==="cha"?biMax():Math.max(0,num(m)); }
function resLeft(r){ return Math.max(0, resMax(r) - num(r.used)); }
function resVal(x){ return x==="lvl"?lvl():x==="pb"?PB():num(x); }
function hdTotal(){ return lvl(); }
function atkHit(a){ return M(a.abil) + (a.prof?PB():0) + num(a.bonus); }
function atkDmgMod(a){ return a.addMod ? M(a.abil) : 0; }
function dmgStr(dice, m){ return dice + (m ? (m>0?"+":"−")+Math.abs(m) : ""); }
var RESETN = {turn:"за ход", short:"кор. отдых", long:"долг. отдых", none:"не восстанавливается"};

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
var TABS = [["fight","Бой"],["sheet","Лист"],["magic","Чары"],["bag","Дела"],["faction","Фракция"],["soul","Душа"]];
var view = "fight"; try { view = localStorage.getItem(VKEY) || "fight"; } catch(e){}
if (!TABS.some(function(t){ return t[0]===view; })) view = "fight";
var EDIT = false;
var EDIT_ONLY = ["coin","qty","del","add","fame","pf","dt","fitem","var-add","var-del"];

document.getElementById("shell").innerHTML =
  '<header class="top"><div class="top-in">'+
    '<button type="button" class="ava" data-act="mirror" aria-label="Портрет"><img src="img/face.webp" alt=""></button>'+
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

(function embers(){ var h='<div class="spores" aria-hidden="true">'; for (var i=0;i<18;i++) h+='<i style="left:'+(Math.random()*100).toFixed(1)+'%;top:'+(Math.random()*100).toFixed(1)+'%;animation-delay:'+(Math.random()*9).toFixed(1)+'s;animation-duration:'+(9+Math.random()*9).toFixed(1)+'s"></i>'; document.body.insertAdjacentHTML("afterbegin", h+'</div>'); })();

/* ---------------- themes ---------------- */
var PALS = [
  {k:"sunset", n:"Закат", d:"Индиго, персик и бледное золото — как на портрете", c:["#140f24","#221a3a","#f2cf86","#c45fd6"]},
  {k:"vellum", n:"Пергамент", d:"Светлая страница — для яркого стола", c:["#ece0c6","#f8f0de","#7a4d12","#7d2a5a"]},
  {k:"cellar", n:"Погреб", d:"Чёрное вино, свечи и старое золото", c:["#120a0c","#24121a","#d9b264","#c0304a"]}
];
var pal = "sunset"; try { pal = localStorage.getItem(PKEY) || "sunset"; } catch(e){}
function applyPal(k){
  if (!PALS.some(function(p){return p.k===k;})) k="sunset";
  pal = k; if (k==="sunset") document.documentElement.removeAttribute("data-pal"); else document.documentElement.setAttribute("data-pal",k);
  var p = PALS.filter(function(x){return x.k===k;})[0]; var m=document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", p.c[0]);
  try { localStorage.setItem(PKEY,k); } catch(e){}
}

/* ---------------- small builders ---------------- */
function gear(on){ /* бутылка вина — ячейка заклинаний */
  return '<svg class="gear bottle'+(on?' on':'')+'" viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(16 16 17)">'+
    '<path class="wine" d="M10.2 19h11.6v9.6a1.4 1.4 0 0 1-1.4 1.4h-8.8a1.4 1.4 0 0 1-1.4-1.4z"/>'+
    '<path class="glass" d="M14 2h4v2.2h-.6v4.6c0 1.6 4.4 3 4.4 7.2v12.6a1.4 1.4 0 0 1-1.4 1.4h-8.8a1.4 1.4 0 0 1-1.4-1.4V16c0-4.2 4.4-5.6 4.4-7.2V4.2H14z"/>'+
    '<rect class="label" x="11.6" y="20.4" width="8.8" height="5.2" rx=".8"/><rect class="cork" x="14.4" y="1.2" width="3.2" height="2.4" rx=".6"/></g></svg>';
}
function hands(on){ /* молящиеся руки — «раз в день» */
  return '<svg class="hands'+(on?' on':'')+'" viewBox="0 0 24 24" aria-hidden="true"><path class="hl" d="M11.4 3.2c-.8-.3-1.6.2-1.8 1l-1.4 6.4-2.6 3.1c-.7.8-.8 2-.2 2.9l2.2 3.4h3.8V4.4c0-.5-.3-1-.8-1.2z"/><path class="hl" d="M12.6 3.2c.8-.3 1.6.2 1.8 1l1.4 6.4 2.6 3.1c.7.8.8 2 .2 2.9l-2.2 3.4h-3.8V4.4c0-.5.3-1 .8-1.2z"/><path class="ray" d="M12 .6v1.2M8.6 1.6l.5.9M15.4 1.6l-.5.9"/></svg>';
}
function miLeft(){ return num(S.miUsed) ? 0 : 1; }
function berry(state, skill){ /* золотая монета — владение, красный кристалл — экспертиза, медная — мастер на все руки */
  state = +state||0;
  var m = state>1 ? '<i class="pm gem-r" title="Экспертиза"></i>' : state ? '<i class="pm coin-g" title="Владение"></i>' : (skill && jat() ? '<i class="pm coin-c" title="Мастер на все руки"></i>' : '<i class="pm coin-e"></i>');
  return '<span class="gems" aria-hidden="true">'+m+'</span>';
}
function pips(n, used, act, attrs){
  var h=''; for (var i=0;i<n;i++) h+='<button type="button" class="pip'+(i<n-used?' on':'')+'" data-act="'+act+'" data-n="'+i+'" '+(attrs||'')+' aria-label="'+(i<n-used?'доступно':'потрачено')+'"></button>';
  return '<span class="pips">'+h+'</span>';
}
function inp(path, o){
  o = o||{}; var v = getPath(S, path); if (v==null) v="";
  var cls = 'in'+(o.cls?' '+o.cls:'')+(EDIT?'':' locked');
  var ro = EDIT ? '' : ' readonly tabindex="-1"', dis = EDIT ? '' : ' disabled';
  if (o.area) return '<textarea class="'+cls+'" data-p="'+path+'"'+ro+' rows="'+(o.rows||3)+'" placeholder="'+esc(o.ph||"")+'">'+esc(v)+'</textarea>';
  if (o.sel) return '<select class="'+cls+'" data-p="'+path+'"'+dis+'>'+o.sel.map(function(x){ return '<option value="'+esc(x[0])+'"'+(String(v)===String(x[0])?' selected':'')+'>'+esc(x[1])+'</option>'; }).join("")+'</select>';
  if (o.chk) return '<input type="checkbox" class="chk" data-p="'+path+'"'+(v?' checked':'')+dis+'>';
  if (o.num) return '<input class="'+cls+' num" data-p="'+path+'"'+ro+' data-t="num" inputmode="numeric" value="'+esc(v)+'" aria-label="'+esc(o.label||"")+'">';
  return '<input class="'+cls+'" data-p="'+path+'"'+ro+' value="'+esc(v)+'" placeholder="'+esc(o.ph||"")+'" aria-label="'+esc(o.label||o.ph||"")+'">';
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
    case "ac": return String(acVal());
    case "hpmax": return String(hpMax());
    case "hit": return sg(atkHit(S.attacks[+a]));
    case "dmg": var at=S.attacks[+a]; return diceRu(dmgStr(at.dice, atkDmgMod(at)));
    case "resmax": return String(resMax(S.res[+a]));
    case "slots": return slotArr().map(function(n,i){ return n+"×"+(i+1); }).join(" · ")||"—";
    case "hd": return (hdTotal()-num(S.hdUsed))+"/"+hdTotal()+" к"+S.hdDie;
    case "prep": return knownCount()+" / "+knownMax();
    case "cantr": return cantripCount()+" / "+cantripMax();
    case "bi": return biLeft()+"/"+biMax()+" к"+biDie();
  }
  return "";
}
function refreshCalc(){ document.querySelectorAll("[data-c]").forEach(function(el){ el.textContent = calc(el.getAttribute("data-c")); }); }

/* ---------------- header ---------------- */
function gearsTop(){
  return slotArr().map(function(n,i){ var L=i+1, left=slotLeft(L), h=''; for (var j=0;j<n;j++) h+=gear(j<left); return '<span class="sg" title="'+L+' круг"><i>'+L+'</i>'+h+'</span>'; }).join("");
}
function renderTop(){
  $("#h-name").textContent = S.name || "Безымянный";
  $("#h-sub").textContent = [S.cls+" "+lvl(), S.sub].filter(Boolean).join(" · ");
  var mx = hpMax(), hpCls = S.hp<=0 ? " down" : S.hp <= mx/2 ? " low" : "";
  $("#vitals").innerHTML =
    '<button type="button" class="vit hp'+hpCls+'" data-act="hp"><small>Хиты</small><b>'+S.hp+'</b><em>/'+mx+'</em>'+(S.temp>0?'<span class="tmp">+'+S.temp+'</span>':'')+'</button>'+
    '<div class="vit"><small>КД</small><b>'+acVal()+'</b></div>'+
    '<button type="button" class="vit bi" data-act="bi-give" aria-label="Вдохновение барда"><small>Вдохн. к'+biDie()+'</small><b>'+biLeft()+'</b><em>/'+biMax()+'</em></button>'+
    '<button type="button" class="vit ini" data-act="roll-init"><small>Иниц.</small><b>'+sg(initB())+'</b></button>'+
    '<button type="button" class="vit slots" data-act="slot-spend" aria-label="Ячейки заклинаний"><small>Ячейки</small><span>'+gearsTop()+'</span></button>'+
    (S.conc ? '<button type="button" class="vit conc" data-act="conc-drop"><small>Концентрация</small><b>'+esc(S.conc)+'</b></button>' : '');
  document.querySelectorAll(".tabs [data-tab]").forEach(function(b){ var on=b.getAttribute("data-tab")===view; b.classList.toggle("on",on); b.setAttribute("aria-selected",on); });
  var eb=$("#b-edit"); eb.classList.toggle("on",EDIT); eb.setAttribute("aria-pressed",EDIT); eb.textContent = EDIT ? "✓ Готово" : "✎ Правка";
  document.body.classList.toggle("editing", EDIT);
}

/* ---------------- views ---------------- */
function render(){
  if (S.hp > hpMax()) S.hp = hpMax();
  renderTop();
  var h = ({fight:vFight, sheet:vSheet, magic:vMagic, bag:vBag, faction:vFaction, soul:vSoul})[view]();
  var v = $("#view"); v.innerHTML = h; v.setAttribute("data-view", view);
  autosize();
}

/* ===== Бой ===== */
function vFight(){
  var hp = S.hp, mx = hpMax(), down = hp<=0;
  var hpCard = card("hpcard", "Хиты",
    '<div class="hpbig'+(down?' down':'')+'"><b>'+hp+'</b><span>/ '+mx+'</span>'+(S.temp>0?'<em>+'+S.temp+' врем.</em>':'')+'</div>'+
    '<div class="hpbar"><i style="width:'+Math.max(0,Math.min(100,hp/mx*100))+'%"></i>'+(S.temp>0?'<u style="width:'+Math.min(100,S.temp/mx*100)+'%"></u>':'')+'</div>'+
    '<div class="row3"><button type="button" class="btn bad" data-act="hp" data-mode="dmg">− Урон</button><button type="button" class="btn good" data-act="hp" data-mode="heal">+ Лечение</button><button type="button" class="btn" data-act="hp" data-mode="temp">Врем.</button></div>'+
    (down ? '<div class="death"><div><span class="lab">Успехи</span>'+deathPips("s")+'</div><div><span class="lab">Провалы</span>'+deathPips("f")+'</div><button type="button" class="btn gold" data-act="roll-death">Спасбросок от смерти</button></div>' : '')+
    '<div class="hd"><span>Кости хитов</span><b>'+C("hd")+'</b><button type="button" class="btn small" data-act="hd-roll"'+(num(S.hdUsed)>=hdTotal()?' disabled':'')+'>Потратить</button></div>');

  var stats = '<div class="statline">'+
    stat("КД", C("ac"), S.acNote)+
    '<button type="button" class="st tap" data-act="roll-init"><small>Инициатива</small><b>'+C("init")+'</b></button>'+
    stat("Скорость", S.speed+'<i> фт</i>')+
    stat("Мастерство", C("pb"))+
    stat("Пасс. вним.", C("pp"))+'</div>';

  var turn = card("turn", "Мой ход",
    '<div class="econ">'+[["a","Действие"],["b","Бонусное"],["r","Реакция"],["m","Движение"]].map(function(x){ return '<button type="button" class="eco'+(S.turn[x[0]]?' used':'')+'" data-act="eco" data-k="'+x[0]+'">'+x[1]+'</button>'; }).join("")+'</div>'+
    '<button type="button" class="btn gold wide" data-act="new-turn">↻ Новый ход</button>'+
    '<p class="hint">Новый ход снимает отметки действий.</p>');

  var bi = card("bi-c", "Вдохновение барда", biBody(), '<button type="button" class="lnk" data-act="bi-roll">к'+biDie()+' →</button>');

  var weap = S.attacks.length ? card("atk", "Оружие", S.attacks.map(function(a,i){
    return '<div class="arow"><div class="an"><b>'+esc(a.name)+'</b><small>'+esc(a.range||"")+'</small></div>'+
      '<button type="button" class="pill hit" data-act="atk" data-i="'+i+'"><small>Атака</small>'+C("hit:"+i)+'</button>'+
      '<button type="button" class="pill dmg" data-act="dmg" data-i="'+i+'"><small>'+esc(a.type||"урон")+'</small>'+C("dmg:"+i)+'</button></div>';
  }).join("")) : "";

  var sp = card("quick-sp", "Чары", spellHead() + S.spells.map(function(s,i){ return quickSpell(s,i); }).join(""), '<button type="button" class="lnk" data-tab="magic">все чары →</button>');

  var resRows = S.res.map(function(r,i){
    if (!resOn(r)) return "";
    return '<div class="resrow'+(r.heal?' has-heal':'')+'"><div><b>'+esc(r.name)+'</b><small>'+esc(RESETN[r.reset]||"")+(r.note?' · '+esc(r.note):'')+'</small></div>'+pips(resMax(r), num(r.used), "res", 'data-i="'+i+'"')+
      (r.heal?'<button type="button" class="btn small good" data-act="res-heal" data-i="'+i+'"'+(resLeft(r)?'':' disabled')+'>Намазать · '+diceRu(r.heal)+'</button>':'')+'</div>';
  }).join("");
  var miSp = S.spells.filter(function(x){ return x.daily; })[0];
  var miRow = miSp ? '<div class="resrow"><div><b>'+esc(miSp.name)+'</b><small>раз в день · долгий отдых</small></div><button type="button" class="handsb big" data-act="mi-tog" aria-label="'+(miLeft()?'доступно':'потрачено')+'">'+hands(miLeft())+'</button></div>' : '';
  var state = card("res", "Состояние",
    miRow+resRows+
    '<div class="resrow"><div><b>Вдохновение</b><small>от Мастера</small></div><button type="button" class="insp'+(S.insp?' on':'')+'" data-act="insp" aria-pressed="'+S.insp+'">★</button></div>'+
    (S.conc ? '<div class="hexon">Концентрация: <b>'+esc(S.conc)+'</b>. <button type="button" class="lnk" data-act="conc-drop">прервать</button></div>' : ''));

  var saves = card("saves-q", "Спасброски", '<div class="sgrid">'+G.AB.map(function(a){
    return '<button type="button" class="sv'+(S.saveProf[a[0]]?' prof':'')+'" data-act="save" data-k="'+a[0]+'"><small>'+a[1]+'</small><b>'+C("save:"+a[0])+'</b></button>';
  }).join("")+'</div>');

  var fav = G.SK.filter(function(s){ return skP(s[0])>0; });
  var skills = card("skills-q", "Ходовые навыки", '<div class="qsk">'+fav.map(function(s){
    return '<button type="button" class="qs" data-act="skill" data-k="'+s[0]+'">'+berry(skP(s[0]),1)+'<span>'+s[1]+'</span><b>'+C("skill:"+s[0])+'</b></button>';
  }).join("")+'</div>');

  var tray = card("tray", "Кубы", '<div class="dice">'+[4,6,8,10,12,20,100].map(function(d){ return '<button type="button" class="die" data-act="free" data-d="'+d+'">к'+d+'</button>'; }).join("")+'</div>'+
    '<div class="row2"><button type="button" class="btn" data-act="rest" data-k="short">Короткий отдых</button><button type="button" class="btn" data-act="rest" data-k="long">Долгий отдых</button></div>'+
    '<button type="button" class="lnk" data-act="log">журнал бросков →</button>');

  return stats + '<div class="grid g-fight"><div class="col">'+hpCard+turn+saves+'</div><div class="col">'+bi+sp+weap+'</div><div class="col">'+state+skills+tray+'</div></div>';
}
function biBody(){
  var h = '<div class="bitop"><div class="bidie"><b>к'+biDie()+'</b><small>'+(biShort()?'кор. отдых':'долг. отдых')+'</small></div>'+pips(biMax(), num(S.biUsed), "bi")+'</div>'+
    '<div class="row2"><button type="button" class="btn gold" data-act="bi-give"'+(biLeft()?'':' disabled')+'>Вдохновить · бонусное</button>'+
    (glamour() ? '<button type="button" class="btn" data-act="mantle"'+(biLeft()?'':' disabled')+'>Мантия · +'+mantleHP()+' врем.</button>' : '<button type="button" class="btn ghost" disabled>Мантия — с 3 ур.</button>')+'</div>'+
    '<p class="hint">Союзник в 60 фт добавляет к'+biDie()+' к проверке, атаке или спасброску — после броска, до объявления результата. Себе нельзя.'+(glamour()?' Мантия: до '+biMax()+' существ получают '+mantleHP()+' врем. хитов и реакцией отходят без атак по ним.':'')+'</p>';
  return h;
}
function stat(l, v, n, cls){ return '<div class="st'+(cls?' '+cls:'')+'"><small>'+l+'</small><b>'+v+'</b>'+(n?'<em>'+esc(n)+'</em>':'')+'</div>'; }
function deathPips(k){ var h=''; for (var i=0;i<3;i++) h+='<button type="button" class="ds '+k+(i<S.death[k]?' on':'')+'" data-act="death" data-k="'+k+'" data-n="'+i+'" aria-label="'+(k==="s"?"успех":"провал")+'"></button>'; return '<span class="dsr">'+h+'</span>'; }

/* чары */
function spellHead(){
  return '<div class="sphead"><div><small>Сл спасброска</small><b>'+C("dc")+'</b></div><div><small>Атака чарами</small><b>'+C("satk")+'</b></div><div class="lamps"><small>Ячейки</small>'+slotRows()+'</div></div>';
}
function slotRows(){
  return '<div class="slotrows">'+slotArr().map(function(n,i){
    var L=i+1, left=slotLeft(L), h='';
    for (var j=0;j<n;j++) h+='<button type="button" class="lampb" data-act="slot-toggle" data-l="'+L+'" data-n="'+j+'" aria-label="'+L+' круг: '+(j<left?'ячейка доступна':'ячейка потрачена')+'">'+gear(j<left)+'</button>';
    return '<div class="slotrow"><i>'+L+'</i>'+h+'</div>';
  }).join("")+'</div>';
}
function quickSpell(s,i){
  var btn;
  if (s.daily) return '<div class="arow sp daily"><button type="button" class="an an-b" data-act="cast-show" data-i="'+i+'"><b>'+sigil(s.fx)+esc(s.name)+'</b><small>раз в день · '+esc(s.range)+(s.conc?' · концентрация':'')+'</small></button>'+
    '<button type="button" class="handsb" data-act="mi-tog" aria-label="раз в день: '+(miLeft()?'доступно':'потрачено')+'">'+hands(miLeft())+'</button>'+
    (s.kind==="attack" ? '<button type="button" class="pill hit" data-act="sp-cast" data-i="'+i+'"'+(miLeft()?'':' disabled')+'><small>Атака</small>'+sg(sAtk(s))+'</button>'
      : '<button type="button" class="pill" data-act="sp-cast" data-i="'+i+'"'+(miLeft()?'':' disabled')+'><small>'+esc(s.time)+'</small>Наложить</button>')+'</div>';
  if (s.kind==="attack") btn = '<button type="button" class="pill hit" data-act="'+(s.lvl>0?'sp-cast':'sp-atk')+'" data-i="'+i+'"><small>Атака'+(beamsOf(s)>1?' ×'+beamsOf(s):'')+'</small>'+sg(sAtk(s))+'</button>';
  else if (s.kind==="save") btn = '<button type="button" class="pill dmg" data-act="sp-cast" data-i="'+i+'"><small>Сл '+String(sDC(s))+' · '+(ABN[s.save]?ABN[s.save][1]:"")+'</small>'+(s.dice?diceRu(upDice(s)):'спас')+'</button>';
  else if (s.kind==="auto") btn = '<button type="button" class="pill dmg'+(s.pool?' pool':'')+'" data-act="sp-cast" data-i="'+i+'"><small>'+(s.pool?'запас хитов':esc(s.type||"урон"))+'</small>'+diceRu(upDice(s))+'</button>';
  else if (s.kind==="heal") btn = '<button type="button" class="pill good" data-act="sp-cast" data-i="'+i+'"><small>лечение</small>'+diceRu(dmgStr(upDice(s), s.addMod?M(spAb(s)):0))+'</button>';
  else if (s.lvl>0) btn = '<button type="button" class="pill" data-act="sp-cast" data-i="'+i+'"><small>'+esc(s.time)+'</small>Наложить</button>';
  else btn = '<button type="button" class="pill ghost" data-act="sp-cast" data-i="'+i+'"><small>'+esc(s.time)+'</small>заговор</button>';
  var rep = (s.repeat && S.conc===s.name) ? '<button type="button" class="pill dmg rep" data-act="sp-repeat" data-i="'+i+'"><small>бонусом</small>'+diceRu(upDice(s, num(S.concL)||s.lvl))+'</button>' : '';
  return '<div class="arow sp'+(rep?' has-rep':'')+'"><button type="button" class="an an-b" data-act="cast-show" data-i="'+i+'"><b>'+sigil(s.fx)+esc(s.name)+(s.conc?' <i class="kc" title="Концентрация">К</i>':'')+'</b><small>'+(s.scroll?'свиток · одноразово · ':'')+(s.daily?'раз в день · ':'')+(s.lvl?s.lvl+' круг':'заговор')+' · '+esc(s.range)+'</small></button>'+rep+btn+'</div>';
}
function upDice(s, L){ /* урон с учётом круга ячейки */
  if (!s.dice) return "";
  if (!s.lvl && s.cantrip){ var c=parseDice(s.dice).terms[0]; if (c) return (c.n*cantripMul())+"d"+c.d; }
  L = L || s.lvl;
  if (s.lvl>0 && s.upcast){ var extra = L - s.lvl; if (extra>0){ var u=parseDice(s.upcast).terms[0], b=parseDice(s.dice).terms[0]; if (u && b && u.d===b.d) return (b.n+u.n*extra)+"d"+b.d; return s.dice+"+"+(u.n*extra)+"d"+u.d; } }
  return s.dice;
}
function beamsOf(s, L){ var n = num(s.beams)||1; if (s.beamsUp && s.lvl>0) n += Math.max(0,(L||s.lvl)-s.lvl)*num(s.beamsUp); return n; }

/* ===== Лист ===== */
function vSheet(){
  var hero = '<section class="card hero">'+
    '<button type="button" class="portrait" data-act="mirror" aria-label="Портрет"><img class="pimg" src="img/portrait.webp" alt="Портрет Эннио">'+'<span class="scrawl">вопросов к дому нет →</span></button>'+
    '<div class="hero-tx">'+
      '<div class="nm">'+(EDIT? inp("name",{cls:"big",label:"Имя"}) : '<h1>'+esc(S.name)+'</h1>')+'</div>'+
      '<div class="idgrid">'+
        idf("Раса","race")+idf("Класс","cls")+idf("Уровень","level",{num:1})+idf("Подкласс","sub")+
        idf("Предыстория","bg")+idf("Черта","feat")+idf("Мировоззрение","align")+idf("Божество","deity")+idf("Опыт","xp",{num:1})+
      '</div>'+
      (EDIT ? inp("quote",{area:1,rows:2,ph:"Фраза-девиз"}) : (S.quote?'<blockquote class="quote">«'+esc(S.quote)+'»</blockquote>':''))+
      (S.appearance && !EDIT ? '<details class="looks"><summary>как он выглядит</summary><p>'+nl(S.appearance)+'</p>'+(S.mirrorLook?'<p class="mirror-l"><b>Когда никто не смотрит.</b> '+nl(S.mirrorLook)+'</p>':'')+'</details>' : '')+
    '</div></section>';

  var abil = '<div class="abil">'+G.AB.map(function(a){
    return '<div class="ab"><small>'+a[2]+'</small>'+
      '<button type="button" class="abm" data-act="check" data-k="'+a[0]+'" aria-label="Проверка: '+a[2]+'">'+C("mod:"+a[0])+'</button>'+
      '<span class="abs">'+(EDIT? inp("abil."+a[0],{num:1,label:a[2]}) : esc(abilVal(a[0])))+'</span></div>';
  }).join("")+'</div>';

  var saves = card("saves", "Спасброски", G.AB.map(function(a){
    return '<div class="lrow"><button type="button" class="mark" data-act="tog-save" data-k="'+a[0]+'"'+(EDIT?'':' tabindex="-1"')+' aria-label="Владение">'+berry(S.saveProf[a[0]]?1:0)+'</button>'+
      '<button type="button" class="lr" data-act="save" data-k="'+a[0]+'"><span>'+a[2]+'</span><b>'+C("save:"+a[0])+'</b></button></div>';
  }).join(""));
  var skills = card("skills", "Навыки", G.SK.map(function(s){
    return '<div class="lrow"><button type="button" class="mark" data-act="tog-skill" data-k="'+s[0]+'"'+(EDIT?'':' tabindex="-1"')+' aria-label="Владение">'+berry(skP(s[0]),1)+'</button>'+
      '<button type="button" class="lr" data-act="skill" data-k="'+s[0]+'"><span>'+s[1]+' <i>'+ABN[s[2]][1]+'</i></span><b>'+C("skill:"+s[0])+'</b></button></div>';
  }).join("") + '<p class="hint">'+(EDIT?'Тапни по монете: пусто → владение → экспертиза.':'Золотая монета — владение, красный кристалл — экспертиза, медная — «Мастер на все руки» (+'+jat()+'). Тапни навык — бросок.')+'</p>');

  var core = card("core", "Тело", '<div class="coregrid">'+
    cf("КД без бонусов","ac",{num:1})+cf("Скорость","speed",{num:1})+cf("Макс. хиты","hpMax",{num:1,show:hpMax()})+cf("Кость хитов","hdDie",{num:1,pre:"к"})+cf("Бонус инициативы","initBonus",{num:1})+
    '<div class="cf"><small>Основа колдовства</small>'+(EDIT?inp("castAbil",{sel:G.AB.map(function(a){return [a[0],a[2]];})}):'<b>'+ABN[S.castAbil][2]+'</b>')+'</div>'+
    '</div>'+(EDIT? '<label class="sub">Откуда КД</label>'+inp("acNote")+'<p class="hint">На новом уровне поменяй «Уровень» и «Макс. хиты» — бонус мастерства, ячейки, кость вдохновения и число известных чар пересчитаются сами.</p>' : '<p class="hint">КД: '+esc(S.acNote)+'. Сейчас — '+acVal()+'.</p>'));

  var feats = card("feats", "Умения и способности", S.feats.map(function(f,i){
    if (EDIT) return '<div class="edrow">'+inp("feats."+i+".name",{ph:"Название"})+inp("feats."+i+".src",{ph:"Источник"})+inp("feats."+i+".desc",{area:1,rows:3,ph:"Описание"})+delBtn("feats",i)+'</div>';
    return '<details class="feat"><summary><b>'+esc(f.name)+'</b><small>'+esc(f.src)+'</small></summary><p>'+nl(f.desc)+'</p></details>';
  }).join("")+(EDIT?addBtn("feats","умение"):''));

  var res = EDIT ? card("res-ed", "Ресурсы", (S.res.length?'':'<p class="hint">Пока пусто.</p>')+S.res.map(function(r,i){
    return '<div class="edrow">'+inp("res."+i+".name",{ph:"Название"})+
      '<div class="ed3"><label>Максимум<br><small>число, lvl, pb или cha</small>'+inp("res."+i+".max",{ph:"1"})+'</label>'+
      '<label>Восстанавливается'+inp("res."+i+".reset",{sel:[["turn","каждый ход"],["short","короткий отдых"],["long","долгий отдых"],["none","не восстанавливается"]]})+'</label>'+
      '<label>С уровня<br><small>пусто — сразу</small>'+inp("res."+i+".minLvl",{num:1,label:"с уровня"})+'</label></div>'+
      inp("res."+i+".note",{ph:"Подсказка"})+delBtn("res",i)+'</div>';
  }).join("")+addBtn("res","ресурс")) : "";

  var profs = card("profs", "Владения и языки", [["armor","Доспехи"],["weapons","Оружие"],["tools","Инструменты"],["langs","Языки"]].map(function(x){
    return '<div class="pf"><small>'+x[1]+'</small><div>'+txt("prof."+x[0],{area:EDIT})+'</div></div>';
  }).join(""));

  var atkEd = EDIT ? card("atk-ed", "Оружие", S.attacks.map(function(a,i){
    return '<div class="edrow">'+inp("attacks."+i+".name",{ph:"Название"})+
      '<div class="ed3"><label>Хар-ка'+inp("attacks."+i+".abil",{sel:G.AB.map(function(x){return [x[0],x[1]];})})+'</label>'+
      '<label>Урон'+inp("attacks."+i+".dice",{ph:"1d6"})+'</label><label>Вид урона'+inp("attacks."+i+".type",{ph:"рубящий"})+'</label></div>'+
      '<div class="ed3"><label>Доп. к атаке'+inp("attacks."+i+".bonus",{num:1})+'</label><label>Дистанция'+inp("attacks."+i+".range",{ph:"5 фт"})+'</label>'+
      '<span class="chks"><label>'+inp("attacks."+i+".prof",{chk:1})+' владение</label><label>'+inp("attacks."+i+".addMod",{chk:1})+' мод. к урону</label></span></div>'+
      '<p class="hint">Итог: атака '+C("hit:"+i)+', урон '+C("dmg:"+i)+'</p>'+delBtn("attacks",i)+'</div>';
  }).join("")+addBtn("attacks","оружие")) : "";

  return hero + abil + '<div class="grid g-sheet"><div class="col">'+saves+core+'</div><div class="col">'+skills+'</div><div class="col">'+feats+profs+'</div></div>'+
    (EDIT ? '<div class="grid g-two">'+'<div class="col">'+atkEd+'</div><div class="col">'+res+'</div></div>' : '');
}
function idf(l, path, o){ return '<div class="idf"><small>'+l+'</small><div>'+txt(path,o)+'</div></div>'; }
function cf(l, path, o){ return '<div class="cf"><small>'+l+'</small>'+(EDIT?inp(path,o):'<b>'+((o&&o.pre)||"")+esc(o&&o.show!=null?o.show:getPath(S,path))+'</b>')+'</div>'; }
function delBtn(list,i){ return '<button type="button" class="del" data-act="del" data-l="'+list+'" data-i="'+i+'">удалить</button>'; }
function addBtn(list,w){ return '<button type="button" class="btn small add" data-act="add" data-l="'+list+'">+ '+w+'</button>'; }

/* ===== Чары ===== */
function vMagic(){
  var head = card("mag-head", "Магия барда",
    '<div class="maghead"><div><small>Основа</small><b>'+ABN[S.castAbil][2]+'</b></div><div><small>Сл спасброска</small><b>'+C("dc")+'</b></div><div><small>Атака чарами</small><b>'+C("satk")+'</b></div><div><small>Известно</small><b>'+C("prep")+'</b></div><div><small>Заговоры</small><b>'+C("cantr")+'</b></div></div>'+
    '<div class="slotbig">'+slotRows()+'</div>'+
    ''+(function(){ var mi=S.spells.filter(function(x){return x.mi;}), dl=mi.filter(function(x){return x.daily;})[0]; if (!mi.length) return ''; var ab=spAb(mi[0]);
      return '<p class="hint mi-note">'+hands(miLeft())+' Чары из черты «Посвящённый в магию» · основа — '+ABN[ab][2]+': Сл '+sDC(mi[0])+', атака '+sg(sAtk(mi[0]))+'.'+(dl?' «'+esc(dl.name)+'» — раз в день, без ячейки.':'')+'</p>'; })()+
    '<p class="hint">Бутылки — ячейки. Возвращаются только после долгого отдыха. При накладывании можно взять ячейку выше — урон и лечение пересчитаются сами. «Злая насмешка» растёт с уровнем.</p>'+
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
      '<div class="ed3"><label>Тип'+inp(P+"kind",{sel:[["util","без броска"],["attack","атака заклинанием"],["save","спасбросок"],["auto","урон без броска"],["heal","лечение"]]})+'</label>'+
      '<label>Спасбросок'+inp(P+"save",{sel:[["",""]].concat(G.AB.map(function(a){return [a[0],a[2]];}))})+'</label>'+
      '<label>Урон / вид'+inp(P+"dice",{ph:"2d8"})+inp(P+"type",{ph:"психической энергией"})+'</label></div>'+
      '<div class="ed3"><label>Усиление за круг'+inp(P+"upcast",{ph:"1d8"})+'</label><label>Лучей / +за круг'+inp(P+"beams",{num:1,label:"лучей"})+inp(P+"beamsUp",{num:1,label:"лучей за круг"})+'</label>'+
      '<span class="chks"><label>'+inp(P+"conc",{chk:1})+' концентрация</label><label>'+inp(P+"half",{chk:1})+' половина при успехе</label><label>'+inp(P+"addMod",{chk:1})+' + мод. ХАР</label><label>'+inp(P+"cantrip",{chk:1})+' заговор растёт с уровнем</label><label>'+inp(P+"pool",{chk:1})+' это запас хитов, не урон</label></span></div>'+
      '<div class="ed3"><label>Слова'+inp(P+"incant",{ph:"Che peccato."})+'</label><label>Как читать'+inp(P+"incantTr",{ph:"Ке пекка́то."})+'</label><label>Перевод'+inp(P+"incantRu",{ph:"Какая жалость."})+'</label></div>'+
      '<div class="ed3"><label>Эффект'+inp(P+"fx",{sel:FXL})+'</label></div>'+
      (s.variants&&s.variants.length ? s.variants.map(function(v,k){ return '<div class="varrow"><label class="sub">Вариант '+(k+1)+'</label>'+inp(P+"variants."+k+".n",{ph:"Название варианта"})+inp(P+"variants."+k+".t",{area:1,rows:4,ph:"Как это выглядит"})+'<button type="button" class="del" data-act="var-del" data-i="'+i+'" data-k="'+k+'">удалить вариант</button></div>'; }).join("")
        : '<label class="sub">Как это выглядит у Эннио</label>'+inp(P+"flavor",{area:1,rows:4,ph:"Что видят все вокруг"}))+
      '<button type="button" class="btn small add" data-act="var-add" data-i="'+i+'">+ вариант описания</button>'+
      '<label class="sub">Правила</label>'+inp(P+"desc",{area:1,rows:5,ph:"Описание"})+delBtn("spells",i)+'</div></section>';
  }
  var act = s.kind==="attack" && !s.lvl ? '<button type="button" class="btn gold" data-act="sp-atk" data-i="'+i+'">Атака '+sg(sAtk(s))+'</button>'
          : s.lvl>0 ? '<button type="button" class="btn gold" data-act="sp-cast" data-i="'+i+'">Наложить'+(s.kind==="save"?' · Сл '+String(sDC(s)):s.kind==="attack"?' · атака '+sg(sAtk(s)):'')+'</button>'
          : '<button type="button" class="btn" data-act="sp-cast" data-i="'+i+'">Наложить'+(s.kind==="save"?' · Сл '+String(sDC(s)):'')+'</button>';
  var dmg = s.dice ? '<span class="chip warm">'+diceRu(s.kind==="heal"?dmgStr(upDice(s), s.addMod?M(spAb(s)):0):upDice(s))+(beamsOf(s)>1?' × '+beamsOf(s):'')+' '+esc(s.kind==="heal"?"хитов":s.type||"")+'</span>' : '';
  return '<section class="card spell fx-'+(s.fx||"sparks")+'"><div class="sp-t"><h4>'+esc(s.name)+(s.daily?' <button type="button" class="handsb" data-act="mi-tog" aria-label="раз в день">'+hands(miLeft())+'</button>':'')+'</h4><small>'+esc(s.en||"")+(s.school?' · '+esc(s.school):'')+(s.mi?' · Посвящённый в магию':'')+'</small></div>'+
    '<div class="chips"><span class="chip">'+esc(s.time)+'</span><span class="chip">'+esc(s.range)+'</span><span class="chip">'+esc(s.dur)+'</span><span class="chip">'+esc(s.comp)+'</span>'+(s.conc && !/концентр/i.test(s.dur||"")?'<span class="chip kc">Концентрация</span>':'')+dmg+'</div>'+
    incantBtn(s,i)+
    '<details class="sp-d"><summary>правила</summary><p>'+nl(s.desc)+'</p></details>'+(act?'<div class="sp-a">'+act+'</div>':'')+'</section>';
}

/* ===== экран чар ===== */
var FXL = [["bell","Колокол"],["light","Свет мессы"],["pray","Молитва"],["mock","Укол словом"],["whisper","Шёпот"],["heal","Золотые нити"],["sleep","Вино и дрёма"],["mask","Чужое лицо"],["laugh","Смех"],["snake","Крылатая змея"],["gold","Расплавленное золото"],["sparks","Искры"]];
function sigil(fx){
  var P = {
    bell:'<path d="M12 3c-3.3 0-5.5 2.6-5.5 6v4L4.5 16h15l-2-3V9c0-3.4-2.2-6-5.5-6z"/><path d="M10 19a2 2 0 0 0 4 0" opacity=".8"/><path d="M2.5 8c.6-1.6 1.4-2.8 2.5-3.8M21.5 8c-.6-1.6-1.4-2.8-2.5-3.8" opacity=".5"/>',
    light:'<path d="M12 2v4M12 18v4M2 12h4M18 12h4" opacity=".7"/><circle cx="12" cy="12" r="3.5"/><path d="M5 5l2.5 2.5M19 19l-2.5-2.5M19 5l-2.5 2.5M5 19l2.5-2.5" opacity=".45"/>',
    pray:'<path d="M11.4 3.2c-.8-.3-1.6.2-1.8 1l-1.4 6.4-2.6 3.1c-.7.8-.8 2-.2 2.9l2.2 3.4h3.8V4.4c0-.5-.3-1-.8-1.2zM12.6 3.2c.8-.3 1.6.2 1.8 1l1.4 6.4 2.6 3.1c.7.8.8 2 .2 2.9l-2.2 3.4h-3.8V4.4c0-.5.3-1 .8-1.2z"/>',
    mock:'<path d="M4 6h16v9H11l-5 4v-4H4z"/><path d="M9 10.5h6" opacity=".7"/>',
    whisper:'<path d="M5 12c0-4 3-7 7-7"/><path d="M8.5 12c0-2 1.6-3.5 3.5-3.5" opacity=".75"/><path d="M12 12h0.01M15 9l5-3M15 15l5 3M16 12h5" opacity=".6"/>',
    heal:'<path d="M5 19 17 7"/><circle cx="18.5" cy="5.5" r="1.6"/><path d="M5 19c-2-3 1-5 3-3s5 0 3-3 2-5 4-3" opacity=".7"/>',
    sleep:'<path d="M9 3h6l-1 4c3 1 4 3 4 6v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7c0-3 1-5 4-6z"/><path d="M8 14h8" opacity=".6"/>',
    mask:'<path d="M3 8c3-2 15-2 18 0 0 6-3 10-9 10S3 14 3 8z"/><path d="M7 10.5c1-1 3-1 4 0M13 10.5c1-1 3-1 4 0" opacity=".8"/>',
    laugh:'<circle cx="12" cy="12" r="9"/><path d="M7.5 13c1 3 8 3 9 0z"/><path d="M8 9.5l2 1-2 1M16 9.5l-2 1 2 1" opacity=".8"/>',
    snake:'<path d="M5 19c4 0 4-5 8-5s3 5 6 5"/><path d="M13 14c-3 0-5-2-5-4.5S10 5 13 5c2 0 3 1 3 2"/><circle cx="15.5" cy="6.5" r=".9"/><path d="M8 9 3 6M8 10 3 11" opacity=".6"/>',
    gold:'<path d="M8 3h5v4l3 3v1H5v-1l3-3z"/><path d="M10 12c0 3 1 4 1 6M14 12c0 2 1 3 1 5" opacity=".75"/><ellipse cx="12" cy="20" rx="6" ry="1.6"/>',
    sparks:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><path d="M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" opacity=".6"/>'
  }[fx] || '<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>';
  return '<svg class="sig" viewBox="0 0 24 24" aria-hidden="true">'+P+'</svg>';
}
function incantBtn(s,i,src){
  if (!s.incant && !s.flavor) return "";
  return '<button type="button" class="inc-btn" data-act="cast-show" data-i="'+i+'"'+(src?' data-src="'+src+'"':'')+'>'+sigil(s.fx)+'<span class="inc-q">«'+esc(s.incant||s.name)+'»'+(s.incantTr?' <i>'+esc(s.incantTr)+'</i>':'')+'</span><b>показать ✦</b></button>';
}
function fxHtml(fx){
  var h = '', i;
  if (fx==="snake" || fx==="mock" || fx==="light"){
    h = fx==="snake"
      ? '<svg class="bolt" viewBox="0 0 400 300" preserveAspectRatio="none"><path class="b1" d="M30 250 L370 50"/><path class="b2" d="M30 250 L370 50"/></svg><i class="orb"></i>'
      : '<svg class="bolt" viewBox="0 0 400 300" preserveAspectRatio="none"><path class="b1" d="M40 270 L120 190 L100 175 L190 120 L170 105 L300 40 L285 70 L370 30"/><path class="b2" d="M40 270 L110 210 L95 198 L200 140 L185 125 L330 60"/></svg><i class="orb"></i>';
    for (i=0;i<14;i++) h += '<i class="smoke" style="--x:'+(Math.random()*100).toFixed(0)+'%;--d:'+(Math.random()*2).toFixed(2)+'s"></i>';
  } else if (fx==="whisper" || fx==="laugh" || fx==="mask" || fx==="bell"){
    for (i=0;i<4;i++) h += '<i class="ring" style="animation-delay:'+(i*0.45)+'s"></i>';
    for (i=0;i<16;i++) h += '<i class="leaf" style="--a:'+(i*22.5)+'deg;--d:'+(Math.random()*0.6).toFixed(2)+'s"></i>';
  } else {
    for (i=0;i<26;i++) h += '<i class="spark" style="--x:'+(Math.random()*100).toFixed(0)+'%;--y:'+(30+Math.random()*70).toFixed(0)+'%;--d:'+(Math.random()*3).toFixed(2)+'s;--s:'+(0.5+Math.random()).toFixed(2)+'"></i>';
    h += '<i class="smoke-ring"></i><i class="smoke-ring r2"></i>';
  }
  return h;
}
function srcList(src){ return S.spells; }
function showCast(i, src){
  var s = srcList(src)[i]; if (!s) return;
  var fx = s.fx || "sparks", el = $("#cast"), act, mech;
  var words = String(s.incant||"").split(/\s+/).filter(Boolean);
  {
    mech = [esc(s.time), esc(s.range), esc(s.dur)];
    if (s.kind==="attack") mech.push("атака "+sg(sAtk(s)));
    if (s.kind==="save") mech.push("Сл "+sDC(s)+" · "+(ABN[s.save]?ABN[s.save][2]:""));
    if (s.dice) mech.push(diceRu(s.kind==="heal"?dmgStr(upDice(s), s.addMod?M(spAb(s)):0):upDice(s))+(beamsOf(s)>1?" × "+beamsOf(s):"")+" "+esc(s.kind==="heal"?"хитов":s.type||""));
    if (s.conc && !/концентр/i.test(s.dur||"")) mech.push("концентрация");
    act = s.kind==="attack" && !s.lvl ? '<button type="button" class="btn gold big" data-act="sp-atk" data-i="'+i+'">Атака '+sg(sAtk(s))+'</button>'
        : '<button type="button" class="btn gold big" data-act="sp-cast" data-i="'+i+'">Наложить'+(s.scroll?' · свиток':s.daily?' · раз в день':s.lvl>0?' · ячейка':'')+'</button>';
  }
  el.className = "cast fx-"+fx;
  el.innerHTML = '<div class="cast-fx" aria-hidden="true">'+fxHtml(fx)+'</div>'+
    '<div class="cast-in"><span class="cast-eye">'+(s.lvl?s.lvl+' круг':'заговор')+(s.school?' · '+esc(s.school):'')+'</span>'+
    '<h2>'+sigil(fx)+esc(s.name)+'</h2>'+
    (words.length?'<p class="cast-words">'+words.map(function(w,k){ return '<span style="animation-delay:'+(0.45+k*0.32).toFixed(2)+'s">'+esc(w)+'</span>'; }).join(" ")+'</p>':'')+
    (s.incantTr?'<p class="cast-tr" style="animation-delay:'+(0.5+words.length*0.32).toFixed(2)+'s">'+esc(s.incantTr)+'</p>':'')+
    (s.incantRu?'<p class="cast-ru" style="animation-delay:'+(0.8+words.length*0.32).toFixed(2)+'s">'+esc(s.incantRu)+'</p>':'')+
    flavorHtml(s, i, src)+
    '<div class="cast-mech">'+mech.filter(Boolean).map(function(m){ return '<span class="chip">'+m+'</span>'; }).join("")+'</div>'+
    (act?'<div class="cast-act">'+act+'</div>':'')+
    '<span class="cast-hint">тап в любом месте — закрыть · пара слов на родном языке Джентиле — вполголоса, как за семейным столом</span></div>';
  el.hidden = false; document.body.classList.add("cast-open");
  requestAnimationFrame(function(){ el.classList.add("open"); });
}
function flavorHtml(s, i, src){
  var V = s.variants||[];
  if (V.length){
    var k = Math.min(num(s.vsel), V.length-1);
    return '<div class="cast-vars" role="group" aria-label="Как это выглядит">'+V.map(function(v,j){ return '<button type="button" class="'+(j===k?'on':'')+'" data-act="cast-var" data-i="'+i+'"'+(src?' data-src="'+src+'"':'')+' data-k="'+j+'">'+esc(v.n||("Вариант "+(j+1)))+'</button>'; }).join("")+'</div><p class="cast-flavor" id="cast-fl">'+nl(V[k].t)+'</p>';
  }
  return s.flavor?'<p class="cast-flavor">'+nl(s.flavor)+'</p>':'<p class="cast-flavor dim">Как это выглядит — допиши в «Правке».</p>';
}
function hideCast(){ var el=$("#cast"); if (el.hidden) return; el.classList.remove("open"); document.body.classList.remove("cast-open"); setTimeout(function(){ el.hidden=true; el.innerHTML=""; }, 250); }

/* ===== Дела ===== */
function vBag(){
  var coins = [["cp","мм","медные"],["sp","см","серебряные"],["ep","эм","электрумовые"],["gp","зм","золотые"],["pp","пм","платиновые"]];
  var c = card("coins", "Касса", '<div class="coinrow">'+coins.map(function(x){
    return '<div class="coin c-'+x[0]+'"><span class="cface">'+x[1]+'</span>'+inp("coins."+x[0],{num:1,label:x[2]+" монеты"})+
      '<div class="cbtn"><button type="button" data-act="coin" data-k="'+x[0]+'" data-d="-1" aria-label="минус">−</button><button type="button" data-act="coin" data-k="'+x[0]+'" data-d="1" aria-label="плюс">+</button></div></div>';
  }).join("")+'</div><p class="hint">В пересчёте: <b data-c-gold>'+goldTotal()+'</b> зм. Взнос дому — 5 зм в месяц.</p>');

  var items = card("items", "Снаряжение", '<div class="itemlist">'+S.items.map(function(it,i){
    return '<div class="item"><div class="qty"><button type="button" data-act="qty" data-i="'+i+'" data-d="-1" aria-label="меньше">−</button>'+inp("items."+i+".qty",{num:1,label:"количество"})+'<button type="button" data-act="qty" data-i="'+i+'" data-d="1" aria-label="больше">+</button></div>'+
      '<div class="itx">'+inp("items."+i+".name",{ph:"Предмет",cls:"bare b"})+inp("items."+i+".note",{ph:"заметка",cls:"bare s"})+'</div>'+
      '<button type="button" class="del x2" data-act="del" data-l="items" data-i="'+i+'" aria-label="Выбросить">✕</button></div>';
  }).join("")+'</div>'+addBtn("items","предмет"));

  var fv = card("trinkets", "Долги и услуги", '<p class="scrawl-note">кто кому должен. с процентами.</p><div class="trs">'+
    (S.favors.length? S.favors.map(function(t,i){
      return '<div class="tr"><span class="shine" aria-hidden="true"></span>'+inp("favors."+i+".name",{ph:"Кто",cls:"bare b"})+inp("favors."+i+".note",{ph:"что должен и с какого дня",cls:"bare s"})+
        '<button type="button" class="del x2" data-act="del" data-l="favors" data-i="'+i+'" aria-label="Закрыть долг">✕</button></div>';
    }).join("") : '<p class="empty">Пока никто никому не должен. Это ненадолго.</p>')+'</div>'+addBtn("favors","долг"));

  var sec = card("alias", "Двойная жизнь", '<p class="scrawl-note">сжечь после прочтения.</p>'+
    [["cover","Кем его считают",3],["truth","Правда",2],["knows","Кто знает",2],["tells","Что может выдать",3],["stakes","Что будет, если узнают",3]].map(function(x){
      return '<label class="al-f"><small>'+x[1]+'</small>'+inp("secret."+x[0], {area:1,rows:x[2],cls:"paper"})+'</label>';
    }).join(""));

  return '<div class="grid g-two g-bag"><div class="col">'+c+items+'</div><div class="col">'+sec+fv+'</div></div>';
}
/* ===== Фракция ===== */
var Z = G.ZH;
function fRank(){ return Math.max(0, Math.min(5, num(S.fac.rank))); }
function fDoom(){ return S.fac.sub==="doom"; }
function sendMax(){ var r=fRank(); return r>=5?3:r>=2?1:0; }
function itemPicks(){ var r=fRank(); return fDoom() ? 0 : Math.max(0, r-1); }
function rankReady(R){ return num(S.fac.fame)>=R.fame && num(S.fac.pf)>=R.pf && lvl()>=R.lvl; }
function consAvail(){ var out=[]; Z.ranks.forEach(function(R){ if (R.n<=fRank()) R.cons.forEach(function(k){ out.push(k); }); }); return out; }
function vFaction(){
  var r = fRank(), next = Z.ranks[r] || null, cur = Z.ranks[r-1] || null;
  var head = card("fac-head", "Жентарим · Чёрная Сеть",
    '<div class="fachead"><div class="facrank"><small>ранг</small><b>'+(cur?cur.n+' · '+esc(cur.name):'—')+'</b>'+(fDoom()?'<em>Рейдеры Рока</em>':'')+'</div>'+
    '<div class="faccnt"><small>Очки славы</small><div class="cbtn"><button type="button" data-act="fame" data-d="-1" aria-label="минус">−</button><b>'+num(S.fac.fame)+'</b><button type="button" data-act="fame" data-d="1" aria-label="плюс">+</button></div></div>'+
    '<div class="faccnt"><small>Поручения</small><div class="cbtn"><button type="button" data-act="pf" data-d="-1" aria-label="минус">−</button><b>'+num(S.fac.pf)+'</b><button type="button" data-act="pf" data-d="1" aria-label="плюс">+</button></div></div>'+
    '<div class="faccnt"><small>Дни простоя</small><div class="cbtn"><button type="button" data-act="dt" data-d="-1" aria-label="минус">−</button><b>'+num(S.downtime)+'</b><button type="button" data-act="dt" data-d="1" aria-label="плюс">+</button></div></div></div>'+
    (next ? '<div class="facnext'+(rankReady(next)?' ready':'')+'"><span>Следующий — <b>'+next.n+' · '+esc(next.name)+'</b>: слава '+num(S.fac.fame)+'/'+next.fame+(next.pf?' · поручения '+num(S.fac.pf)+'/'+next.pf:'')+' · уровень '+lvl()+'/'+next.lvl+'</span>'+
      '<button type="button" class="btn '+(rankReady(next)?'gold':'ghost')+'" data-act="rank-up"'+(rankReady(next)?'':' disabled')+'>Принять ранг «'+esc(next.name)+'»</button></div>' : '<p class="hint">Выше в Сети только легенды.</p>')+
    '<div class="row2"><button type="button" class="btn" data-act="fac-work"'+(r&&num(S.downtime)>=Z.work[r]?'':' disabled')+'>Фракционная работа · '+(Z.work[r]||30)+' дн. → +1 слава</button>'+
    '<button type="button" class="btn" data-act="fac-sub">'+(fDoom()?'Основная Сеть':'Перейти к Рейдерам Рока')+'</button></div>'+
    '<p class="hint">Слава за дни простоя тоже считается выполненным поручением. Ранг принимается кнопкой, когда хватает славы, поручений и уровня.'+(EDIT?' <button type="button" class="lnk" data-act="rank-down">понизить ранг (правка)</button>':'')+'</p>');

  var snake = card("fac-snake", "Знак Сети",
    '<button type="button" class="btn gold wide" data-act="snake"'+(r?'':' disabled')+'>Показать змею · Запугивание '+sg(skillB("itm"))+' +1к4</button>'+
    (sendMax() ? '<div class="resrow"><div><b>«Послание» через татуировку</b><small>Жентам, которых видел · долгий отдых</small></div>'+pips(sendMax(), num(S.fac.sendUsed), "send")+'</div>' : '<p class="hint">Со 2-го ранга — «Послание» другим Жентам раз до долгого отдыха.</p>')+
    '<p class="hint">Змея прячется в черепе на левом предплечье и по желанию выползает на ладонь.</p>');

  var ca = consAvail(), cs = Z.cons[S.fac.cons];
  var cons = card("fac-cons", "Расходник на приключение",
    (ca.length ? '<div class="conspick">'+ca.map(function(k){ var c=Z.cons[k]; return '<button type="button" class="tgl'+(S.fac.cons===k?' on':'')+'" data-act="cons-pick" data-k="'+k+'">'+esc(c.name)+'</button>'; }).join("")+'</div>' : '<p class="hint">Расходники — с 1-го ранга.</p>')+
    (cs ? '<div class="consbox'+(S.fac.consUsed?' used':'')+'"><b>'+esc(cs.name)+'</b><small>'+esc(cs.kind)+'</small><p>'+esc(cs.eff)+'</p>'+
      '<div class="row2"><button type="button" class="btn gold" data-act="cons-use"'+(S.fac.consUsed?' disabled':'')+'>'+(S.fac.consUsed?'Использован':(cs.dice?'Применить · '+diceRu(cs.dice):'Применить'))+'</button><button type="button" class="btn" data-act="cons-new">Новое приключение</button></div></div>' : '')+
    '<p class="hint">В начале приключения выбираешь один расходник своего ранга или ниже. Держать можно только один. Достаётся из фракционной сумки.</p>');

  var picks = itemPicks();
  var items = card("fac-items", fDoom() ? "Предмет из Приложения Б" : "Предметы Сети",
    (fDoom() ? (r>=2 ? '<label class="al-f"><small>Один раз — любой предмет из Приложения Б</small>'+inp("fac.bookItem",{ph:"что выбрал"})+'</label>' : '<p class="hint">Со 2-го ранга.</p>')
     : '<p class="hint">'+(picks ? 'Выбрано '+S.fac.items.length+' из '+picks+'. Со 2-го ранга — один предмет (или «Поиск фамильяра» раз в день), и ещё по одному за каждый новый ранг.' : 'Со 2-го ранга — один предмет на выбор, потом по одному за каждый новый ранг.')+'</p>'+
       Z.items.map(function(it){ var on=S.fac.items.indexOf(it.name)>=0, lock=!on && S.fac.items.length>=picks;
         return '<div class="facitem'+(on?' on':'')+'"><button type="button" class="inftog" data-act="fitem" data-k="'+esc(it.name)+'"'+(lock?' disabled':'')+' aria-pressed="'+on+'" aria-label="взять предмет">'+gear(on)+'</button><div class="inftx"><b>'+esc(it.name)+'</b><small>'+esc(it.tag)+'</small><details class="sp-d"><summary>что делает</summary><p>'+esc(it.desc)+'</p></details></div></div>';
       }).join("")+
       (r>=4 ? '<div class="facitem on"><span class="inftog">'+gear(true)+'</span><div class="inftx"><b>Бокалы убийцы × 2</b><small>необычный · ранг 4</small><p class="hint">Бонусным действием меняешь содержимое своего бокала с другим бокалом в пределах 60 фт.</p></div></div>' : '')));

  var helper = r>=3 ? card("fac-help", fDoom() ? "Наёмники" : "Помощник",
    fDoom() ? '<p>До трёх головорезов или ветеранов за подённую плату ходят с тобой в приключение (ставки — в файле фракций).</p>'
            : '<div class="netgrid"><label><small>Имя</small>'+inp("fac.helper",{cls:"bare b",ph:"Как зовут"})+'</label><label><small>Кто</small>'+inp("fac.helperKind",{sel:[["",""],["acolyte","послушник"],["apprentice","ученик волшебника"],["scout","разведчик"],["thug","головорез"]]})+'</label></div><p class="hint">Уровень помощника — как у Эннио. Ходит с тобой или выполняет мелкие поручения.'+(r>=4?' Ранг 4: +1 оружие, щит +1 или +2 к характеристике.':'')+'</p>') : '';

  var ranks = '<h3 class="lvlh">Ранги</h3><div class="rankgrid">'+Z.ranks.map(function(R){
    var st = R.n<=r ? 'on' : R.n===r+1 && rankReady(R) ? 'ready' : 'off';
    return '<section class="card rank '+st+'"><div class="rk-t"><span class="rk-n">'+R.n+'</span><div><h4>'+esc(R.name)+'</h4><small>'+(R.n===1?'при вступлении':'слава '+R.fame+(R.pf?' · '+R.pf+' поручений':'')+' · '+R.lvl+' уровень')+'</small></div>'+
      (st==="on"?'<span class="chip warm">активен</span>':st==="ready"?'<span class="chip">можно принять</span>':'')+'</div>'+
      '<blockquote class="quote">«'+esc(R.quote)+'»</blockquote>'+
      '<ul class="perks">'+R.perks.map(function(p){ return '<li>'+esc(p)+'</li>'; }).join("")+(fDoom()?R.doom.map(function(p){ return '<li class="doom">'+esc(p)+'</li>'; }).join(""):'')+'</ul>'+
      '<details class="sp-d"><summary>догмы ранга</summary><ol>'+R.dogma.map(function(d){ return '<li>'+esc(d)+'</li>'; }).join("")+'</ol></details></section>';
  }).join("")+'</div>';

  var about = card("fac-about", "О Сети", '<p>'+esc(Z.about)+'</p>'+
    '<label class="sub">Цели</label><p>'+Z.goals.map(esc).join(" · ")+'</p>'+
    '<label class="sub">Основные догмы</label><ol class="dog">'+Z.dogmas.map(function(d){ return '<li>'+esc(d)+'</li>'; }).join("")+'</ol>'+
    (fDoom()?'<label class="sub">Рейдеры Рока</label><p>'+esc(Z.doomAbout)+'</p>':'')+
    '<details class="sp-d"><summary>клятва при вступлении</summary><p class="oath">«'+esc(Z.oath)+'»</p></details>'+
    '<details class="sp-d"><summary>сумка и правила предметов</summary><p>'+esc(Z.bag)+'</p><p>'+esc(Z.rules)+'</p></details>'+
    '<details class="sp-d"><summary>за что отнимают славу и изгоняют</summary><p><b>Минус слава:</b></p><ul>'+Z.loss.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join("")+'</ul><p><b>Изгнание навсегда:</b></p><ul>'+Z.exile.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join("")+'</ul></details>');

  return '<div class="grid g-two"><div class="col">'+head+snake+cons+helper+'</div><div class="col">'+about+items+'</div></div>'+ranks;
}
function useScroll(nm){
  var j = S.spells.findIndex(function(x){ return x.name===nm && x.scroll; }); if (j>=0) S.spells.splice(j,1);
  var base = nm.replace(/\s*\(свиток\)\s*$/,""), it = S.items.filter(function(x){ return x.name==="Свиток: "+base; })[0];
  if (it){ it.qty = Math.max(0, num(it.qty)-1); if (!it.qty) S.items.splice(S.items.indexOf(it),1); }
  addLog("Свиток прочитан", "", base); save(); render();
}
function goldTotal(){ var k=S.coins; var g = num(k.cp)/100 + num(k.sp)/10 + num(k.ep)/2 + num(k.gp) + num(k.pp)*10; return (Math.round(g*100)/100).toString().replace(".",","); }

/* ===== Душа ===== */
function vSoul(){
  var look = card("look", "Наружность", '<div class="lookgrid">'+[["age","Возраст"],["height","Рост"],["weight","Вес"],["eyes","Глаза"],["skin","Кожа"],["hair","Волосы"]].map(function(x){
    return '<label><small>'+x[1]+'</small>'+inp("look."+x[0],{cls:"bare"})+'</label>';
  }).join("")+'</div>');
  function ta(k, t, ph, rows){ return card("ta", t, inp(k,{area:1,rows:rows||3,ph:ph,cls:"paper"})); }
  var appear = card("appear", "Как он выглядит", inp("appearance",{area:1,rows:6,cls:"paper"})+'<label class="sub">Когда никто не смотрит</label>'+inp("mirrorLook",{area:1,rows:4,cls:"paper mirror-ta"})+
    '<button type="button" class="lnk" data-act="mirror">посмотреть портрет →</button>');
  return '<div class="soul-top">'+appear+'</div><div class="grid g-two"><div class="col">'+look+
    ta("traits","Черты характера","Ещё не придумано")+ta("ideals","Идеалы","Ещё не придумано")+ta("bonds","Привязанности","Ещё не придумано")+ta("flaws","Слабости","Ещё не придумано")+
    '</div><div class="col">'+ta("allies","Союзники и организации","",4)+ta("backstory","Предыстория","Детство, как открылся дар, кто знает секрет…",6)+ta("goals","Цели и задачи","",3)+ta("notes","Заметки с сессий","Имена, долги, обиды, кому что обещано…",8)+'</div></div>';
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
      if (R.dc) msg = (tot>=R.dc?"Успех":"Провал")+" против Сл "+R.dc+(msg?" · "+msg:"");
      return '<div class="rrow '+cls+'">'+dice+'<span class="op">'+sg(R.bonus)+'</span><span class="eq">=</span><b class="tot'+(anim?' spin':'')+'" data-v="'+tot+'">'+tot+'</b>'+
        (R.atk ? '<button type="button" class="btn '+(k===20?'gold':'')+'" data-act="rs-dmg" data-row="'+i+'">Урон'+(k===20?' ×2':'')+'</button>' : '')+
        (msg?'<p class="rmsg">'+esc(msg)+'</p>':'')+'</div>';
    }).join("");
    h += '<div class="rs-f"><button type="button" class="btn" data-act="rs-reroll">Перебросить</button></div>';
  }
  if (R.k==="dmg"){
    var o = R.opt;
    h += '<div class="addons">'+
      (R.noCrit ? '' : tg("crit","Крит — кости ×2", o.crit))+
      (R.atk && R.atk.alt ? tg("alt","Цель уже ранена — "+diceRu(R.atk.alt), o.alt) : '')+
      S.res.map(function(r,i){ if(!r.dmg) return ""; var left=resLeft(r); return tg("r"+i, r.name+" +"+(/d/i.test(r.dmg)?diceRu(r.dmg):resVal(r.dmg))+(left?"":" (потрачено)"), o["r"+i], !left && !o["r"+i]); }).join("")+
    '</div>';
    if (R.out){
      h += '<div class="dmgout"><b class="tot big'+(anim?' spin':'')+'" data-v="'+R.out.total+'">'+R.out.total+'</b>'+(R.half?'<span class="half">при успехе спасброска: <b>'+Math.floor(R.out.total/2)+'</b></span>':'')+(R.saveNote?'<span class="half">'+esc(R.saveNote)+'</span>':'')+(R.pool?'<span class="half">засыпают по возрастанию текущих хитов, пока хватает запаса</span>':'')+
        '<ul class="brk">'+R.out.parts.map(function(p){ return '<li><span>'+esc(p.l)+'</span><i>'+esc(p.d)+'</i><b>'+p.v+'</b></li>'; }).join("")+'</ul></div>';
      h += '<div class="rs-f">'+backB()+(R.heal?'<button type="button" class="btn good" data-act="heal-self">Это мне</button>':'')+'<button type="button" class="btn" data-act="rs-dmgroll">Бросить ещё</button></div>';
    } else h += '<div class="rs-f">'+backB()+'<button type="button" class="btn gold big" data-act="rs-dmgroll">'+(R.heal?'Бросить лечение':R.pool?'Бросить запас':'Бросить урон')+'</button></div>';
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
  openRoll({k:"d20", title:a.name, sub:"атака "+sg(atkHit(a)), bonus:atkHit(a), n:1, atk:{name:a.name, dice:a.dice, mod:atkDmgMod(a), type:a.type}});
}
function dmgDialog(atk, crit, half, title, extra){
  var opt = {crit:!!crit};
  S.res.forEach(function(r,i){ if (r.dmg && r.reset==="turn" && resLeft(r) && !half) opt["r"+i]=true; });
  R = {k:"dmg", title:title||("Урон: "+atk.name), sub:diceRu(dmgStr(atk.dice, atk.mod))+" "+(atk.type||""), atk:atk, opt:opt, half:half, out:null};
  if (extra) Object.keys(extra).forEach(function(k){ R[k]=extra[k]; });
  showRS(); renderRS(false);
}
function rollDamage(){
  var a = R.atk, o = R.opt, parts = [], total = 0;
  var p = parseDice(o.alt && a.alt ? a.alt : a.dice), rr = rollTerms(p.terms, o.crit);
  rr.forEach(function(t){ parts.push({l:a.name+(R.heal?"":" ("+(a.type||"урон")+")"), d:t.r.join("+"), v:t.sum}); total+=t.sum; });
  var flat = p.flat + (a.mod||0); if (flat){ parts.push({l:"модификатор", d:"", v:flat}); total+=flat; }
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
  addLog((R.heal?"Лечение: ":R.pool?"Запас хитов: ":"Урон: ")+a.name, total, parts.map(function(x){return x.l+" "+x.v;}).join(", ")+(o.crit?" · крит":""));
  save(); render(); renderRS(true);
}

/* заклинания */
function castSpell(i){
  var s = S.spells[i];
  if (!s.lvl){ doCast(i, 0); return; }
  if (s.scroll){ doCast(i, 0); useScroll(s.name); return; }
  if (s.daily){ if (!miLeft()){ toast("«"+s.name+"» уже было сегодня — до долгого отдыха."); return; } S.miUsed = 1; doCast(i, 0); return; }
  var avail = []; for (var L=s.lvl; L<=slotArr().length; L++) if (slotLeft(L)>0) avail.push(L);
  if (!avail.length){ toast("Бутылок "+s.lvl+"+ круга нет — нужен долгий отдых."); return; }
  if (avail.length===1 || !(s.upcast || s.beamsUp)){ doCast(i, avail[0]); return; }
  openModal('<h2>'+esc(s.name)+'</h2><p>Какой ячейкой наложить?</p><div class="slotpick">'+avail.map(function(L){
    var note = s.dice && s.upcast ? diceRu(s.kind==="heal"?dmgStr(upDice(s,L), s.addMod?M(spAb(s)):0):upDice(s,L)) : s.beamsUp ? beamsOf(s,L)+" луча" : "";
    return '<button type="button" class="btn'+(L===s.lvl?' gold':'')+'" data-act="cast-at" data-i="'+i+'" data-l="'+L+'"><b>'+L+' круг</b><small>осталось '+slotLeft(L)+(note?' · '+note:'')+'</small></button>';
  }).join("")+'</div>', "pick-m");
}
function doCast(i, L){
  var s = S.spells[i], msg = [];
  if (L>0){ S.slotsUsed[L-1] = num(S.slotsUsed[L-1])+1; }
  if (s.conc){
    if (S.conc && S.conc!==s.name) msg.push("Концентрация на «"+S.conc+"» прервана.");
    S.conc = s.name; S.concL = L || 0;
  }
  if (/Бонусное/.test(s.time||"")) S.turn.b = 1; else if (s.time==="Действие") S.turn.a = 1;
  addLog("Наложено: "+s.name, "", L>0?"ячейка "+L+" круга":s.scroll?"свиток":s.daily?"раз в день":"заговор");
  save(); render(); closeModal();
  if (s.kind==="attack"){
    var n = beamsOf(s, L||s.lvl);
    openRoll({k:"d20", title:s.name, sub:"атака заклинанием "+sg(sAtk(s))+(n>1?" · "+n+" луча":""), bonus:sAtk(s), n:n, atk:{name:s.name, dice:upDice(s, L)||"1d6", mod:s.addMod?M(spAb(s)):0, type:s.type}});
  } else if (s.kind==="save" && s.dice){
    dmgDialog({name:s.name, dice:upDice(s, L), alt:s.alt?upDice({dice:s.alt, cantrip:s.cantrip, lvl:s.lvl}, L):"", mod:0, type:s.type}, false, !!s.half, s.name+" · Сл "+sDC(s)+" "+(ABN[s.save]?ABN[s.save][2]:""), {noCrit:true, saveNote: s.half ? "" : "при успехе спасброска — ничего"});
  } else if (s.kind==="auto"){
    dmgDialog({name:s.name, dice:upDice(s, L), mod:0, type:s.type}, false, false, s.name+(L>s.lvl?" · "+L+" круг":""), {noCrit:true, pool:!!s.pool, sub: s.pool ? diceRu(upDice(s, L))+" — запас хитов" : ""});
  } else if (s.kind==="heal"){
    dmgDialog({name:s.name, dice:upDice(s, L), mod:s.addMod?M(spAb(s)):0, type:""}, false, false, s.name+(L>s.lvl?" · "+L+" круг":""), {noCrit:true, heal:true});
  } else if (s.kind==="save"){
    msg.unshift("«"+s.name+"»: спасбросок "+(ABN[s.save]?ABN[s.save][2]:"")+", Сл "+sDC(s)+".");
  } else msg.unshift("«"+s.name+"» наложено"+(L>0?", ячейка "+L+" круга":"")+".");
  if (s.daily && s.kind==="attack") msg.push("При попадании следующая атака по цели — с преимуществом.");
  if (msg.length) toast(msg.join(" "));
}

/* ---------------- log ---------------- */
function addLog(t, v, d){ S.log.unshift({t:Date.now(), n:t, v:v, d:d}); if (S.log.length>40) S.log.length=40; save(); }
function logHtml(){
  return '<h2>Журнал бросков</h2>'+(S.log.length? '<ul class="log">'+S.log.map(function(l){ var dt=new Date(l.t); return '<li><time>'+String(dt.getHours()).padStart(2,"0")+":"+String(dt.getMinutes()).padStart(2,"0")+'</time><span>'+esc(l.n)+'<small>'+esc(l.d||"")+'</small></span><b>'+esc(l.v)+'</b></li>'; }).join("")+'</ul><button type="button" class="btn small" data-act="log-clear">Очистить</button>' : '<p class="empty">Ещё ничего не бросали.</p>');
}

/* ---------------- modal ---------------- */
function openModal(h, cls){ var m=$("#modal"); $("#m-body").innerHTML=h; m.className="modal "+(cls||""); m.hidden=false; requestAnimationFrame(function(){ m.classList.add("open"); }); }
function closeModal(){ var m=$("#modal"); if (m.hidden) return; m.classList.remove("open"); setTimeout(function(){ m.hidden=true; }, 180); }

var HPV = "", HPWHO = "me";
function hpModal(mode, who){
  HPV = ""; HPWHO = "me";
  var now = '<div class="hpnow"><b>'+S.hp+'</b> / '+hpMax()+(S.temp?' <em>+'+S.temp+' врем.</em>':'')+'</div>';
  openModal('<h2>Хиты</h2>'+now+
    '<div class="hpin" id="hpv">0</div><div class="pad">'+[1,2,3,4,5,6,7,8,9,"⌫",0,"C"].map(function(k){ return '<button type="button" data-act="pad" data-k="'+k+'">'+k+'</button>'; }).join("")+'</div>'+
    '<div class="row3"><button type="button" class="btn bad'+(mode==="dmg"?' pre':'')+'" data-act="hp-apply" data-m="dmg">Урон</button><button type="button" class="btn good'+(mode==="heal"?' pre':'')+'" data-act="hp-apply" data-m="heal">Лечение</button>'+'<button type="button" class="btn'+(mode==="temp"?' pre':'')+'" data-act="hp-apply" data-m="temp">Врем. хиты</button>'+'</div>', "hpm");
}
function applyHP(m, v){
  if (!v) { closeModal(); return; }
  if (m==="dmg"){
    var t = Math.min(S.temp, v); S.temp -= t; var rest = v - t;
    var wasDown = S.hp<=0, before = S.hp;
    S.hp = Math.max(0, S.hp - rest);
    if (wasDown && rest>0){ S.death.f = Math.min(3, S.death.f+1); toast("Урон без сознания — провал спасброска от смерти."); }
    else if (before>0 && S.hp===0 && rest - before >= hpMax()) toast("Мгновенная смерть: урон сверх нуля ≥ максимуму хитов.");
    if (S.conc && rest+t>0){ var dc=Math.max(10, Math.floor(v/2)); toastAct("Концентрация на «"+S.conc+"»: спасбросок ТЕЛ Сл "+dc, "Бросить", "conc-save", dc); }
    addLog("Получен урон", -v, t?("врем. хиты поглотили "+t):"");
  } else if (m==="heal"){
    if (S.hp<=0){ S.death={s:0,f:0}; }
    S.hp = Math.min(hpMax(), S.hp + v); addLog("Лечение", "+"+v, "");
  } else { S.temp = Math.max(S.temp, v); addLog("Временные хиты", v, "берётся большее"); }
  save(); closeModal(); render();
}
/* ---------------- toast ---------------- */
function toast(t){ var el=$("#toast"); el.innerHTML=esc(t); el.hidden=false; el.classList.add("on"); clearTimeout(toast.t); toast.t=setTimeout(function(){ el.classList.remove("on"); setTimeout(function(){ el.hidden=true; },200); }, 3600); }
function toastAct(t, l, act, v){ var el=$("#toast"); el.innerHTML=esc(t)+' <button type="button" class="btn small gold" data-act="'+act+'" data-v="'+v+'">'+esc(l)+'</button>'; el.hidden=false; el.classList.add("on"); clearTimeout(toast.t); toast.t=setTimeout(function(){ el.classList.remove("on"); setTimeout(function(){ el.hidden=true; },200); }, 9000); }

/* ---------------- rests ---------------- */
function restModal(k){
  if (k==="short"){
    var back = [];
    if (biShort()) back.push("Вдохновение барда");
    S.res.forEach(function(r){ if (resOn(r) && r.reset!=="long" && r.reset!=="none") back.push("«"+r.name+"»"); });
    openModal('<h2>Короткий отдых</h2><p>Бутылки-ячейки на коротком отдыхе <b>не</b> возвращаются.'+(back.length?' Вернётся: '+esc(back.join(", "))+'.':'')+'</p>'+
      '<p>Кости хитов: <b>'+C("hd")+'</b> — к'+S.hdDie+' '+sg(M("con"))+' за каждую.</p>'+
      '<p class="hint">Песнь отдыха: каждый, кто слышит Эннио и тратит кости хитов, получает ещё +к'+songDie()+'.</p>'+
      '<div class="row3"><button type="button" class="btn" data-act="hd-roll">Потратить кость хитов</button><button type="button" class="btn" data-act="song">Песнь отдыха · к'+songDie()+'</button><button type="button" class="btn gold" data-act="rest-do" data-k="short">Отдохнуть</button></div>');
  } else {
    openModal('<h2>Долгий отдых</h2><p>Хиты до максимума, все бутылки-ячейки, всё вдохновение, заклинание «раз в день», половина костей хитов. Концентрация прерывается.</p><button type="button" class="btn gold wide" data-act="rest-do" data-k="long">Спать до рассвета</button>');
  }
}
function doRest(k){
  S.res.forEach(function(r){ if (r.reset==="none") return; if (r.reset!=="long" || k==="long") r.used = 0; });
  if (k==="long" || biShort()) S.biUsed = 0;
  if (k==="long"){ S.fac.sendUsed = 0; S.miUsed = 0; }
  if (k==="long"){
    S.slotsUsed = [0,0,0,0,0,0,0,0,0];
    S.hp = hpMax(); S.temp = 0; S.death = {s:0,f:0};
    S.hdUsed = Math.max(0, num(S.hdUsed) - Math.max(1, Math.floor(hdTotal()/2)));
    S.conc = ""; S.concL = 0;
  }
  S.turn = {a:0,b:0,r:0,m:0};
  addLog(k==="long"?"Долгий отдых":"Короткий отдых","","");
  save(); closeModal(); render(); toast(k==="long"?"Утро. Свежая рубашка, очки протёрты, дела ждут.":"Передышка. Бокал вина и пара тихих слов.");
}
function spendHD(){
  if (num(S.hdUsed) >= hdTotal()){ toast("Костей хитов не осталось."); return; }
  S.hdUsed = num(S.hdUsed)+1;
  var r = rnd(num(S.hdDie)||8), v = Math.max(0, r + M("con"));
  S.hp = Math.min(hpMax(), S.hp + v); if (S.hp>0) S.death={s:0,f:0};
  addLog("Кость хитов", "+"+v, "к"+S.hdDie+" "+r+" "+sg(M("con")));
  save(); render(); if (!$("#modal").hidden) restModal("short");
  toast("Кость хитов: "+r+" "+sg(M("con"))+" = +"+v+" хитов.");
}

/* ---------------- death ---------------- */
function rollDeath(){
  var r = rnd(20), msg;
  if (r===20){ S.hp=1; S.death={s:0,f:0}; msg="НАТ 20! Эннио поднимается с 1 хитом и поправляет очки: «Продолжим разговор»."; }
  else if (r===1){ S.death.f=Math.min(3,S.death.f+2); msg="Единица — два провала."; }
  else if (r>=10){ S.death.s=Math.min(3,S.death.s+1); msg="Успех."; }
  else { S.death.f=Math.min(3,S.death.f+1); msg="Провал."; }
  if (S.death.s>=3 && S.hp<=0){ msg+=" Три успеха — стабилизирован."; }
  if (S.death.f>=3){ msg+=" Три провала. Семья закажет хорошую мессу…"; }
  addLog("Спасбросок от смерти", r, msg);
  save(); render();
  R = {k:"note", title:"Спасбросок от смерти", html:'<div class="dmgout">'+hexD(r, r===20?"crit":r===1?"fumble":"")+'<p class="rmsg">'+esc(msg)+'</p></div>'}; showRS(); renderRS(false);
}

/* ---------------- menu ---------------- */
function menuHtml(){
  return '<h2>Меню Эннио</h2><div class="menu">'+
    '<button type="button" class="btn" data-act="rest" data-k="short">Короткий отдых</button><button type="button" class="btn" data-act="rest" data-k="long">Долгий отдых</button>'+
    '<button type="button" class="btn" data-act="log">Журнал бросков</button><button type="button" class="btn" data-act="mirror">Портрет</button>'+
    '<button type="button" class="btn" data-act="export">Экспорт героя</button><button type="button" class="btn" data-act="import">Импорт героя</button>'+
    '<button type="button" class="btn" data-act="install" '+(deferred?'':'hidden')+'>Установить на планшет</button>'+
    '<button type="button" class="btn'+(wakeOn?' on':'')+'" data-act="wake">'+(wakeOn?'✓ ':'')+'Не гасить экран</button>'+
    '</div><h3>Тема</h3><div class="pals">'+PALS.map(function(p){ return '<button type="button" class="pal'+(p.k===pal?' on':'')+'" data-act="pal" data-k="'+p.k+'" style="background:'+p.c[1]+';color:'+(p.k==="vellum"?"#2a2116":"#efe6d2")+';border-color:'+p.c[2]+'"><span class="sw">'+p.c.map(function(c){return '<i style="background:'+c+'"></i>';}).join("")+'</span><b>'+p.n+'</b><small>'+p.d+'</small></button>'; }).join("")+'</div>'+
    '<label class="calm-l"><input type="checkbox" class="chk" data-act="calm"'+(document.documentElement.classList.contains("calm")?' checked':'')+'> Без анимаций</label>'+
    '<details class="danger"><summary>Сброс</summary><p>Вернуть лист к исходному Эннио. Сначала сделай экспорт, если жалко.</p><button type="button" class="btn bad" data-act="reset">Сбросить лист</button></details>';
}

/* ---------------- портрет ---------------- */
function showMirror(){
  var m=$("#mirror");
  m.innerHTML = '<div class="mir-in"><div class="frame"><img src="img/portrait.webp" alt="Эннио Джентиле на фоне закатного неба"></div><p class="mir-q">«'+esc(S.quote)+'»</p><small>тап — закрыть</small></div>';
  m.hidden=false; requestAnimationFrame(function(){ m.classList.add("open"); });
}

/* ---------------- export / import ---------------- */
function doExport(){
  var name = (S.name||"герой").replace(/[^\wа-яё\- ]/gi,"").trim() || "герой";
  var blob = new Blob([JSON.stringify(S,null,1)], {type:"application/json"});
  var file = null; try { file = new File([blob], name+".ennio.json", {type:"application/json"}); } catch(e){}
  if (file && navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file], title:name}).catch(function(){});
  } else {
    var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name+".ennio.json"; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  toast("Копия героя сохранена.");
}
$("#imp").addEventListener("change", function(e){
  var f = e.target.files[0]; if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){ try { var o=JSON.parse(rd.result); if (!o || !o.abil || !o.spells || o.sling || o.pact) throw 0; S = normalize(o); save(); closeModal(); render(); toast("Герой загружен: "+S.name); } catch(err){ toast("Это не файл этого листа."); } };
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
  if (!EDIT) return;
  var p = el.getAttribute("data-p"), v;
  if (el.type==="checkbox") v = el.checked;
  else if (el.getAttribute("data-t")==="num") v = el.value.trim()==="" ? "" : num(el.value);
  else v = el.value;
  if (/^spells\.\d+\.lvl$/.test(p)) v = Math.max(0, Math.min(9, num(v)));
  setPath(S, p, v);
  if (S.hp > hpMax()) S.hp = hpMax();
  if (el.tagName==="TEXTAREA") fit(el);
  if (/^coins\./.test(p)){ var g=document.querySelector("[data-c-gold]"); if (g) g.textContent=goldTotal(); }
  refreshCalc(); renderTop(); save();
}
document.addEventListener("input", onField);
document.addEventListener("pointerdown", function(e){ var f=e.target.closest && e.target.closest(".locked"); if (f && !EDIT){ clearTimeout(toast.lk); toast.lk=setTimeout(function(){ toast("Включи «✎ Правка», чтобы менять."); }, 60); } });
document.addEventListener("change", function(e){
  if (e.target.matches && e.target.matches("[data-act=calm]")){ document.documentElement.classList.toggle("calm", e.target.checked); try{ localStorage.setItem(CKEY, e.target.checked?"1":""); }catch(x){} return; }
  if (e.target.matches && e.target.matches("select[data-p], input[type=checkbox][data-p]")) onField(e);
});

document.addEventListener("click", function(e){
  var tab = e.target.closest("[data-tab]");
  if (tab){ view = tab.getAttribute("data-tab"); try{ localStorage.setItem(VKEY,view); }catch(x){} hideCast(); render(); window.scrollTo({top:0}); return; }
  var b = e.target.closest("[data-act]"); if (!b || b.disabled) return;
  var act = b.getAttribute("data-act"), i = +b.getAttribute("data-i"), k = b.getAttribute("data-k"), src = b.getAttribute("data-src");
  if (!EDIT && EDIT_ONLY.indexOf(act)>=0){ toast("Включи «✎ Правка», чтобы менять."); return; }
  switch (act){
    case "edit": EDIT=!EDIT; render(); toast(EDIT?"Режим правки: меняй цифры, списки и владения.":"Лист закрыт от случайных правок."); break;
    case "menu": openModal(menuHtml(), "menu-m"); break;
    case "m-close": closeModal(); break;
    case "rs-close": closeRS(); break;
    case "hp": hpModal(b.getAttribute("data-mode")||"dmg"); break;
    case "pad": var kk=b.getAttribute("data-k"); if (kk==="⌫") HPV=HPV.slice(0,-1); else if (kk==="C") HPV=""; else if (HPV.length<4) HPV+=kk; $("#hpv").textContent = HPV||"0"; break;
    case "hp-apply": applyHP(b.getAttribute("data-m"), num(HPV)); break;
    case "roll-init": openRoll({k:"d20", title:"Инициатива", sub:"Ловкость "+sg(M("dex"))+(jat()?" · мастер на все руки "+sg(jat()):"")+(num(S.initBonus)?" · прочее "+sg(num(S.initBonus)):""), bonus:initB()}); break;
    case "check": openRoll({k:"d20", title:"Проверка: "+ABN[k][2], sub:jat()?"мастер на все руки "+sg(jat()):"", bonus:checkB(k)}); break;
    case "save": openRoll({k:"d20", title:"Спасбросок: "+ABN[k][2], sub:S.saveProf[k]?"с владением":"", bonus:saveB(k)}); break;
    case "skill": openRoll({k:"d20", title:SKN[k][1], sub:ABN[SKN[k][2]][2]+(skP(k)?(skP(k)>1?" · экспертиза":" · владение"):(jat()?" · мастер на все руки":"")), bonus:skillB(k)}); break;
    case "atk": rollAttack(S.attacks[i]); break;
    case "dmg": var at=S.attacks[i]; dmgDialog({name:at.name, dice:at.dice, mod:atkDmgMod(at), type:at.type}, false, false); break;
    case "bi": var bn=+b.getAttribute("data-n"), bmx=biMax(); S.biUsed = bn < bmx-num(S.biUsed) ? bmx-bn : bmx-bn-1; S.biUsed=Math.max(0,Math.min(bmx,S.biUsed)); save(); render(); break;
    case "bi-give":
      if (!biLeft()){ toast("Вдохновение кончилось — "+(biShort()?"короткий":"долгий")+" отдых."); break; }
      S.biUsed=num(S.biUsed)+1; S.turn.b=1; addLog("Вдохновение барда", "к"+biDie(), "осталось "+biLeft()+"/"+biMax());
      save(); render(); toast("Союзник получил к"+biDie()+". Десять минут, один раз — после броска, до объявления результата."); break;
    case "bi-roll": R={k:"free", d:biDie(), n:1}; showRS(); freeRoll(); break;
    case "mantle":
      if (!glamour()) break;
      if (!biLeft()){ toast("Для Мантии нужно Вдохновение барда — а оно кончилось."); break; }
      S.biUsed=num(S.biUsed)+1; S.turn.b=1; addLog("Мантия вдохновения", "+"+mantleHP(), "до "+biMax()+" существ, врем. хиты");
      save(); render(); toastAct("Мантия: до "+biMax()+" существ получают "+mantleHP()+" врем. хитов и реакцией отходят без атак по ним.", "Себе тоже", "mantle-self", mantleHP()); break;
    case "mantle-self": var mv=+b.getAttribute("data-v"); S.temp=Math.max(S.temp, mv); $("#toast").hidden=true; addLog("Временные хиты", mv, "Мантия вдохновения"); save(); render(); break;
    case "song": var sd=rnd(songDie()); addLog("Песнь отдыха", "+"+sd, "к"+songDie()+" каждому, кто тратит кости хитов"); toast("Песнь отдыха: +"+sd+" хитов каждому, кто тратит кости хитов."); break;
    case "mi-tog": S.miUsed = num(S.miUsed) ? 0 : 1; save(); render(); break;
    case "res-heal": var rh=S.res[i]; if (!resLeft(rh)) break; rh.used=num(rh.used)+1; save(); render(); dmgDialog({name:rh.name, dice:rh.heal, mod:0, type:""}, false, false, rh.name, {noCrit:true, heal:true, sub:diceRu(rh.heal)+" хитов · осталось "+resLeft(rh)+"/"+resMax(rh)}); break;
    case "fame": S.fac.fame=Math.max(0,num(S.fac.fame)+(+b.getAttribute("data-d"))); save(); render(); break;
    case "pf": S.fac.pf=Math.max(0,num(S.fac.pf)+(+b.getAttribute("data-d"))); save(); render(); break;
    case "dt": S.downtime=Math.max(0,num(S.downtime)+(+b.getAttribute("data-d"))); save(); render(); break;
    case "fac-work": var wd=G.ZH.work[fRank()]||30; if (num(S.downtime)<wd){ toast("Нужно "+wd+" дней простоя."); break; } S.downtime=num(S.downtime)-wd; S.fac.fame=num(S.fac.fame)+1; S.fac.pf=num(S.fac.pf)+1; addLog("Фракционная работа", "+1 слава", wd+" дней простоя"); save(); render(); toast("Сеть довольна: +1 очко славы."); break;
    case "rank-up": var nx=G.ZH.ranks[fRank()]; if (!nx || !rankReady(nx)) break; S.fac.rank=nx.n; addLog("Новый ранг в Сети", nx.name, "ранг "+nx.n); save(); render(); toast("Ранг «"+nx.name+"». "+nx.quote); break;
    case "rank-down": S.fac.rank=Math.max(0,fRank()-1); while (S.fac.items.length>itemPicks()) S.fac.items.pop(); save(); render(); break;
    case "fac-sub": S.fac.sub = fDoom() ? "" : "doom"; save(); render(); toast(fDoom()?"Рейдеры Рока: новый Жентарим, власть через торговлю.":"Основная Сеть."); break;
    case "fitem": var nmI=k, ix=S.fac.items.indexOf(nmI); if (ix>=0) S.fac.items.splice(ix,1); else if (S.fac.items.length<itemPicks()) S.fac.items.push(nmI); save(); render(); break;
    case "cons-pick": S.fac.cons=k; S.fac.consUsed=false; save(); render(); break;
    case "cons-new": S.fac.consUsed=false; save(); render(); toast("Новое приключение — можно выбрать расходник заново."); break;
    case "cons-use":
      var cz=G.ZH.cons[S.fac.cons]; if (!cz || S.fac.consUsed) break; S.fac.consUsed=true; addLog("Расходник Сети: "+cz.name, "", cz.eff); save(); render();
      if (cz.dice) dmgDialog({name:cz.name, dice:cz.dice, mod:0, type:cz.type}, false, !!cz.half, cz.name, {noCrit:true, sub:cz.eff}); else toast(cz.name+": "+cz.eff); break;
    case "send": var sn=+b.getAttribute("data-n"), smx2=sendMax(); S.fac.sendUsed = sn < smx2-num(S.fac.sendUsed) ? smx2-sn : smx2-sn-1; S.fac.sendUsed=Math.max(0,Math.min(smx2,S.fac.sendUsed)); save(); render(); break;
    case "snake": var d4=rnd(4); openRoll({k:"d20", title:"Запугивание · змея", sub:"навык "+sg(skillB("itm"))+" + татуировка 1к4 ("+d4+")", bonus:skillB("itm")+d4}); break;
    case "cast-show": showCast(i, src); break;
    case "cast-close": hideCast(); break;
    case "cast-var": var cs=srcList(src)[i]; cs.vsel=+k; save(); var fl=$("#cast-fl"); if (fl){ fl.innerHTML=nl(cs.variants[+k].t); fl.classList.remove("swap"); void fl.offsetWidth; fl.classList.add("swap"); } document.querySelectorAll(".cast-vars button").forEach(function(y){ y.classList.toggle("on", y.getAttribute("data-k")===k); }); break;
    case "var-add": var vs=S.spells[i]; if (!vs.variants||!vs.variants.length) vs.variants=[{n:"Вариант 1", t:vs.flavor||""}]; vs.variants.push({n:"Вариант "+(vs.variants.length+1), t:""}); save(); render(); break;
    case "var-del": var vd=S.spells[i]; vd.variants.splice(+k,1); if (vd.variants.length===1){ vd.flavor=vd.variants[0].t; vd.variants=[]; } vd.vsel=0; save(); render(); break;
    case "sp-atk": hideCast(); var s=S.spells[i]; openRoll({k:"d20", title:s.name, sub:"атака заклинанием "+sg(sAtk(s)), bonus:sAtk(s), n:beamsOf(s), atk:{name:s.name, dice:s.dice||"1d10", mod:s.addMod?M(spAb(s)):0, type:s.type}}); break;
    case "sp-cast": hideCast(); castSpell(i); break;
    case "cast-at": doCast(i, +b.getAttribute("data-l")); break;
    case "sp-repeat": var rs=S.spells[i]; S.turn.b=1; save(); render(); dmgDialog({name:rs.name, dice:upDice(rs, num(S.concL)||rs.lvl), mod:0, type:rs.type}, false, false, rs.name+" · бонусным действием", {noCrit:true, saveNote: rs.save ? "держит или носит — спасбросок "+ABN[rs.save][2]+" Сл "+sDC()+", иначе роняет" : ""}); break;
    case "heal-self": if (R && R.out){ var hv=R.out.total; if (S.hp<=0) S.death={s:0,f:0}; S.hp=Math.min(hpMax(), S.hp+hv); addLog("Лечение себя", "+"+hv, ""); save(); render(); closeRS(); toast("+"+hv+" хитов."); } break;
    case "rs-mode": R.mode=+b.getAttribute("data-m"); R.rows=R.rows.map(function(){return d20();}); logD20(); renderRS(true); break;
    case "rs-reroll": R.rows=R.rows.map(function(){return d20();}); logD20(); renderRS(true); break;
    case "rs-dmg": var prev=R, row=R.rows[+b.getAttribute("data-row")], crit=kept(row)===20; dmgDialog(R.atk, crit, false); R.back=prev; R.title="Урон: "+prev.atk.name+(prev.rows.length>1?" · #"+(+b.getAttribute("data-row")+1):""); renderRS(false); break;
    case "rs-back": R=R.back; renderRS(false); break;
    case "rs-opt": R.opt[k]=!R.opt[k]; renderRS(false); break;
    case "rs-dmgroll": rollDamage(); break;
    case "free": R={k:"free", d:+b.getAttribute("data-d"), n:1}; showRS(); freeRoll(); break;
    case "free-n": R.n=Math.max(1,Math.min(20,R.n+(+b.getAttribute("data-d")))); freeRoll(); break;
    case "free-again": freeRoll(); break;
    case "res": var r=S.res[i], n=+b.getAttribute("data-n"), mx=resMax(r); var avail = n < mx-num(r.used); r.used = avail ? mx-n : mx-n-1; r.used=Math.max(0,Math.min(mx,r.used)); save(); render(); break;
    case "insp": S.insp=!S.insp; save(); render(); break;
    case "eco": S.turn[k]=S.turn[k]?0:1; save(); render(); break;
    case "new-turn": S.turn={a:0,b:0,r:0,m:0}; S.res.forEach(function(r){ if (r.reset==="turn") r.used=0; }); save(); render(); toast("Новый ход."); break;
    case "slot-toggle": var L=+b.getAttribute("data-l"), left=slotLeft(L), nn=+b.getAttribute("data-n"), smx=slotMax(L); S.slotsUsed[L-1] = nn<left ? smx-nn : smx-nn-1; S.slotsUsed[L-1]=Math.max(0,Math.min(smx,S.slotsUsed[L-1])); save(); render(); break;
    case "slot-spend": view="magic"; try{ localStorage.setItem(VKEY,view); }catch(x){} render(); window.scrollTo({top:0}); break;
    case "conc-drop": if (S.conc) toast("Концентрация на «"+S.conc+"» прервана."); S.conc=""; S.concL=0; save(); render(); break;
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
    case "reset": S = clone(G.SEED); save(); closeModal(); render(); toast("Лист вернулся к исходному Эннио."); break;
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
    res:{name:"Новый ресурс", max:"1", reset:"long", used:0, note:"", minLvl:""},
    attacks:{name:"Новое оружие", abil:"dex", prof:true, bonus:0, dice:"1d6", addMod:true, type:"", range:"5 фт"},
    spells:{lvl:1, name:"Новое заклинание", en:"", school:"", time:"Действие", range:"", dur:"Мгновенная", comp:"В, С", conc:false, kind:"util", dice:"", type:"", desc:"", fx:"sparks"},
    items:{name:"", qty:1, note:""},
    favors:{name:"", note:""}
  }[l];
  S[l].push(blank); save(); render();
  var els = document.querySelectorAll('[data-p^="'+l+'.'+(S[l].length-1)+'."]'); if (els[0]) { els[0].focus(); if (els[0].select) els[0].select(); els[0].scrollIntoView({block:"center", behavior:"smooth"}); }
}
document.addEventListener("keydown", function(e){
  if (e.key==="Escape"){ if (!$("#cast").hidden) hideCast(); else if (!$("#rs").hidden) closeRS(); else if (!$("#modal").hidden) closeModal(); else if (!$("#mirror").hidden) $("#mirror").click(); }
});

/* ---------------- boot ---------------- */
try { if (localStorage.getItem(CKEY)) document.documentElement.classList.add("calm"); } catch(e){}
load(); save(); applyPal(pal); render();
if ("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("sw.js").catch(function(){});
})();
