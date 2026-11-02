// Les gemmes du HUD, dessinées en SVG, à la manière des pierres du HUD de Dofus : le cœur des PV (un
// cœur de verre facetté, serti, où la vie est un liquide rouge qui baisse) et les pierres en losange
// (PV, PA, PM, XP), facettées et serties, où un liquide de couleur monte et descend. Chaque gemme a
// un serti sombre (le contour élargi), un liseré clair sur le haut du serti, des facettes éclairées
// d'en haut à gauche, un reflet. Le niveau du liquide suit la surface remplie, pas la hauteur : un
// cœur ou un losange à 18 % ne paraît pas vide. Les chiffres sont posés en HTML par-dessus.
// Le bloc des gemmes (Gemmes.bloc) a deux styles, au choix dans les Options (« Bloc vital ») :
// « Cœur et losanges » (le cœur de verre, puis les losanges des PA, de l'XP et des PM) et « Grappe »
// (le grand losange des PV, les petits serrés sur son flanc). Utilisé par le bloc vital
// (js/hud-fenetres.js) et la barre de combat (js/hud-jeu.js) ; mise en page dans css/fenetres.css.
const Gemmes = (() => {
  let n = 0;
  const f = v => v.toFixed(1);
  const pts = a => a.map(p => f(p[0]) + ',' + f(p[1])).join(' ');
  // Un polygone rapproché de son centre `c` d'un facteur `k` (la gemme dans son serti).
  const serre = (o, c, k) => o.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]);
  // La lumière d'une facette : d'en haut à gauche ; > 0 éclaircit, < 0 assombrit.
  const lumiere = (c, a, b) => {
    const mx = (a[0] + b[0]) / 2 - c[0], my = (a[1] + b[1]) / 2 - c[1], L = Math.hypot(mx, my) || 1;
    return (mx / L) * -0.55 + (my / L) * -0.83;
  };
  const voile = s => s > 0 ? `fill="#fff" fill-opacity="${f(0.04 + 0.36 * s)}"` : `fill="#000" fill-opacity="${f(0.05 + 0.4 * -s)}"`;
  const eventail = (c, o) => o.map((p, i) => { const q = o[(i + 1) % o.length]; return `<polygon points="${pts([c, p, q])}" ${voile(lumiere(c, p, q))}/>`; }).join('');
  const aretes = (c, o, op) => `<path d="${o.map(p => `M${f(c[0])} ${f(c[1])}L${f(p[0])} ${f(p[1])}`).join('')}" stroke="#fff" stroke-opacity="${op}" stroke-width=".8"/>`;
  // Le serti : le contour sombre, un liseré clair sur son bord haut.
  const serti = (o, id) => `<polygon points="${pts(o)}" fill="url(#${id}s)" stroke="#0b0710" stroke-width="2.4" stroke-linejoin="round"/>`;
  const defsSerti = id => `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4456"/><stop offset=".45" stop-color="#211c29"/><stop offset="1" stop-color="#0f0b14"/></linearGradient>`;
  // La surface d'un polygone, et la part de ce polygone sous la ligne y = L (y vers le bas).
  const aire = o => Math.abs(o.reduce((s, p, i) => { const q = o[(i + 1) % o.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const sous = (o, L) => {
    const r = [];
    o.forEach((a, i) => {
      const b = o[(i + 1) % o.length], ia = a[1] >= L, ib = b[1] >= L;
      if (ia) r.push(a);
      if (ia !== ib) { const t = (L - a[1]) / (b[1] - a[1]); r.push([a[0] + (b[0] - a[0]) * t, L]); }
    });
    return r;
  };
  // Une forme à remplir : son haut, son bas, et la surface remplie pour 41 hauteurs de liquide.
  const forme = o => {
    const haut = Math.min(...o.map(p => p[1])), bas = Math.max(...o.map(p => p[1])), A = aire(o), tab = [];
    for (let k = 0; k <= 40; k++) tab.push(aire(sous(o, bas - (bas - haut) * k / 40)) / A);
    return { haut, bas, tab };
  };
  // La hauteur du liquide (de 0 à 1, depuis le bas) qui remplit la part `p` de la surface.
  const hauteur = (F, p) => {
    const t = F.tab;
    for (let k = 1; k < t.length; k++) if (t[k] >= p) return (k - 1 + (p - t[k - 1]) / Math.max(1e-6, t[k] - t[k - 1])) / (t.length - 1);
    return 1;
  };

  // ----- Le cœur : 100 × 92, la pointe en bas. Le liquide (.vy-gem__liquide) remplit le cœur intérieur.
  const COEUR = [[50, 89], [7, 47], [2, 28], [11, 9], [30, 2], [44, 8], [50, 17], [56, 8], [70, 2], [89, 9], [98, 28], [93, 47]];
  const CC = [50, 42], COEUR_IN = serre(COEUR, CC, 0.84);
  function coeur() {
    const id = 'gem' + (++n);
    return `<svg class="vy-gem vy-gem--coeur" viewBox="0 0 100 92" aria-hidden="true"><defs>${defsSerti(id)}
      <clipPath id="${id}c"><polygon points="${pts(COEUR_IN)}"/></clipPath>
      <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c86a3"/><stop offset=".5" stop-color="#454c66"/><stop offset="1" stop-color="#232838"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a5c"/><stop offset=".45" stop-color="#e01f35"/><stop offset="1" stop-color="#7d0618"/></linearGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      ${serti(COEUR, id)}
      <polygon points="${pts(COEUR_IN)}" fill="url(#${id}v)"/>
      <g clip-path="url(#${id}c)">
        <g class="vy-gem__liquide" transform="translate(0 0)">
          <rect x="0" y="0" width="100" height="100" fill="url(#${id}l)"/>
          <rect x="0" y="0" width="100" height="100" fill="url(#${id}r)"/>
          <rect class="vy-gem__surface" x="0" y="0" width="100" height="3" fill="#ffb3a6" fill-opacity=".9"/>
          <rect x="0" y="3" width="100" height="5" fill="#ff8574" fill-opacity=".3"/></g>
        ${eventail(CC, COEUR_IN)}${aretes(CC, COEUR_IN, 0.16)}</g>
      <path d="M${pts(COEUR.slice(2, 6)).replace(/ /g, 'L')}M${pts(COEUR.slice(7, 11)).replace(/ /g, 'L')}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
      <ellipse cx="29" cy="21" rx="10" ry="4.4" transform="rotate(-26 29 21)" fill="#fff" fill-opacity=".42"/>
      <ellipse cx="40" cy="14.5" rx="2.6" ry="1.6" fill="#fff" fill-opacity=".55"/></svg>`;
  }
  // ----- Les pierres en losange : 100 × 100, une table au centre, quatre pans, sertie ; le liquide
  // (.vy-gem__liquide) remplit le verre. Teintes : clair, milieu, sombre, la surface.
  const LOS = [[50, 2], [98, 50], [50, 98], [2, 50]], LC = [50, 50], LOS_IN = serre(LOS, LC, 0.84), LOS_T = serre(LOS, LC, 0.4);
  const TEINTES = {
    pv: ['#ff8a7a', '#e01f35', '#6d0414', '#ffc0b5'], pa: ['#a6dcff', '#3f95f2', '#123f96', '#d8f0ff'],
    pm: ['#b6ffa3', '#34b852', '#0d5220', '#e2ffd8'], xp: ['#ffbd7a', '#ff6f3d', '#c81d5c', '#ffe0c2'],
  };
  function pierre(k) {
    const [c1, c2, c3, cs] = TEINTES[k] || TEINTES.pa, id = 'gem' + (++n), I = LOS_IN, T = LOS_T;
    const pans = I.map((a, i) => { const b = I[(i + 1) % 4]; return `<polygon points="${pts([a, b, T[(i + 1) % 4], T[i]])}" ${voile(lumiere(LC, a, b) * 0.85)}/>`; }).join('');
    const l = serre(LOS, LC, 0.93);
    return `<svg class="vy-gem vy-gem--pierre vy-gem--${k}" viewBox="0 0 100 100" aria-hidden="true"><defs>${defsSerti(id)}
      <clipPath id="${id}c"><polygon points="${pts(I)}"/></clipPath>
      <linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c7592"/><stop offset=".5" stop-color="#3b4158"/><stop offset="1" stop-color="#1d2130"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
      <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      ${serti(LOS, id)}
      <polygon points="${pts(I)}" fill="url(#${id}v)"/><polygon points="${pts(I)}" fill="${c3}" fill-opacity=".32"/>
      <g clip-path="url(#${id}c)">
        <g class="vy-gem__liquide" transform="translate(0 0)">
          <rect x="0" y="0" width="100" height="100" fill="url(#${id}l)"/>
          <rect x="0" y="0" width="100" height="100" fill="url(#${id}r)"/>
          <rect class="vy-gem__surface" x="0" y="0" width="100" height="2.6" fill="${cs}" fill-opacity=".95"/>
          <rect class="vy-gem__surface" x="0" y="2.6" width="100" height="5" fill="${cs}" fill-opacity=".25"/></g>
        ${pans}<polygon points="${pts(T)}" fill="#fff" fill-opacity=".1"/>
        <path d="${I.map((a, i) => `M${f(a[0])} ${f(a[1])}L${f(T[i][0])} ${f(T[i][1])}`).join('')}" stroke="#fff" stroke-opacity=".18" stroke-width=".8"/>
        <polygon points="${pts(T)}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width=".8"/></g>
      <path d="M${f(l[3][0])} ${f(l[3][1])}L${f(l[0][0])} ${f(l[0][1])}L${f(l[1][0])} ${f(l[1][1])}" fill="none" stroke="#fff" stroke-opacity=".32" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"/>
      <ellipse cx="36" cy="31" rx="8" ry="3.2" transform="rotate(-45 36 31)" fill="#fff" fill-opacity=".45"/></svg>`;
  }

  const FORMES = { coeur: forme(COEUR_IN), pierre: forme(LOS_IN) };
  // Le niveau du liquide d'un cœur ou d'une pierre : `pct` de 0 à 1 de sa surface (le liquide
  // glisse ; sa surface reste dessus).
  function remplir(svg, pct) {
    if (!svg) return;
    const F = svg.classList.contains('vy-gem--coeur') ? FORMES.coeur : FORMES.pierre;
    const p = Math.max(0, Math.min(1, pct || 0));
    const y = F.haut + (F.bas - F.haut) * (1 - hauteur(F, p));
    const l = svg.querySelector('.vy-gem__liquide');
    if (l) { l.setAttribute('transform', `translate(0 ${f(y)})`); l.style.visibility = p <= 0.003 ? 'hidden' : ''; }
    svg.querySelectorAll('.vy-gem__surface').forEach(s => { s.style.display = p >= 0.995 ? 'none' : ''; });
  }

  // ----- Le bloc des gemmes : le style ('coeur' ou 'grappe') et, si `xp`, la pierre de l'XP (le
  // bloc vital ; la barre de combat s'en passe).
  const STYLES = [['coeur', 'Cœur et losanges'], ['grappe', 'Grappe']];
  const styleSur = s => (STYLES.some(x => x[0] === s) ? s : STYLES[0][0]);
  function bloc(style, xp) {
    const s = styleSur(style);
    const pt = (k, titre) => `<span class="vy-gemmes__${k}" title="${titre}">${pierre(k)}<b></b></span>`;
    return `<div class="vy-gemmes vy-gemmes--${s}${xp ? ' vy-gemmes--xp' : ''}" data-style="${s}">` +
      `<span class="vy-gemmes__pv" role="img" aria-label="Points de vie">${s === 'grappe' ? pierre('pv') : coeur()}<b></b></span>` +
      `<span class="vy-gemmes__trio">${pt('pa', 'Points d\'action')}${xp ? pt('xp', 'Expérience') : ''}${pt('pm', 'Points de mouvement')}</span></div>`;
  }
  // Les valeurs du bloc : { hp, hpMax, pa, paMax, pm, pmMax, xp (de 0 à 1), xpTexte, xpTitre }.
  // Les PA et PM se vident au fil du tour ; la vie sous 30 % luit (classe « bas »).
  function maj(el, v) {
    if (!el) return;
    const pct = Math.max(0, Math.min(1, v.hp / Math.max(1, v.hpMax)));
    const pv = el.querySelector('.vy-gemmes__pv');
    remplir(pv.querySelector('.vy-gem'), pct);
    pv.querySelector('b').textContent = v.hp;
    pv.title = `${v.hp} / ${v.hpMax} PV`;
    pv.setAttribute('aria-label', `Points de vie : ${v.hp} sur ${v.hpMax}`);
    el.classList.toggle('bas', pct < 0.3);
    for (const k of ['pa', 'pm']) {
      const e = el.querySelector('.vy-gemmes__' + k);
      if (!e) continue;
      e.querySelector('b').textContent = v[k];
      remplir(e.querySelector('.vy-gem'), v[k] / Math.max(1, v[k + 'Max'] || 0, v[k]));
    }
    const x = el.querySelector('.vy-gemmes__xp');
    if (x && v.xp != null) {
      remplir(x.querySelector('.vy-gem'), v.xp);
      x.querySelector('b').innerHTML = v.xpTexte || `${Math.floor(Math.max(0, Math.min(1, v.xp)) * 100)}<small>%</small>`;
      if (v.xpTitre) x.title = v.xpTitre;
    }
  }
  // Un aperçu figé du style (les Options) : 82 PV sur 106, 6 PA, 3 PM, 34 % d'XP.
  function apercu(style) {
    const t = document.createElement('div');
    t.innerHTML = bloc(style, true);
    maj(t.firstElementChild, { hp: 82, hpMax: 106, pa: 6, paMax: 6, pm: 3, pmMax: 3, xp: 0.34 });
    t.firstElementChild.removeAttribute('title');
    t.querySelectorAll('[title]').forEach(e => e.removeAttribute('title'));
    t.querySelector('.vy-gemmes__pv').removeAttribute('role');
    return t.innerHTML;
  }

  return { coeur, pierre, remplir, bloc, maj, apercu, STYLES, styleSur };
})();
