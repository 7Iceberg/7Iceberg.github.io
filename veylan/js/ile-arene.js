// Le combat sur le terrain d'Ervane, en 3D (docs/ILE-TECHNIQUE.md, 5.4 et 5.5) : l'aire du combat
// posée sur le relief (son coin x0, y0 : la case (x, y) du combat est le carré [x0 + x, x0 + x + 1]
// × [y0 + y, y0 + y + 1] du monde), l'état de ses cases dans une texture lue par le shader du sol
// (js/ile-sol.js), les figures du combat (leurs anneaux, leurs barres de vie, leurs états), les
// rochers temporaires, les animations et les effets que le moteur de combat demande (animMove,
// animCast, animTrap, fx, float), avec les durées de RendererGL.
//
// Le moteur de combat ne sait rien de tout ceci : il travaille sur la carte de l'aire (Grid.create)
// et ses cases, comme sur une carte à cases. Ile3D crée l'arène une fois, l'ouvre quand le combat
// commence sur son plateau, la ferme au retour.
const IleArene = (() => {
  const N = 15;
  const octet = v => Math.max(0, Math.min(255, Math.round(v)));
  const rgb = n => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const rgbHex = h => { const n = parseInt(String(h).replace('#', ''), 16) || 0; return rgb(n); };
  const CRISTAL = '#7fe3ff';

  // Les textures des effets, peintes une fois : une lueur ronde, un anneau rond (pied des
  // figures), un anneau carré (l'éclat d'une case), une étincelle.
  function toile(w, h, peindre) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    peindre(c.getContext('2d'), w, h);
    return c;
  }
  const PEINTURES = {
    lueur: () => toile(64, 64, (g, w) => {
      const r = w / 2, d = g.createRadialGradient(r, r, 0, r, r, r);
      d.addColorStop(0, 'rgba(255,255,255,1)'); d.addColorStop(0.3, 'rgba(255,255,255,0.42)'); d.addColorStop(0.7, 'rgba(255,255,255,0.08)'); d.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = d; g.fillRect(0, 0, w, w);
    }),
    anneau: () => toile(128, 128, g => {
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 12; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
    }),
    carre: () => toile(128, 128, g => {
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 14; g.strokeRect(14, 14, 100, 100);
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(14, 14, 100, 100);
    }),
  };

  // Les effets sont peints en mélange ordinaire (pas en addition) : sur l'herbe claire et le
  // calcaire d'Ervane, une lueur additive se perdrait dans le sol.
  const VS_PANNEAU = `
attribute vec3 centre;
attribute vec4 couleur;
attribute float taille;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(centre, 1.0);
  mvPosition.xy += position.xy * taille;
  gl_Position = projectionMatrix * mvPosition;
  vUv = uv;
  vCol = couleur;
}`;
  // Le même quad couché au sol (les éclats carrés des cases).
  const VS_SOL = `
attribute vec3 centre;
attribute vec4 couleur;
attribute float taille;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  vec3 p = centre + vec3(position.x * taille, 0.0, -position.y * taille);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  vUv = uv;
  vCol = couleur;
}`;
  const FS_PANNEAU = `
uniform sampler2D carte;
varying vec2 vUv;
varying vec4 vCol;
void main() {
  float a = texture2D(carte, vUv).a * vCol.a;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCol.rgb, a);
  #include <encodings_fragment>
}`;


  // Les effets propres à certains sorts (spell.fx), en plus du trait et de l'éclat : la couleur du
  // trait, puis des particules au départ (de : le lanceur, hde : la hauteur du départ, vers : le
  // centre de la zone, points du monde) et sur chaque case touchée.
  const hasard = (a, b) => a + Math.random() * (b - a);
  const FX_SORTS = {
    // La Bouffée de spores du Lampignon : un nuage cyan qui part de la coiffe et flotte, puis s'ouvre
    // en boule sur la case.
    spores: {
      couleur: '#8ff6ff',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1;
        A.semer(16, () => ({ x: de.u + hasard(-0.15, 0.15), h: hde + hasard(0, 0.3), z: de.v + hasard(-0.15, 0.15), vx: dx / l * hasard(0.9, 2.1) + hasard(-0.4, 0.4), vy: hasard(0.2, 0.7), vz: dz / l * hasard(0.9, 2.1) + hasard(-0.4, 0.4), vie: hasard(0.7, 1.1), max: 1.1, g: -0.35, couleur: ['#8ff6ff', '#d2fff7', '#a6e8d6'][Math.floor(Math.random() * 3)], taille: hasard(0.22, 0.42) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.semer(14, (i, n) => { const a = i / n * Math.PI * 2 + hasard(-0.3, 0.3), v = hasard(0.35, 1.0); return { x: p.u, h: h + hasard(0.25, 0.7), z: p.v, vx: Math.cos(a) * v, vy: hasard(0.15, 0.55), vz: Math.sin(a) * v, vie: hasard(0.9, 1.4), max: 1.4, g: -0.22, couleur: ['#8ff6ff', '#d2fff7', '#bdf3e6'][i % 3], taille: hasard(0.32, 0.6) }; });
      },
    },
    // Le Bâton gluant du Lampignard : la bave verte jaillit de la crosse abattue et éclabousse la case
    // (des gouttes lourdes qui retombent, une flaque).
    bave: {
      couleur: '#a6ea52',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1;
        A.semer(6, () => ({ x: de.u + dx / l * 0.5, h: hde + 0.4, z: de.v + dz / l * 0.5, vx: dx / l * hasard(0.5, 1.4), vy: hasard(0.6, 1.6), vz: dz / l * hasard(0.5, 1.4), vie: hasard(0.4, 0.7), max: 0.7, g: 6, couleur: '#9ee04a', taille: hasard(0.2, 0.32) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#9ee04a', ne: null, duree: 620 });
        A.semer(16, (i, n) => { const a = i / n * Math.PI * 2 + hasard(-0.3, 0.3), v = hasard(0.6, 1.7); return { x: p.u, h: h + 0.3, z: p.v, vx: Math.cos(a) * v, vy: hasard(1.6, 3.0), vz: Math.sin(a) * v, vie: hasard(0.5, 0.85), max: 0.85, g: 7, couleur: ['#9ee04a', '#e4ff9c', '#6f9a32'][i % 3], taille: hasard(0.22, 0.38) }; });
      },
    },
  };
  class Arene {
    constructor(THREE, ile) {
      this.THREE = THREE;
      this.ile = ile;
      this.etat = null;           // null, 'ouverte' (le combat), 'fermeture' (le retour, la grille s'efface)
      this.map = null;
      this.x0 = 0; this.y0 = 0;
      this.sig = null;
      this.anims = [];
      this.eclats = [];           // { x, y, couleur, ne, duree } : des cases du combat
      this.projectiles = [];      // { de, a, couleur, ne, duree } : des points du monde
      this.etincelles = [];       // { x, h, z, vx, vy, vz, vie, max, couleur, g (la pesanteur, facultative) }
      this.chiffres = [];         // { x, y, texte, couleur, ne }
      this.entrees = new Map();   // numéro du combattant -> l'instant de son arrivée (les modèles qui ont leurs gestes)
      this.rochers = new Map();   // clé de case -> numéro d'instance
      // La texture de l'état des cases (4 texels par case, 16 cases par ligne ; le troisième porte
      // le genre, les drapeaux et la hauteur de la case, lue aussi par la trame des obstacles).
      this.donnees = new Uint8Array(64 * 16 * 4);
      const t = this.texCases = new THREE.DataTexture(this.donnees, 64, 16, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true;
      const tex = this.tex = {};
      for (const k of Object.keys(PEINTURES)) { const c = new THREE.CanvasTexture(PEINTURES[k]()); c.flipY = false; tex[k] = c; }
      // Deux maillages instanciés : les éclats carrés couchés au sol, et les lueurs, projectiles et
      // étincelles, des panneaux tournés vers la caméra.
      const q = new THREE.PlaneGeometry(1, 1);
      const instances = (max, carte, vs, ordre, test) => {
        const geo = new THREE.InstancedBufferGeometry();
        geo.index = q.index; geo.attributes.position = q.attributes.position; geo.attributes.uv = q.attributes.uv;
        const at = { centre: new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3), couleur: new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4), taille: new THREE.InstancedBufferAttribute(new Float32Array(max), 1) };
        for (const [n, a] of Object.entries(at)) { a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(n, a); }
        geo.instanceCount = 0;
        const mat = new THREE.ShaderMaterial({ uniforms: { carte: { value: carte } }, vertexShader: vs, fragmentShader: FS_PANNEAU, transparent: true, depthWrite: false, depthTest: test, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.frustumCulled = false; mesh.renderOrder = ordre;
        return { mesh, mat, at, max, n: 0 };
      };
      this.sol = instances(48, tex.carre, VS_SOL, 7, true);
      this.air = instances(160, tex.lueur, VS_PANNEAU, 12, true);
      this.carres = this.sol.mesh; this.panneaux = this.air.mesh;
      this.matCarres = this.sol.mat; this.matPanneaux = this.air.mat;
      // Les rochers que des sorts posent pour quelques tours.
      const L = IleDecor.bibliotheque(!!ile.telephone);
      this.matRocher = new THREE.MeshToonMaterial({ color: new THREE.Color('#9a958a'), gradientMap: ile.rampe || null });
      this.rocs = new THREE.InstancedMesh(L.blocs[3], this.matRocher, 12);
      this.rocs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.rocs.count = 0; this.rocs.frustumCulled = false;
      this.groupe = new THREE.Group();
      this.groupe.add(this.carres, this.panneaux, this.rocs);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color(); this._e = new THREE.Euler();
    }

    get ouverte() { return this.etat === 'ouverte'; }

    // ----- Ouvrir, fermer -----

    // Le combat commence sur la carte `map` (map.ancre : { plateau, x0, y0 }). Rend l'aire pour la
    // caméra : { x0, y0, w, h, hMin, hMax, hMoy }.
    ouvrir(map) {
      this.finirAnimations();
      this.map = map;
      this.x0 = map.ancre.x0; this.y0 = map.ancre.y0;
      this.etat = 'ouverte';
      this.sig = null;
      this.eclats = []; this.projectiles = []; this.etincelles = []; this.chiffres = [];
      this.entrees = new Map();
      const H = (u, v) => this.ile.hauteur(u, v);
      let hMin = Infinity, hMax = -Infinity, s = 0, n = 0;
      for (let y = 0; y <= N; y++) for (let x = 0; x <= N; x++) {
        const h = H(this.x0 + x, this.y0 + y);
        if (!Number.isFinite(h)) continue;
        if (h < hMin) hMin = h; if (h > hMax) hMax = h;
      }
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (map.cells[y][x] === Grid.FLOOR) { const h = H(this.x0 + x + 0.5, this.y0 + y + 0.5); if (Number.isFinite(h)) { s += h; n++; } }
      if (!Number.isFinite(hMin)) { hMin = 0; hMax = 0; }
      const hMoy = this.hMoy = n ? s / n : (hMin + hMax) / 2;
      // La texture repart de zéro, avec ce qui ne change pas pendant le combat (genre et hauteur des
      // cases), lu dès la première image par la trame des obstacles (Ile3D.fonduHouppiers).
      this.donnees.fill(0);
      for (let y = 0; y < map.h && y < 16; y++) for (let x = 0; x < map.w && x < 16; x++) this.ecrireFixe(x, y);
      this.texCases.needsUpdate = true;
      // Les quatre coins du carré (haut, droite, gauche, bas à l'écran) à la hauteur de leur sol.
      const coin = (u, v) => { const h = H(u, v); return [u, v, Number.isFinite(h) ? h : hMoy]; };
      const X1 = this.x0 + map.w, Y1 = this.y0 + map.h;
      return { x0: this.x0, y0: this.y0, w: map.w, h: map.h, hMin, hMax, hMoy, coins: [coin(this.x0, this.y0), coin(X1, this.y0), coin(this.x0, Y1), coin(X1, Y1)] };
    }

    // Le combat est fini : plus de figures du combat ; la grille s'efface pendant le passage.
    fermer() {
      if (!this.etat) return;
      this.finirAnimations();
      this.etat = 'fermeture';
      this.eclats = []; this.projectiles = []; this.etincelles = []; this.chiffres = [];
      this.rochers.clear(); this.rocs.count = 0;
      this.donnees.fill(0);
      this.texCases.needsUpdate = true;
      this.sig = null;
    }
    // Le passage fini : plus rien.
    eteindre() { this.etat = null; this.map = null; this.carres.geometry.instanceCount = 0; this.panneaux.geometry.instanceCount = 0; this.rocs.count = 0; }

    // Les animations en cours se terminent tout de suite (rendu désactivé, fin du combat) : le
    // moteur de combat n'attend jamais une image qui ne viendra pas.
    finirAnimations() {
      const a = this.anims;
      this.anims = [];
      for (const x of a) { try { x.finir(); } catch (e) { console.error(e); } }
    }

    // ----- Repères -----

    // Le centre d'une case du combat (fractions permises), en u du monde.
    versMonde(x, y) { return { u: this.x0 + x + 0.5, v: this.y0 + y + 0.5 }; }
    // La case du combat sous un point du monde.
    caseSous(u, v) { return { x: Math.floor(u - this.x0), y: Math.floor(v - this.y0) }; }

    // Ce qu'une case garde toute la durée du combat dans la texture : son genre (texel 2, rouge) et
    // la hauteur de son centre par rapport à la moyenne de l'aire (texel 2, bleu : 128 au niveau
    // moyen, 32 pas par u, soit plus ou moins 4 u), que la trame des obstacles lit pour ramener un
    // fragment au sol le long de la caméra.
    ecrireFixe(x, y) {
      const D = this.donnees, o = (y * 64 + x * 4) * 4;
      D[o + 8] = this.map.cells[y][x];
      const h = this.ile.hauteur(this.x0 + x + 0.5, this.y0 + y + 0.5);
      D[o + 10] = Number.isFinite(h) ? Math.max(0, Math.min(255, Math.round(128 + (h - (this.hMoy || 0)) * 32))) : 128;
      D[o + 11] = 255;
    }

    // ----- L'état des cases -----

    // Les surbrillances de l'interface et l'état du combat dans la texture lue par le sol : même
    // priorité et mêmes couleurs que RendererGL.updateCells. Refaite seulement quand sa signature change.
    majCases(H, cb) {
      if (this.etat !== 'ouverte') return;
      const m = this.map, placement = cb.phase === 'placement';
      const traps = (cb.traps || []).filter(t => t.owner && t.owner.team === 'player');
      const hv = H.hover && Grid.inBounds(m, H.hover.x, H.hover.y) ? H.hover : null;
      const chemin = H.path || [];
      const sig = [placement ? 1 : 0, [...H.move].join(','), [...H.range].join(','), [...H.blocked].join(','), [...H.aoe].join(','), [...cb.temp.keys()].map(k => k + cb.temp.get(k).kind).join(','), traps.map(t => t.x + ',' + t.y + t.element).join(';'), hv ? hv.x + ',' + hv.y : '', chemin.map(p => p.x + ',' + p.y).join(';')].join('|');
      this.majRochers(cb);
      if (sig === this.sig) return;
      this.sig = sig;
      const D = this.donnees;
      D.fill(0);
      const sur = new Set(chemin.map(p => Grid.key(p.x, p.y)));
      for (let y = 0; y < m.h && y < 16; y++) for (let x = 0; x < m.w && x < 16; x++) {
        const k = Grid.key(x, y), o = (y * 64 + x * 4) * 4;
        const tmp = cb.tempAt ? cb.tempAt(x, y) : null;
        let fill = null, stroke = null, respire = false;
        if (tmp && tmp.kind === 'water') { fill = [0x2f8fe0, 0.5]; stroke = [0x9fd7ff, 0.5]; }
        if (tmp && tmp.kind === 'fente') { fill = [0x120818, 0.92]; stroke = [0xbf95ff, 0.9]; }
        if (placement) {
          if (cb.isStartCell('player', x, y)) { fill = [0x3f8fff, 0.55]; stroke = [0x9fd7ff, 0.95]; respire = true; }
          // Le rouge des cases des monstres : un peu plus franc que sur les cartes à cases (0xe04a4a à 0,45),
          // qui tournait au brun sur l'herbe claire.
          else if (cb.isStartCell('monster', x, y)) { fill = [0xe83a3a, 0.56]; stroke = [0xffa0a0, 0.9]; }
        }
        if (H.move.has(k)) { fill = [0x4fd47a, 0.4]; stroke = [0xa8ffc4, 0.6]; respire = false; }
        if (H.range.has(k)) { fill = [0x4a90ff, 0.38]; stroke = [0xb8dcff, 0.5]; respire = false; }
        if (H.blocked.has(k)) { fill = [0x000000, 0.4]; stroke = null; respire = false; }
        if (H.aoe.has(k)) { fill = [0xff9a30, 0.6]; stroke = [0xffe0a0, 0.95]; respire = false; }
        if (fill) { const c = rgb(fill[0]); D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = octet(fill[1] * 255); }
        if (stroke) { const c = rgb(stroke[0]); D[o + 4] = c[0]; D[o + 5] = c[1]; D[o + 6] = c[2]; D[o + 7] = octet(stroke[1] * 255); }
        this.ecrireFixe(x, y);
        D[o + 9] = (hv && hv.x === x && hv.y === y ? 1 : 0) | (sur.has(k) ? 2 : 0) | (respire ? 4 : 0);
      }
      for (const tr of traps) {
        if (!Grid.inBounds(m, tr.x, tr.y)) continue;
        const o = (tr.y * 64 + tr.x * 4) * 4 + 12, c = rgbHex(DATA.elements[tr.element].color);
        D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255;
      }
      this.texCases.needsUpdate = true;
    }

    // Les rochers temporaires : des blocs de pierre posés sur leur case, tant qu'ils durent.
    majRochers(cb) {
      const voulu = [];
      for (const [k, tmp] of cb.temp) if (tmp.kind === 'rock') voulu.push(k);
      const cle = voulu.join(';');
      if (cle === this.cleRochers) return;
      this.cleRochers = cle;
      let n = 0;
      for (const k of voulu) {
        if (n >= 12) break;
        const [x, y] = k.split(',').map(Number), p = this.versMonde(x, y), h = this.ile.hauteur(p.u, p.v);
        const r = 0.44 + IleTerrain.M.hache(x, y, 77) * 0.08;
        this._e.set(0, IleTerrain.M.hache(x, y, 78) * 6.28, 0);
        this._q.setFromEuler(this._e);
        this._m.compose(this._v.set(p.u, h + r * 0.55, p.v), this._q, this._s.set(r, r * 1.2, r * 0.9));
        this.rocs.setMatrixAt(n++, this._m);
      }
      this.rocs.count = n;
      this.rocs.instanceMatrix.needsUpdate = true;
    }

    // ----- Les figures du combat -----

    // Les combattants vivants et vus, à la manière de RendererGL.combatSprites : leur case (rx, ry
    // interpolés par animMove) posée sur le relief, leurs anneaux, leur barre de vie, leurs états.
    sprites(cb, now, fig, telephone) {
      if (this.etat !== 'ouverte') return [];
      const out = [];
      for (const e of cb.entities) {
        if (!e.alive || !cb.canSee(cb.player, e)) continue;
        const p = this.versMonde(e.rx, e.ry), h = this.ile.hauteur(p.u, p.v);
        const s = {
          kind: 'entity', shape: e.shape, color: e.color, glyph: e.glyph, name: e.name, look: e.def.look, gender: e.def.gender,
          team: e.team, flash: now < (e.flashUntil || 0), motif: e.team === 'monster' ? Renderer.motifOf(e.def.id) : null, noyau: e.def.noyau || null,
          // Au téléphone, les monstres grandissent (1,3 : un Krobbet fait alors 8 % de la hauteur de
          // l'écran, revue finale) ; le Veilleur et ses alliés un peu (1,12).
          scale: (e.boss ? 1.3 : (e.isSummon && !e.ally ? 0.8 : 1)) * (telephone ? (e.team === 'monster' ? 1.3 : 1.12) : 1),
          alpha: (e.alpha == null ? 1 : e.alpha) * (e.hasState('invisible') ? 0.45 : 1),
          facing: e.shape === 'player' ? e.facing || Renderer.faceFoe(cb, e) : 1,
          x: p.u, y: p.v, h, normale: this.ile.normale(p.u, p.v), bob: e.hop || 0,
          cible: { type: 'combattant', ref: e },
          combat: {
            hp: e.hp / e.hpMax, bouclier: e.shield / e.hpMax, equipe: e.team, actif: cb.actor === e && cb.phase === 'battle',
            immun: e.immuneElement ? DATA.elements[e.immuneElement].color : null,
            sonne: e.hasState('stunned'), invuln: !!e.def.invulnerable || e.hasState('invulnerable'), armure: e.modifier('armor') > 0,
            lanterne: e.effects.some(f => f.type === 'state' && f.farDodge),
          },
        };
        // Le modèle 3D d'un monstre qui en a un (derrière l'interrupteur du Glym modelé).
        if (fig.modeles && e.team === 'monster' && fig.modeles.prend(e.def.id)) {
          s.modele = e.def.id; s.modeleCle = 'combat|' + e.id;
          const D = fig.modeles.durees(e.def.id);
          if (D) this.gesteFigure(s, e, D, now, cb);
        }
        s.cle = fig.cleFigure(s); s.peindre = fig.peindreFigure(s);
        out.push(s);
      }
      return out;
    }

    // Le geste d'un monstre modelé qui en a (js/modele-lampignon.js) : son arrivée la première fois
    // qu'on le voit (il tombe à sa place ; au placement, les uns après les autres), puis le geste en
    // cours que les animations lui ont donné (sort, saut, poussée), sinon le coup reçu quand il
    // s'éclaire.
    gesteFigure(s, e, D, now, cb) {
      let a = this.entrees.get(e.id);
      if (a == null) { a = now + (cb.phase === 'placement' ? Math.min(6, this.entrees.size) * 110 : 0); this.entrees.set(e.id, a); }
      if (now < a) { s.alpha = 0; return; }
      if (now < a + D.placement) { s.geste = { type: 'placement', t: (now - a) / D.placement }; return; }
      const g = e.geste;
      if (g && g.debut != null && now < g.debut + g.duree) { s.geste = { type: g.type, t: (now - g.debut) / g.duree }; if (g.vers) s.vers = g.vers; return; }
      if (now < (e.flashUntil || 0)) s.geste = { type: 'coup', t: 1 - (e.flashUntil - now) / 250 };
    }
    // Les durées des gestes d'un combattant modelé qui en a, sinon null.
    gestesDe(e) {
      const P = this.ile.figures && this.ile.figures.modeles;
      return e && P && e.team === 'monster' && P.prend(e.def.id) ? P.durees(e.def.id) : null;
    }

    // ----- Les animations du moteur de combat -----

    // Un pas, une poussée ou une téléportation : 140, 90 ou 200 ms ; rx, ry glissent d'une case à
    // l'autre avec un petit saut, ou la figure s'efface et reparaît (téléportation, avec éclats).
    animMove({ entity, to, teleport, fast }) {
      return new Promise(resolve => {
        const from = { x: entity.rx, y: entity.ry };
        const duree = teleport ? 200 : (fast ? 90 : 140);
        if (!teleport && !fast && entity.shape === 'player') entity.facing = Grid.facing(to.x - from.x, to.y - from.y) || entity.facing;
        if (teleport) {
          this.eclater([{ x: from.x, y: from.y }], CRISTAL, 300);
          setTimeout(() => { if (this.etat === 'ouverte') this.eclater([to], CRISTAL, 300); }, 100);
        }
        let debut = null;
        const finir = () => { entity.rx = to.x; entity.ry = to.y; entity.alpha = 1; entity.hop = 0; resolve(); };
        // Un monstre modelé saute d'une case à l'autre (tourné vers elle), ou part en arrière, poussé.
        const D = teleport ? null : this.gestesDe(entity);
        this.anims.push({
          finir,
          tick: now => {
            if (debut == null) {
              debut = now;
              if (D) entity.geste = fast ? { type: 'pousse', debut: now, duree: D.pousse } : { type: 'saut', debut: now, duree, vers: this.versMonde(to.x, to.y) };
            }
            const t = Math.min(1, (now - debut) / duree);
            if (teleport) {
              entity.rx = t < 0.5 ? from.x : to.x;
              entity.ry = t < 0.5 ? from.y : to.y;
              entity.alpha = Math.abs(t - 0.5) * 2;
            } else {
              entity.rx = from.x + (to.x - from.x) * t;
              entity.ry = from.y + (to.y - from.y) * t;
              entity.hop = Math.sin(t * Math.PI) * 4;
            }
            if (t >= 1) { finir(); return true; }
            return false;
          },
        });
      });
    }

    // Un sort : un trait de lumière de la couleur de l'élément va du lanceur aux cases touchées
    // (180 ms), puis un éclat sur chaque case ; la promesse se résout à 240 ms. Un monstre modelé qui
    // a ses gestes joue d'abord son sort (tourné vers sa cible) : le trait part à son lâcher (le coup
    // de coiffe, le bâton abattu), et le reste suit d'autant ; l'effet propre au sort (spell.fx : des
    // spores, de la bave) s'ajoute au départ et à l'impact.
    animCast({ entity, spell, cells }) {
      const fx = FX_SORTS[spell.fx] || null;
      const couleur = fx ? fx.couleur : DATA.elements[spell.element] ? DATA.elements[spell.element].color : '#ffffff';
      const zone = cells || [];
      const D = this.gestesDe(entity), lacher = D ? D.sort * D.lacher : 0;
      const centre = zone.length ? { x: zone.reduce((s, c) => s + c.x, 0) / zone.length, y: zone.reduce((s, c) => s + c.y, 0) / zone.length } : null;
      const lancer = () => {
        if (!entity || !zone.length || this.etat !== 'ouverte') return;
        const de = this.versMonde(entity.rx, entity.ry), hde = this.ile.hauteur(de.u, de.v) + 0.95 * (entity.boss ? 1.3 : 1);
        const cibles = zone.length <= 4 ? zone : [centre];
        for (const c of cibles) {
          if (Math.abs(c.x - entity.rx) + Math.abs(c.y - entity.ry) < 0.5) continue;
          const a = this.versMonde(c.x, c.y);
          this.projectiles.push({ de: { u: de.u, h: hde, v: de.v }, a: { u: a.u, h: this.ile.hauteur(a.u, a.v) + 0.45, v: a.v }, couleur, ne: null, duree: 180 });
        }
        if (fx) fx.depart(this, de, hde, this.versMonde(centre.x, centre.y));
      };
      const eclat = () => { this.eclater(zone, couleur, 340); if (fx) for (const c of zone) fx.impact(this, c); };
      return new Promise(resolve => {
        let debut = null, lance = false, eclate = false;
        const finir = () => { if (!eclate) { eclate = true; eclat(); } resolve(); };
        this.anims.push({
          finir,
          tick: now => {
            if (debut == null) {
              debut = now;
              if (D && entity) entity.geste = { type: 'sort', debut: now, duree: D.sort, vers: centre ? this.versMonde(centre.x, centre.y) : null };
            }
            if (!lance && now - debut >= lacher) { lance = true; lancer(); }
            if (!eclate && now - debut >= lacher + 180) { eclate = true; eclat(); }
            if (now - debut >= lacher + 240) { finir(); return true; }
            return false;
          },
        });
      });
    }

    // Une poignée de particules (les étincelles) : n fois la fonction f(i) qui rend une particule.
    semer(n, f) {
      if (this.etat !== 'ouverte') return;
      const k = this.ile.qualite === 'haute' ? 1 : 0.6;
      for (let i = 0, m = Math.max(2, Math.round(n * k)); i < m; i++) this.etincelles.push(f(i, m));
      if (this.etincelles.length > 160) this.etincelles.splice(0, this.etincelles.length - 160);
    }

    // Un piège qui se déclenche : 180 ms (l'éclat vient du moteur, par `fx`).
    animTrap() {
      return new Promise(resolve => {
        let debut = null;
        this.anims.push({ finir: resolve, tick: now => { if (debut == null) debut = now; if (now - debut >= 180) { resolve(); return true; } return false; } });
      });
    }

    fx(d) { this.eclater(d.cells || [], d.color || '#ffffff', 420); }
    float(d) { this.chiffres.push({ x: d.x, y: d.y, texte: String(d.text), couleur: d.color || '#ffffff', ne: null }); if (this.chiffres.length > 24) this.chiffres.shift(); }

    // Un éclat sur des cases : un anneau carré qui s'ouvre au sol, une lueur, des étincelles.
    eclater(cells, couleur, duree) {
      if (this.etat !== 'ouverte') return;
      for (const c of cells) {
        this.eclats.push({ x: c.x, y: c.y, couleur, ne: null, duree });
        const n = this.ile.qualite === 'haute' ? 7 : 3, p = this.versMonde(c.x, c.y), h = this.ile.hauteur(p.u, p.v);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.4;
          this.etincelles.push({ x: p.u, h: h + 0.25, z: p.v, vx: Math.cos(a) * v * 0.7, vy: 1.2 + Math.random() * 1.6, vz: Math.sin(a) * v * 0.7, vie: 0.5 + Math.random() * 0.4, max: 0.9, couleur, taille: 0.16 + Math.random() * 0.14 });
        }
      }
      if (this.eclats.length > 48) this.eclats.splice(0, this.eclats.length - 48);
      if (this.etincelles.length > 120) this.etincelles.splice(0, this.etincelles.length - 120);
    }

    // ----- Chaque image -----

    // Les animations avancent (même quand le dessin dort : le combat ne les attend jamais en vain).
    avancer(now) {
      if (!this.anims.length) return;
      this.anims = this.anims.filter(a => { try { return !a.tick(now); } catch (e) { console.error(e); a.finir(); return false; } });
    }

    // Les éclats, projectiles et étincelles dans leurs maillages ; rend les chiffres qui montent,
    // pour l'atlas des textes des figures : [{ x, y, z, dy, sorte, texte, couleur, a, k }].
    majEffets(now, dt) {
      const poser = (I, liste) => {
        const m = Math.min(I.max, liste.length);
        for (let i = 0; i < m; i++) {
          const l = liste[i];
          I.at.centre.setXYZ(i, l.x, l.h, l.z);
          this._c.set(l.couleur);
          I.at.couleur.setXYZW(i, this._c.r, this._c.g, this._c.b, Math.max(0, Math.min(1, l.a)));
          I.at.taille.setX(i, l.taille);
        }
        for (const a of Object.values(I.at)) a.needsUpdate = true;
        I.mesh.geometry.instanceCount = m;
      };
      // Les éclats : un carré qui s'ouvre au sol, une lueur au-dessus de la case.
      this.eclats = this.eclats.filter(f => { if (f.ne == null) f.ne = now; return now - f.ne < f.duree; });
      const sol = [], lueurs = [];
      for (const f of this.eclats) {
        const t = (now - f.ne) / f.duree, p = this.versMonde(f.x, f.y), h = this.ile.hauteur(p.u, p.v);
        sol.push({ x: p.u, h: h + 0.07, z: p.v, couleur: f.couleur, a: 1 - t, taille: (0.4 + 0.7 * t) * 1.4 });
        lueurs.push({ x: p.u, h: h + 0.5, z: p.v, couleur: f.couleur, a: (1 - t) * 0.8, taille: (0.55 + 0.5 * t) * 2.6 });
        lueurs.push({ x: p.u, h: h + 0.5, z: p.v, couleur: '#ffffff', a: (1 - t) * (1 - t) * 0.85, taille: 0.8 + 0.5 * t });
      }
      // Les projectiles : une lueur de l'élément, un cœur blanc, une traîne, sur un arc.
      this.projectiles = this.projectiles.filter(q => { if (q.ne == null) q.ne = now; return now - q.ne < q.duree; });
      for (const q of this.projectiles) {
        const L = Math.hypot(q.a.u - q.de.u, q.a.v - q.de.v), haut = Math.min(1.2, 0.25 * L);
        const pt = tt => ({ x: q.de.u + (q.a.u - q.de.u) * tt, h: q.de.h + (q.a.h - q.de.h) * tt + Math.sin(tt * Math.PI) * haut, z: q.de.v + (q.a.v - q.de.v) * tt });
        const t = (now - q.ne) / q.duree;
        for (const [r, a, ta] of [[0.24, 0.3, 0.55], [0.12, 0.5, 0.75]]) { const c = pt(Math.max(0, t - r)); lueurs.push(Object.assign(c, { couleur: q.couleur, a, taille: ta })); }
        const c = pt(t);
        lueurs.push(Object.assign({}, c, { couleur: q.couleur, a: 0.95, taille: 1.3 }));
        lueurs.push(Object.assign({}, c, { couleur: '#ffffff', a: 0.95, taille: 0.46 }));
      }
      // Les étincelles : lancées vers le haut, retombent.
      const g = 3.2;
      this.etincelles = this.etincelles.filter(e => (e.vie -= dt) > 0);
      for (const e of this.etincelles) {
        e.vy -= (e.g == null ? g : e.g) * dt; e.vx *= 0.96; e.vz *= 0.96;
        e.x += e.vx * dt; e.h += e.vy * dt; e.z += e.vz * dt;
        lueurs.push({ x: e.x, h: e.h, z: e.z, couleur: e.couleur, a: Math.max(0, Math.min(1, e.vie / 0.6)), taille: e.taille });
      }
      poser(this.sol, sol);
      poser(this.air, lueurs);
      // Les chiffres qui montent (900 ms) : au-dessus de la barre de vie, 30 px plus haut à la fin,
      // effacés, gonflés au départ.
      this.chiffres = this.chiffres.filter(c => { if (c.ne == null) c.ne = now; return now - c.ne < 900; });
      return this.chiffres.map(c => {
        const k = (now - c.ne) / 900, p = this.versMonde(c.x, c.y), h = this.ile.hauteur(p.u, p.v);
        return { x: p.u, y: h + 1.75, z: p.v, dy: 34 + k * 30, sorte: 'chiffre', texte: c.texte, couleur: c.couleur, a: 1 - k * k, k: 1 + (1 - Math.min(1, k * 6)) * 0.4 };
      });
    }

    liberer() {
      this.finirAnimations();
      this.texCases.dispose();
      for (const t of Object.values(this.tex)) t.dispose();
      this.rocs.dispose();
      this.carres.geometry.dispose(); this.panneaux.geometry.dispose();
      for (const m of [this.matCarres, this.matPanneaux, this.matRocher]) m.dispose();
    }
  }

  return { Arene, N };
})();
