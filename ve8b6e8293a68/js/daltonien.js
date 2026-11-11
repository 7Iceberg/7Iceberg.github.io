const Daltonien = (() => {
  const CLE = 'veylan.daltonien';
  const MODES = [['', 'Désactivé'], ['rougevert', 'Rouge et vert (protanopie, deutéranopie)'], ['bleujaune', 'Bleu et jaune (tritanopie)']];
  const ELEMENTS = {
    rougevert: { feu: '#ff7d0a', eau: '#5ab4f5', air: '#fafafa', terre: '#2fd696' },
    bleujaune: { feu: '#e8884a', eau: '#34d6ea', air: '#f2e0ec', terre: '#a2bd3a' },
  };
  const VIE = {
    '': ['#9af0a8', '#4cc46a', '#2a8a48', 0x8db585],
    rougevert: ['#b4e2ff', '#4aa8f0', '#1f6fb8', 0x5ab4f5],
  };
  const INTERFACE = { rougevert: { '--vy-succes': '#5ab4f5', '--vy-danger': '#ff8a3d' } };
  const origine = {};
  const abonnes = [];
  let actuel = '';

  const lire = () => { try { const v = localStorage.getItem(CLE); return ELEMENTS[v] ? v : ''; } catch (e) { return ''; } };

  function appliquer(m) {
    m = ELEMENTS[m] ? m : '';
    actuel = m;
    const E = (typeof DATA === 'object' && DATA.elements) || {};
    for (const k of Object.keys(E)) {
      if (!(k in origine)) origine[k] = E[k].color;
      E[k].color = (m && ELEMENTS[m][k]) || origine[k];
    }
    const racine = typeof document === 'object' && document.documentElement;
    if (racine && racine.style) {
      if (m) racine.dataset.daltonien = m; else delete racine.dataset.daltonien;
      for (const k of ['feu', 'eau', 'air', 'terre']) racine.style.setProperty('--el-' + k, (E[k] && E[k].color) || origine[k] || '');
      for (const v of ['--vy-succes', '--vy-danger']) {
        const x = INTERFACE[m] && INTERFACE[m][v];
        if (x) racine.style.setProperty(v, x); else racine.style.removeProperty(v);
      }
    }
    for (const f of abonnes) { try { f(m); } catch (e) {   } }
    return m;
  }

  function regler(m) {
    m = ELEMENTS[m] ? m : '';
    try { if (m) localStorage.setItem(CLE, m); else localStorage.removeItem(CLE); } catch (e) {   }
    return appliquer(m);
  }

  const SIGNES = {
    terre: '<path d="M3 19l6-10 4 6 3-4 5 8z"/>',
    feu: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 2 2 3 2 0-2 0-4 0-6z"/>',
    eau: '<path d="M12 3c3 5 6 8 6 11a6 6 0 0 1-12 0c0-3 3-6 6-11z"/>',
    air: '<path d="M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7"/>',
  };
  function signe(el) {
    const E = (typeof DATA === 'object' && DATA.elements) || {}, d = E[el];
    if (!actuel || !d || !SIGNES[el]) return '';
    const nom = String(d.stat || d.label || el).replace(/[&<>"]/g, '');
    return `<i class="vy-el-signe" style="--c:${d.color}" title="${nom}" aria-hidden="true"><svg viewBox="0 0 24 24">${SIGNES[el]}</svg></i>`;
  }

  appliquer(lire());
  return {
    signe,
    MODES, ELEMENTS,
    mode: () => actuel,
    regler, appliquer,
    vie: () => VIE[actuel] || VIE[''],
    abonner: f => { abonnes.push(f); },
    couleurOrigine: k => origine[k] || null,
  };
})();
