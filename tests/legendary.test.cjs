/* Dependency-free regression checks. These simulate state and event lifecycles;
   they do not claim to verify rendering or frame rate in a browser. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'legendary-motion.js'), 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean).join('\n');
function slice(start, end) {
  const a = inline.indexOf(start), b = inline.indexOf(end, a);
  assert(a >= 0 && b > a, `Source anchors: ${start}`);
  return inline.slice(a, b);
}
function clock() {
  let now = 0, id = 0;
  const jobs = new Map();
  return {
    setTimeout(fn, delay = 0) { const key = ++id; jobs.set(key, { time:now + delay, fn }); return key; },
    clearTimeout(key) { jobs.delete(key); },
    run(ms) {
      const end = now + ms;
      for (let count = 0; count < 1000; count++) {
        const next = [...jobs].filter(([, j]) => j.time <= end).sort((a, b) => a[1].time - b[1].time)[0];
        if (!next) { now = end; return; }
        jobs.delete(next[0]); now = next[1].time; next[1].fn(now);
      }
      throw Error('Unbounded scheduled work');
    }
  };
}
function element() {
  const classes = new Set(), attributes = {}, listeners = {};
  return {
    style:{}, dataset:{}, disabled:false, hidden:false, tabIndex:0, inert:false,
    classList:{ add:(...a) => a.forEach(x => classes.add(x)), remove:(...a) => a.forEach(x => classes.delete(x)), contains:x => classes.has(x), toggle:(x, on) => on ? classes.add(x) : classes.delete(x) },
    setAttribute:(key, value) => attributes[key] = String(value),
    getAttribute:key => attributes[key], removeAttribute:key => delete attributes[key],
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    emit(type, event = {}) { if (this.disabled && type === 'click') return; for (const fn of listeners[type] || []) fn(event); },
    querySelector:() => null, closest:() => null, focus() {}, scrollTo() {},
    listenerCount:type => (listeners[type] || []).length
  };
}
function storage(values = {}) {
  const map = new Map(Object.entries(values));
  return { getItem:key => map.get(key) ?? null, setItem:(key, value) => map.set(key, String(value)), removeItem:key => map.delete(key) };
}
function introFixture({ first = false, seen = false, reduced = false } = {}) {
  const time = clock();
  const nodes = Object.fromEntries(['intro', 'app', 'intro-enter', 'intro-skip', 'intro-world-status'].map(id => [id, element()]));
  const sl = element(), sao = element(), label = element(), nav = element(), page = element();
  sl.dataset.world = 'sl'; sao.dataset.world = 'sao';
  const radios = [sl, sao];
  const document = { getElementById:id => nodes[id], querySelector:selector => selector === '.tab-btn.active' ? nav : page, activeElement:null };
  for (const node of [...Object.values(nodes), ...radios, nav]) node.focus = () => document.activeElement = node;
  for (const radio of radios) radio.closest = selector => selector === '[role="radiogroup"]' ? {} : null;
  nodes['intro-enter'].querySelector = () => label;
  nodes.intro.querySelectorAll = selector => selector === '.intro-world-option' ? radios : [...radios, nodes['intro-enter'], nodes['intro-skip']].filter(n => !n.disabled && !n.hidden);
  const calls = { apply:0, tutorial:0, impact:0, reveals:0, toast:0 };
  const localStorage = storage(first ? {} : { lk_u:'sl' });
  const sessionStorage = storage(seen ? { hr_intro_v17:'1' } : { hr_intro_v16:'1' });
  const context = vm.createContext({
    document, localStorage, sessionStorage, UK:'lk_u', activeTimers:new Map(),
    getU:() => localStorage.getItem('lk_u') || 'sl', setU:u => localStorage.setItem('lk_u', u),
    applyUniverse:() => calls.apply++, openTutorial:() => calls.tutorial++, closeTutorial() {}, closeSettings() {}, toast:() => calls.toast++,
    matchMedia:() => ({ matches:reduced }), setTimeout:time.setTimeout, clearTimeout:time.clearTimeout,
    requestAnimationFrame:fn => time.setTimeout(fn, 16),
    LKMotion:{ quality:() => reduced ? 'off' : 'full', selectWorld() {}, introImpact:() => calls.impact++, reveal:() => calls.reveals++ }
  });
  context.window = context;
  const mark = inline.indexOf('// INTRO v17');
  const start = inline.indexOf('(function(){', mark);
  const end = inline.indexOf('// INIT', start);
  vm.runInContext(inline.slice(start, end), context);
  const key = (value, target = document.activeElement, shiftKey = false) => {
    const event = { key:value, target, shiftKey, prevented:false, preventDefault() { this.prevented = true; } };
    nodes.intro.emit('keydown', event); return event;
  };
  return { nodes, radios, document, calls, context, time, key, localStorage, sessionStorage };
}

test('both shipped JavaScript sources parse without dependencies', () => {
  new vm.Script(inline); new vm.Script(engine);
  for (const name of ['legendary.css', 'legendary-motion.js']) assert(html.includes(`${name}?v=17.0`));
});
test('the update shows the new intro even when v16 was already seen', () => {
  const f = introFixture(); f.time.run(20);
  assert.equal(f.nodes.intro.style.display, 'grid');
  assert.equal(f.nodes.app.inert, true);
  assert.equal(f.document.activeElement, f.radios[0]);
});
test('a completed v17 intro is skipped on the next visit in this session', () => {
  const f = introFixture({ seen:true });
  assert.equal(f.nodes.intro.style.display, 'none');
  assert.equal(f.nodes.app.inert, false);
  assert.equal(f.calls.apply, 0);
});
test('immediate repeated entry commits a selected universe only once', () => {
  const f = introFixture({ first:true });
  f.radios[1].emit('click');
  f.nodes['intro-enter'].emit('click'); f.nodes['intro-enter'].emit('click');
  f.time.run(1200);
  assert.equal(f.calls.apply, 1);
  assert.equal(f.localStorage.getItem('lk_u'), 'sao');
  assert.equal(f.nodes.intro.style.display, 'none');
  assert.equal(f.nodes.app.inert, false);
  assert.equal(f.calls.tutorial, 1);
});
test('replay is reusable without stacking handlers or changing saved progression', () => {
  const f = introFixture({ seen:true });
  for (let i = 0; i < 3; i++) {
    f.context.replayLevelinkIntro(); f.time.run(20);
    f.nodes['intro-skip'].emit('click'); f.time.run(600);
    assert.equal(f.nodes.app.inert, false);
  }
  assert.equal(f.nodes['intro-enter'].listenerCount('click'), 1);
  assert.equal(f.calls.apply, 0);
});
test('replay is blocked while a quest timer is running', () => {
  const f = introFixture({ seen:true });
  f.context.activeTimers.set('quest', {}); f.context.replayLevelinkIntro();
  assert.equal(f.calls.toast, 1); assert.equal(f.nodes.intro.style.display, 'none');
  assert.equal(f.context.activeTimers.size, 1);
});
test('radio arrows stay scoped, tab wraps, and Escape resumes the current universe', () => {
  const f = introFixture(); f.time.run(20);
  f.key('ArrowRight');
  assert.equal(f.radios[1].getAttribute('aria-checked'), 'true');
  assert.equal(f.radios[0].tabIndex, -1);
  assert.equal(f.key('ArrowLeft', f.nodes['intro-enter']).prevented, false);
  f.nodes['intro-skip'].focus(); assert(f.key('Tab').prevented);
  assert.equal(f.document.activeElement, f.radios[1]);
  f.key('Escape'); f.time.run(600);
  assert.equal(f.localStorage.getItem('lk_u'), 'sl');
  assert.equal(f.nodes.app.inert, false);
});
test('reduced motion entry has no cinematic delay', () => {
  const f = introFixture({ reduced:true }); f.nodes['intro-enter'].emit('click'); f.time.run(0);
  assert.equal(f.nodes.intro.style.display, 'none'); assert.equal(f.nodes.app.inert, false);
});
function progressFixture(animated = true) {
  const time = clock(), fill = element();
  const calls = { levels:[], thresholds:[] };
  const context = vm.createContext({
    pdata:{ total_xp:90 }, xpBarLevelUpAnimating:false, xpBarAnimationVersion:0,
    document:{ hidden:false, getElementById:() => fill }, ensurePData() {},
    // A deterministic level curve isolates reward/animation lifecycle invariants.
    lvlInfo:xp => ({ idx:Math.floor(xp / 100), pct:xp % 100, rank:String(Math.floor(xp / 100)), color:'#abc' }),
    showLevelUp:rank => calls.levels.push(rank), handleUrgentThresholds:(a, b) => calls.thresholds.push([a, b]),
    setTimeout:time.setTimeout, requestAnimationFrame:fn => time.setTimeout(fn, 16),
    LKMotion:{ canAnimate:() => animated }
  }); context.window = context;
  vm.runInContext(slice('function applyXpGain(', 'function advanceFloorTitle('), context);
  return { context, time, fill, calls };
}
test('rapid XP gains finish at the latest total, including several rank crossings', () => {
  const f = progressFixture();
  f.context.applyXpGain(20); f.context.applyXpGain(130); f.context.applyXpGain(10); f.time.run(400);
  assert.equal(f.context.pdata.total_xp, 250); assert.equal(f.fill.style.width, '50.00%');
  assert.equal(f.context.xpBarLevelUpAnimating, false); assert.equal(f.calls.levels.length, 2);
});
test('undoing a reward cancels an obsolete rank animation without losing XP', () => {
  const f = progressFixture(); f.context.applyXpGain(20);
  assert.equal(f.context.revokeXp(20), 20); f.fill.style.width = '90.00%'; f.time.run(500);
  assert.equal(f.context.pdata.total_xp, 90); assert.equal(f.fill.style.width, '90.00%');
  assert.equal(f.context.xpBarLevelUpAnimating, false);
});
test('disabled animations still award XP and trigger the same rank and boss logic', () => {
  const f = progressFixture(false); f.context.applyXpGain(435);
  assert.equal(f.context.pdata.total_xp, 525); assert.equal(f.fill.style.width, '25.00%');
  assert.equal(f.calls.levels.length, 1); assert.deepEqual(f.calls.thresholds, [[90, 525]]);
});
test('sheet closing has a fallback and cannot erase a freshly reopened form', () => {
  for (const reopen of [false, true]) {
    const time = clock(), old = element(), replacement = element(), overlay = element(), bg = element();
    const wrap = { firstElementChild:old, innerHTML:'form' };
    const nodes = { overlay, 'ov-bg':bg, 'sheet-wrap':wrap };
    const context = vm.createContext({ document:{ getElementById:id => nodes[id], body:{ style:{} } }, setTimeout:time.setTimeout, LKMotion:{ quality:() => 'off' } });
    context.window = context;
    vm.runInContext(slice('window.closeSheet=function(){', 'function habitSheet('), context);
    context.closeSheet();
    if (reopen) wrap.firstElementChild = replacement;
    time.run(500);
    assert.equal(wrap.innerHTML, reopen ? 'form' : '');
    assert.equal(overlay.style.display, reopen ? undefined : 'none');
  }
});

function engineFixture() {
  const time = clock(), all = [];
  let animationCalls = 0;
  function node() {
    const n = element(); n.children = []; n.isConnected = true;
    n.style.setProperty = (key, value) => n.style[key] = value;
    n.appendChild = child => { child.parent = n; n.children.push(child); return child; };
    n.append = (...children) => children.forEach(n.appendChild);
    n.replaceChildren = () => { n.children.forEach(child => child.isConnected = false); n.children = []; };
    n.remove = () => { if (n.parent) n.parent.children = n.parent.children.filter(child => child !== n); n.isConnected = false; };
    Object.defineProperty(n, 'childElementCount', { get:() => n.children.length });
    n.getBoundingClientRect = () => ({ left:40, top:80, width:100, height:50, bottom:130 });
    n.animate = (_frames, options) => {
      animationCalls++;
      const animation = element();
      const job = time.setTimeout(() => animation.emit('finish'), options.duration);
      animation.cancel = () => { time.clearTimeout(job); animation.emit('cancel'); };
      return animation;
    };
    all.push(n); return n;
  }
  const body = node(), document = element(), media = element();
  media.matches = false; document.body = body; document.hidden = false;
  document.getElementById = id => all.find(n => n.id === id && n.isConnected);
  document.createElement = node; document.querySelector = () => null; document.querySelectorAll = () => [];
  const live = node(); live.id = 'lk-motion-announcer'; body.appendChild(live);
  const context = vm.createContext({
    document, innerWidth:1200, innerHeight:800, navigator:{}, performance:{ now:() => 100 },
    localStorage:storage(), matchMedia:() => media,
    setTimeout:time.setTimeout, clearTimeout:time.clearTimeout, requestAnimationFrame:fn => time.setTimeout(fn, 16),
    MutationObserver:class { observe() {} disconnect() {} }
  }); context.window = context;
  vm.runInContext(engine, context); context.LKMotion.boot();
  return { context, document, body, media, time, animationCalls:() => animationCalls };
}
test('motion preferences respect system reduction and device capability', () => {
  const f = engineFixture(), motion = f.context.LKMotion;
  assert.equal(motion.quality(), 'full');
  motion.setMode('lite'); assert.equal(motion.quality(), 'lite');
  motion.setMode('auto'); f.body.classList.add('low-perf'); assert.equal(motion.quality(), 'lite');
  f.media.matches = true; f.media.emit('change'); assert.equal(motion.quality(), 'off');
  assert(f.body.classList.contains('lk-motion-off'));
  const calls = f.animationCalls(); motion.reward(12, 'Résistance');
  assert.equal(f.animationCalls(), calls);
  assert(f.document.getElementById('lk-motion-announcer').textContent.includes('12 XP'));
});
test('rank, boss and perfect-day celebrations are presented sequentially', () => {
  const f = engineFixture(), motion = f.context.LKMotion;
  motion.setMode('off');
  motion.celebrate('ASCENSION', 'A', 'Rang atteint');
  motion.celebrate('QUÊTE URGENTE', 'BOSS', 'Un défi');
  motion.celebrate('JOURNÉE PARFAITE', 'VICTOIRE', 'Toutes les quêtes');
  const layer = f.document.getElementById('lk-celebrations');
  const title = () => layer.children[0]?.children[1]?.textContent;
  assert.equal(layer.children.length, 1); assert.equal(title(), 'A');
  f.time.run(2700); assert.equal(title(), 'BOSS');
  f.time.run(2700); assert.equal(title(), 'VICTOIRE');
  f.time.run(2700); assert.equal(layer.children.length, 0);
});
test('effect bursts remain bounded and are cleaned up after rapid rewards', () => {
  const f = engineFixture(), motion = f.context.LKMotion;
  for (let i = 0; i < 20; i++) motion.reward(5);
  const effects = f.document.getElementById('lk-effects');
  assert(effects.children.length <= 91);
  f.time.run(2200); assert.equal(effects.children.length, 0);
});
test('hidden tabs clear effects and postpone pending celebrations', () => {
  const f = engineFixture(), motion = f.context.LKMotion;
  motion.reward(9); f.document.hidden = true; f.document.emit('visibilitychange');
  assert.equal(f.document.getElementById('lk-effects').children.length, 0);
  motion.celebrate('ASCENSION', 'S', 'Bravo');
  assert.equal(f.document.getElementById('lk-celebrations').children.length, 0);
  f.document.hidden = false; f.document.emit('visibilitychange');
  assert.equal(f.document.getElementById('lk-celebrations').children.length, 1);
});
