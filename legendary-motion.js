/* Presentation only: this engine never writes quests, timers, rewards or XP. */
(() => {
  'use strict';
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionKey = 'lk_motion_v17';
  const animations = new Set();
  const pendingQuests = new Map();
  const celebrations = [];
  let mode = readPreference();
  let booted = false;
  let origin = null;
  let celebrationActive = false;
  let notice = null;
  let onModeChange = null;

  function readPreference() {
    try {
      const value = localStorage.getItem(motionKey);
      return ['auto', 'lite', 'off'].includes(value) ? value : 'auto';
    } catch { return 'auto'; }
  }
  function quality() {
    if (reduced.matches || mode === 'off') return 'off';
    if (mode === 'lite' || body.classList.contains('low-perf') || navigator.connection?.saveData) return 'lite';
    return 'full';
  }
  function canAnimate() { return quality() !== 'off' && !document.hidden; }
  function animate(node, frames, options) {
    if (!node?.animate || !canAnimate()) return null;
    const animation = node.animate(frames, options);
    animations.add(animation);
    const forget = () => animations.delete(animation);
    animation.addEventListener('finish', forget, { once:true });
    animation.addEventListener('cancel', forget, { once:true });
    return animation;
  }
  function layer(id) {
    let node = document.getElementById(id);
    if (!node) {
      node = document.createElement('div');
      node.id = id;
      node.setAttribute('aria-hidden', 'true');
      body.appendChild(node);
    }
    return node;
  }
  function point(node) {
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight) return null;
    return { x:Math.max(16, Math.min(innerWidth - 16, rect.left + rect.width / 2)),
      y:Math.max(16, Math.min(innerHeight - 16, rect.top + rect.height / 2)) };
  }
  function anchor() {
    if (origin && performance.now() - origin.time < 1800) return origin;
    return point(document.getElementById('xp-fill')) || { x:innerWidth / 2, y:innerHeight * .4 };
  }
  function remember(node) {
    const pos = point(node);
    if (pos) origin = { ...pos, time:performance.now() };
  }
  function temporary(className, pos, frames, duration, color) {
    const parent = layer('lk-effects');
    if (parent.childElementCount >= 90 || !canAnimate()) return;
    const node = document.createElement('i');
    node.className = className;
    node.style.left = pos.x + 'px';
    node.style.top = pos.y + 'px';
    if (color) node.style.setProperty('--spark-color', color);
    parent.appendChild(node);
    const animation = animate(node, frames, { duration, easing:'cubic-bezier(.16,1,.3,1)', fill:'forwards' });
    const cleanup = () => { animation?.cancel(); node.remove(); };
    if (animation) animation.addEventListener('finish', cleanup, { once:true });
    setTimeout(cleanup, duration + 100);
  }
  function burst(pos, color = '#aad8ff', scale = 1) {
    if (!canAnimate()) return;
    const count = quality() === 'full' ? 18 : 5;
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + Math.random() * .2;
      const distance = (28 + Math.random() * 58) * scale;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      temporary('lk-spark', pos, [
        { transform:'translate(-50%,-50%) scale(1.2)', opacity:1 },
        { transform:`translate(${x}px,${y}px) rotate(120deg) scale(.1)`, opacity:0 }
      ], 700 + Math.random() * 350, color);
    }
    if (quality() === 'full') temporary('lk-shockwave', pos, [
      { transform:'translate(-50%,-50%) scale(.2)', opacity:.7 },
      { transform:`translate(-50%,-50%) scale(${2.5 * scale})`, opacity:0 }
    ], 850, color);
  }
  function pulse(node, className = 'lk-reward-glow', duration = 1000) {
    if (!node || !canAnimate()) return;
    node.classList.remove(className);
    // Replacing the class in the next frame also supports repeated rewards.
    requestAnimationFrame(() => {
      if (!canAnimate() || !node.isConnected) return;
      node.classList.add(className);
      setTimeout(() => node.classList.remove(className), duration);
    });
  }
  function announce(message) {
    const live = document.getElementById('lk-motion-announcer');
    if (live) live.textContent = message;
  }
  function reward(xp, label) {
    const pos = anchor();
    burst(pos, '#98e6ff');
    const target = point(document.getElementById('xp-fill'));
    if (target && canAnimate()) {
      const count = quality() === 'full' ? 6 : 2;
      for (let i = 0; i < count; i++) {
        setTimeout(() => temporary('lk-xp-flight', pos, [
          { transform:'translate(-50%,-50%) scale(.4)', opacity:0 },
          { transform:`translate(${(target.x - pos.x) * .35}px,${(target.y - pos.y) * .35 - 40}px) scale(1)`, opacity:1, offset:.4 },
          { transform:`translate(${target.x - pos.x}px,${target.y - pos.y}px) scale(.5)`, opacity:0 }
        ], 850), i * 50);
      }
    }
    pulse(document.querySelector('.xp-track'));
    notice?.remove();
    const node = document.createElement('div');
    node.className = 'lk-xp-notice';
    const amount = document.createElement('strong');
    amount.textContent = `+${xp} XP`;
    node.appendChild(amount);
    if (label) {
      const detail = document.createElement('small');
      detail.textContent = label;
      node.appendChild(detail);
    }
    layer('lk-effects').appendChild(node);
    notice = node;
    // In reduced motion, rewards remain visible even though the particle layer is hidden.
    if (quality() === 'off') layer('lk-celebrations').appendChild(node);
    announce(`Quête accomplie. ${xp} XP gagnés${label ? '. ' + label : ''}.`);
    animate(node, [
      { opacity:0, transform:'translate(-50%,12px) scale(.94)' },
      { opacity:1, transform:'translate(-50%,0) scale(1)', offset:.2 },
      { opacity:1, transform:'translate(-50%,0) scale(1)', offset:.8 },
      { opacity:0, transform:'translate(-50%,-8px) scale(.98)' }
    ], { duration:1900, easing:'ease-out', fill:'forwards' });
    setTimeout(() => { node.remove(); if (notice === node) notice = null; }, 1950);
  }
  function celebrate(kind, title, copy, color = '#efc783') {
    celebrations.push({ kind, title, copy, color });
    drainCelebrations();
  }
  function drainCelebrations() {
    if (celebrationActive || !celebrations.length || document.hidden) return;
    celebrationActive = true;
    const event = celebrations.shift();
    const node = document.createElement('section');
    node.className = 'lk-celebration';
    node.style.setProperty('--celebration-color', event.color);
    const kicker = document.createElement('p');
    kicker.className = 'lk-celebration-eyebrow';
    kicker.textContent = event.kind;
    const title = document.createElement('h2');
    title.className = 'lk-celebration-title';
    title.textContent = event.title;
    const copy = document.createElement('p');
    copy.className = 'lk-celebration-copy';
    copy.textContent = event.copy;
    const rule = document.createElement('div');
    rule.className = 'lk-celebration-rule';
    node.append(kicker, title, copy, rule);
    layer('lk-celebrations').appendChild(node);
    announce(`${event.kind}. ${event.title}. ${event.copy}`);
    const duration = quality() === 'off' ? 2600 : 3200;
    animate(node, [
      { opacity:0, transform:'translateY(24px) scale(.9)' },
      { opacity:1, transform:'translateY(0) scale(1.015)', offset:.18 },
      { opacity:1, transform:'translateY(0) scale(1)', offset:.28 },
      { opacity:1, transform:'translateY(0) scale(1)', offset:.86 },
      { opacity:0, transform:'translateY(-12px) scale(.97)' }
    ], { duration, easing:'cubic-bezier(.16,1,.3,1)', fill:'forwards' });
    animate(rule, [{ transform:'scaleX(1)' }, { transform:'scaleX(0)' }], { duration, easing:'linear', fill:'forwards' });
    burst({ x:innerWidth / 2, y:innerHeight / 2 }, event.color, 2);
    setTimeout(() => {
      node.remove(); celebrationActive = false; drainCelebrations();
    }, duration + 50);
  }
  function markQuest(id) {
    const card = [...document.querySelectorAll('.hcw')].find(node => node.dataset.id === id);
    remember(card);
    pendingQuests.set(id, performance.now());
  }
  function decorateQuests() {
    for (const [id, time] of pendingQuests) {
      if (performance.now() - time > 2500) { pendingQuests.delete(id); continue; }
      const row = [...document.querySelectorAll('.hcw')].find(node => node.dataset.id === id);
      const card = row?.querySelector('.hcard-done');
      if (card) { pulse(card, 'lk-quest-complete', 800); pendingQuests.delete(id); }
    }
  }
  function reveal(root, direction = 1) {
    if (!root || !canAnimate()) return;
    root.style.setProperty('--lk-direction', direction > 0 ? '18px' : '-18px');
    pulse(root, 'lk-page-enter', 450);
    const items = root.querySelectorAll('.hero-panel,.command-card,.stat-card,.insight-hero,.badge-card,.a-kpi');
    [...items].slice(0, 16).forEach((node, i) => {
      node.style.setProperty('--lk-delay', `${Math.min(i * 35, 280)}ms`);
      pulse(node, 'lk-reveal', 950);
    });
  }
  function introImpact() {
    const intro = document.getElementById('intro');
    if (!intro || intro.style.display === 'none') return;
    const center = point(intro.querySelector('.intro-v16-core'));
    if (center) burst(center, intro.dataset.introU === 'sao' ? '#91f1ff' : '#bca5ff', 1.8);
  }
  function selectWorld(button) {
    if (!button) return;
    animate(button, [{ transform:'scale(.985)' }, { transform:'scale(1)' }], { duration:420, easing:'cubic-bezier(.16,1,.3,1)' });
  }
  function updateMode() {
    const level = quality();
    body.classList.toggle('lk-motion-off', level === 'off');
    body.classList.toggle('lk-motion-lite', level === 'lite');
    const select = document.getElementById('lk-motion-mode');
    if (select) select.value = mode;
    if (level !== 'full') {
      animations.forEach(animation => animation.cancel());
      document.getElementById('lk-effects')?.replaceChildren();
    }
    onModeChange?.(level);
  }
  function setMode(value) {
    mode = ['auto', 'lite', 'off'].includes(value) ? value : 'auto';
    try { localStorage.setItem(motionKey, mode); } catch { /* preference remains usable for this visit */ }
    updateMode();
  }
  function boot() {
    if (booted) return;
    booted = true;
    layer('lk-effects');
    layer('lk-celebrations');
    document.getElementById('lk-motion-mode')?.addEventListener('change', event => setMode(event.target.value));
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button');
      if (!button || button.disabled) return;
      remember(button);
      // A small geometric pulse, also positioned correctly for keyboard activation.
      if (!button.matches('.tog-btn,.task-tog,.intro-world-option') && canAnimate()) {
        const pos = event.detail > 0 ? { x:event.clientX, y:event.clientY } : point(button);
        if (pos) temporary('lk-shockwave', pos, [
          { transform:'translate(-50%,-50%) scale(.12)', opacity:.3 },
          { transform:'translate(-50%,-50%) scale(.65)', opacity:0 }
        ], 400, '#aacfff');
      }
    }, { capture:true, passive:true });
    let wasLow = body.classList.contains('low-perf');
    const lowPerfObserver = new MutationObserver(() => {
      const isLow = body.classList.contains('low-perf');
      if (wasLow !== isLow) { wasLow = isLow; updateMode(); }
    });
    lowPerfObserver.observe(body, { attributes:true, attributeFilter:['class'] });
    reduced.addEventListener('change', updateMode);
    document.addEventListener('visibilitychange', () => {
      body.classList.toggle('lk-motion-paused', document.hidden);
      if (document.hidden) {
        animations.forEach(animation => animation.cancel());
        document.getElementById('lk-effects')?.replaceChildren();
      } else drainCelebrations();
    });
    updateMode();
  }
  window.LKMotion = Object.freeze({
    boot, quality, canAnimate, setMode, reward, celebrate, markQuest, decorateQuests,
    reveal, introImpact, selectWorld, remember,
    onModeChange(callback) { onModeChange = callback; updateMode(); },
    task(node) { remember(node); burst(anchor(), '#a4f4cb', .7); },
    stop() {
      animations.forEach(animation => animation.cancel());
      document.getElementById('lk-effects')?.replaceChildren();
    }
  });
  updateMode();
})();
