const Util = {
  PORTES_DEV: false,
  mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  dev(loc) {
    const l = loc !== undefined ? loc : (typeof location !== 'undefined' ? location : null);
    if (!l || typeof l !== 'object') return false;
    const q = typeof l.search === 'string' ? l.search : '';
    return l.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(l.hostname || '') || (Util.PORTES_DEV === true && /(^|[?&])dev=1(&|$)/.test(q.replace(/^\?/, '')));
  },

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  },

  jauge(kind, value, max, text, label, extra) {
    const v = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    const crit = kind === 'vie' && v <= 0.25 ? ' data-etat="critique"' : '';
    return `<div class="vy-jauge vy-jauge--${kind}${extra ? ' ' + extra : ''}" style="--v:${v.toFixed(3)}" role="meter" aria-label="${Util.esc(label || kind)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"${crit}>` +
      `<span class="vy-jauge__barre"></span>${text != null ? `<span class="vy-jauge__texte">${Util.esc(text)}</span>` : ''}</div>`;
  },

  setJauge(el, value, max, text) {
    if (!el) return;
    const v = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
    el.style.setProperty('--v', v.toFixed(3));
    el.setAttribute('aria-valuenow', value);
    el.setAttribute('aria-valuemax', max);
    if (el.classList.contains('vy-jauge--vie')) { if (v <= 0.25) el.dataset.etat = 'critique'; else delete el.dataset.etat; }
    const t = el.querySelector('.vy-jauge__texte');
    if (t && text != null) t.textContent = text;
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
    const [r1, g1, b1] = ch(pa), [r2, g2, b2] = ch(pb);
    const v = x => Math.round(x).toString(16).padStart(2, '0');
    return '#' + v(r1 + (r2 - r1) * t) + v(g1 + (g2 - g1) * t) + v(b1 + (b2 - b1) * t);
  },

  defaultLook(color) {
    const c = /^#[0-9a-f]{6}$/i.test(color || '') ? color.toLowerCase() : '#4a90ff';
    return { tete: 0, couleurs: ['#f2d9bf', Util.mixHex(c, '#1a1420', 0.62), c, '#2b3048', Util.mixHex(c, '#0d1020', 0.5), c] };
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },

  ABSENT_MS: 180000,
  dernierGeste: typeof performance === 'object' && performance.now ? performance.now() : 0,
  geste(now) { Util.dernierGeste = now !== undefined ? now : (typeof performance === 'object' ? performance.now() : Date.now()); },
  absent(now) {
    if (now === undefined) now = typeof performance === 'object' ? performance.now() : Date.now();
    return now - Util.dernierGeste > Util.ABSENT_MS;
  },
};

if (typeof window === 'object' && window && typeof window.addEventListener === 'function') {
  const geste = () => Util.geste();
  for (const t of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.addEventListener(t, geste, { capture: true, passive: true });
  try {
    const s = Util.dev() && new URLSearchParams(location.search).get('absent');
    if (s && Number(s) > 0) Util.ABSENT_MS = Number(s) * 1000;
  } catch (e) {   }
}

const Bus = (() => {
  const listeners = new Map();
  const off = (evt, fn) => { const list = listeners.get(evt); if (list) { const i = list.indexOf(fn); if (i >= 0) list.splice(i, 1); } };
  return {
    on(evt, fn) { if (!listeners.has(evt)) listeners.set(evt, []); listeners.get(evt).push(fn); return () => off(evt, fn); },
    off,
    emit(evt, data) {
      const list = listeners.get(evt);
      if (!list) return;
      for (const fn of list.slice()) { try { fn(data || {}); } catch (e) { console.error('Bus « ' + evt + ' » :', e); } }
    },
  };
})();
