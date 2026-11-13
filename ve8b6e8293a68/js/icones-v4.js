const IconesV4 = (() => {
  const EL = {
    feu: { cadre: ['#ffd2c4', '#ff4a3d', '#7a0d14'], med: ['#ffb08a', '#c8322a', '#2a0509'], encre: ['#14060a', '#5a1018'] },
    eau: { cadre: ['#d4f6ff', '#2ec4ff', '#0a3d72'], med: ['#8fe2ff', '#1576c0', '#04142e'], encre: ['#040b1a', '#0e3460'] },
    terre: { cadre: ['#dcffd2', '#46dc62', '#0d4a1c'], med: ['#a8f29a', '#2c9a44', '#04200c'], encre: ['#030f06', '#0e3a1a'] },
    air: { cadre: ['#ffffff', '#b9c8de', '#3a4a66'], med: ['#e6eefa', '#6f86a8', '#111a2c'], encre: ['#070b14', '#26344c'] },
    neutre: { cadre: ['#fff1c4', '#f4b23a', '#6a3f0a'], med: ['#ffd98a', '#b8741c', '#261404'], encre: ['#120a02', '#4a2e0c'] },
  };
  const AMETHYSTE = ['#f2e2ff', '#b47cff', '#6a2fc4', '#2e0f63'];
  const OR = ['#fff4c8', '#ffcf4a', '#c27a12', '#5a3206'];
  const SUJETS = {};
  let n = 0;

  const star5 = (cx, cy, R) => { let d = ''; for (let i = 0; i < 10; i++) { const r = i % 2 ? R * 0.46 : R, a = (i * 36 - 90) * Math.PI / 180; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(2) + ' ' + (cy + Math.sin(a) * r).toFixed(2); } return d + 'Z'; };
  const rune = (x, y, r, c) => `<g transform="translate(${x} ${y}) rotate(${r})" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" opacity=".75"><path d="M-6 4 Q-6 -6 4 -6"/><path d="M-1 4 Q-1 -1 4 -1"/><path d="M8 -9 L10 -11"/></g>`;
  const eclat4 = (x, y, r, c, op = 1) => `<path transform="translate(${x} ${y}) scale(${r})" d="M0 -10 L1.8 -1.8 L10 0 L1.8 1.8 L0 10 L-1.8 1.8 L-10 0 L-1.8 -1.8 Z" fill="${c}" opacity="${op}"/>`;

  function sujetDe(id, p, epee) {
    if (IconesV3.epee) IconesV3.epee(epee || 'B');
    if (SUJETS[id]) return SUJETS[id](p);
    return IconesV3.SUJETS[id] ? IconesV3.SUJETS[id](p) : '';
  }
  function a(id) { return !!(SUJETS[id] || IconesV3.SUJETS[id]); }

  const versArdoise = (c, t) => { const a = [1, 3, 5].map(j => parseInt(c.slice(j, j + 2), 16)), b = [0x44, 0x45, 0x56]; return '#' + a.map((v, j) => Math.round(v + (b[j] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function icone(s, px, o = {}) {
    const i = ++n, sobre = !!o.sobre, E0 = EL[s.el] || EL.neutre;
    const E = sobre ? { cadre: E0.cadre.map((c, j) => versArdoise(c, [0.22, 0.3, 0.2][j])), med: E0.med.map((c, j) => versArdoise(c, [0.3, 0.32, 0.15][j])), encre: E0.encre } : E0;
    const [c1, c2, c3] = E.cadre, [m1, m2, m3] = E.med;
    const p = IconesV3.P[s.el] || IconesV3.P.neutre;
    const rendu = o.rendu || 'couleur', type = s.type || 'degats';
    const forme = IconesV3.FORMES[type] || IconesV3.FORMES.degats;
    const sujet = sujetDe(s.id, p, o.epee);
    const brille = o.brillance !== false && !sobre;
    const CX = 100, CY = 95, S = 0.7;
    const TM = `translate(${CX} ${CY}) scale(${S}) translate(-100 -100)`;
    let filtre;
    if (rendu === 'silhouette') {
      const hex = h => [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16) / 255);
      const [a0, a1] = [hex(E.encre[0]), hex(E.encre[1])];
      const table = j => `${a0[j].toFixed(3)} ${((a0[j] + a1[j]) / 2).toFixed(3)} ${a1[j].toFixed(3)}`;
      filtre = `<filter id="su${i}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values=".3 .59 .11 0 0  .3 .59 .11 0 0  .3 .59 .11 0 0  0 0 0 1 0" result="g"/>
          <feComponentTransfer in="g" result="t"><feFuncR type="table" tableValues="${table(0)}"/><feFuncG type="table" tableValues="${table(1)}"/><feFuncB type="table" tableValues="${table(2)}"/></feComponentTransfer>
          <feMorphology in="SourceAlpha" operator="dilate" radius="3.2" result="d"/><feGaussianBlur in="d" stdDeviation="2.2" result="db"/>
          <feFlood flood-color="${m1}"/><feComposite in2="db" operator="in" result="bord"/>
          <feMerge><feMergeNode in="bord"/><feMergeNode in="t"/></feMerge></filter>`;
    } else {
      filtre = `<filter id="su${i}" x="-20%" y="-20%" width="140%" height="140%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2.4" result="d"/><feGaussianBlur in="d" stdDeviation="2.6" result="db"/>
          <feFlood flood-color="#05040a" flood-opacity=".85"/><feComposite in2="db" operator="in" result="ombre"/>
          <feMerge><feMergeNode in="ombre"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    }
    const rang = o.rang || 0, Y = 177;
    let bas = '';
    if (rang || o.variante) {
      const pas = 23, slots = rang + (o.variante ? 1 : 0), x0 = 100 - (slots - 1) * pas / 2;
      const milieu = o.variante ? Math.floor(rang / 2) : -1;
      for (let j = 0; j < slots; j++) {
        const x = x0 + j * pas;
        bas += j === milieu
          ? `<g transform="translate(${x} ${Y})"><path d="M0 -13 L10 -3 L0 13 L-10 -3 Z" fill="${AMETHYSTE[2]}" stroke="${AMETHYSTE[3]}" stroke-width="2.4" stroke-linejoin="round"/><path d="M0 -13 L10 -3 L0 -1 L-10 -3 Z" fill="${AMETHYSTE[1]}"/><path d="M-4 -7 L0 -11 L3 -6" fill="none" stroke="${AMETHYSTE[0]}" stroke-width="1.6" stroke-linecap="round"/></g>`
          : `<path d="${star5(x, Y, 12)}" fill="url(#or${i})" stroke="${OR[3]}" stroke-width="2.2" stroke-linejoin="round"/><path d="${star5(x - 1.5, Y - 2, 4.5)}" fill="${OR[0]}" opacity=".8"/>`;
      }
      bas = `<g filter="url(#hb${i})">${bas}</g>`;
    }
    const tuile = 'M36 12 H164 Q188 12 188 36 V164 Q188 188 164 188 H36 Q12 188 12 164 V36 Q12 12 36 12 Z';
    const rayons = Array.from({ length: 12 }, (_, j) => {
      const a0 = j / 12 * Math.PI * 2, a1 = (j + .45) / 12 * Math.PI * 2, L = 160;
      return `<path d="M100 84 L${(100 + Math.cos(a0) * L).toFixed(1)} ${(84 + Math.sin(a0) * L).toFixed(1)} L${(100 + Math.cos(a1) * L).toFixed(1)} ${(84 + Math.sin(a1) * L).toFixed(1)} Z" fill="${m1}" opacity=".17"/>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="ca${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset=".35" stop-color="${c2}"/><stop offset=".7" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient>
        <radialGradient id="fo${i}" cx="50%" cy="46%" r="62%"><stop offset="0" stop-color="${m3}"/><stop offset="1" stop-color="#04060c"/></radialGradient>
        <radialGradient id="me${i}" cx="50%" cy="40%" r="62%"><stop offset="0" stop-color="${m1}"/><stop offset=".42" stop-color="${m2}"/><stop offset="1" stop-color="${m3}"/></radialGradient>
        <linearGradient id="or${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${OR[0]}"/><stop offset=".45" stop-color="${OR[1]}"/><stop offset="1" stop-color="${OR[2]}"/></linearGradient>
        <linearGradient id="ir${i}" x1="0" y1="0" x2="1" y2="1"><stop offset=".1" stop-color="#7affe9"/><stop offset=".3" stop-color="#9b8cff"/><stop offset=".5" stop-color="#ff8ad8"/><stop offset=".7" stop-color="#ffe17a"/><stop offset=".9" stop-color="#7ad8ff"/></linearGradient>
        <linearGradient id="tr${i}" x1="0" y1="0" x2="1" y2="1"><stop offset=".28" stop-color="#fff" stop-opacity="0"/><stop offset=".36" stop-color="#fff" stop-opacity=".2"/><stop offset=".39" stop-color="#fff" stop-opacity=".05"/><stop offset=".43" stop-color="#fff" stop-opacity=".14"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <filter id="gl${i}" x="-15%" y="-15%" width="130%" height="130%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="hm${i}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
        <filter id="hb${i}" x="-20%" y="-60%" width="140%" height="220%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity=".8"/></filter>
        <clipPath id="ct${i}"><path d="${tuile}" transform="translate(100 100) scale(.95) translate(-100 -100)"/></clipPath>
        <clipPath id="cm${i}"><path d="${forme}" transform="${TM}"/></clipPath>
        ${filtre}
      </defs>
      <path d="${tuile}" fill="url(#fo${i})"/>
      <path d="${tuile}" fill="none" stroke="url(#ca${i})" stroke-width="7"${sobre ? '' : ` filter="url(#gl${i})"`}/>
      ${brille ? `<path d="${tuile}" fill="none" stroke="url(#ir${i})" stroke-width="5" opacity=".38" style="mix-blend-mode:screen"/>` : ''}
      <path d="${tuile}" transform="translate(100 100) scale(.93) translate(-100 -100)" fill="none" stroke="${c3}" stroke-width="2" opacity=".9"/>
      ${rune(30, 30, 0, c2)}${rune(170, 30, 90, c2)}${rune(170, 170, 180, c2)}${rune(30, 170, 270, c2)}
      ${sobre ? '' : `<path d="${forme}" transform="${TM}" fill="${m2}" opacity=".7" filter="url(#hm${i})"/>`}
      <path d="${forme}" transform="${TM}" fill="url(#me${i})"/>
      ${sobre ? '' : `<g clip-path="url(#cm${i})">${rayons}</g>`}
      <path d="${forme}" transform="${TM}" fill="none" stroke="${c1}" stroke-width="4.4" opacity=".9"/>
      <path d="${forme}" transform="translate(${CX} ${CY}) scale(${S * .92}) translate(-100 -100)" fill="none" stroke="${m3}" stroke-width="2.4" opacity=".55"/>
      <g clip-path="url(#ct${i})"><g filter="url(#su${i})" transform="translate(${CX} ${CY + 2}) scale(.8) translate(-100 -100)">${sujet}</g></g>
      ${brille ? `<g clip-path="url(#cm${i})" style="mix-blend-mode:screen"><rect width="200" height="200" fill="url(#ir${i})" opacity=".12"/><rect width="200" height="200" fill="url(#tr${i})"/></g>${eclat4(166, 34, .55, '#ffffff', .85)}${eclat4(34, 160, .35, '#ffffff', .6)}` : ''}
      ${bas}
    </svg>`;
  }
  return { icone, EL, SUJETS, a };
})();
