// Les figures de l'île d'Ervane (docs/ILE-TECHNIQUE.md, 3.7 et 3.8) : le Veilleur, les PNJ, les
// monstres des groupes, les nœuds de récolte, peints par le peintre du rendu des cases (les mêmes
// clés et les mêmes descriptions que RendererGL.worldSprites et paintFigure : 88 × 84 px peints à
// deux fois la taille, pied en (44, 76)), rangés dans un atlas, et dessinés par une seule
// InstancedMesh de panneaux tournés vers la caméra. Le shader ramène la profondeur de chaque
// panneau à celle de son pied (un peu vers la caméra) : une figure n'est jamais coupée par la pente
// derrière elle et reste cachée par l'arbre devant elle. Instances triées de l'arrière vers l'avant
// à chaque image, mélange alpha, brume comprise.
//
// Une seconde InstancedMesh couche sous chaque figure son ombre au sol ; une troisième dessine, à
// travers ce qui le cache, la silhouette du Veilleur. Les étiquettes (noms sur la plaque sombre à
// filet d'or, « Glym Aqua niv. 1 », « ×2 », « ! » et « ? ») sont peintes une fois par chaîne dans un
// atlas de textes et dessinées en espace écran, sans test de profondeur, à taille constante.
//
// En combat (5.4), chaque combattant porte en plus son anneau de camp au sol (l'anneau qui pulse de
// l'acteur du tour, celui de l'élément dont il est immunisé), sa barre de vie et de bouclier au-dessus
// de la tête, ses états (étoiles, bouclier, bulle, lanterne) ; les chiffres qui montent passent par
// l'atlas des textes.
//
// Échelle : 1 px de peinture vaut 1/42 u ; un Veilleur mesure 1,7 u.
const IleFigures = (() => {
  const PX = 1 / 42;
  const MAX = 160;           // figures dessinées au plus
  const MAX_TEXTES = 96;

  // ----- Les atlas (figures, textes) : une toile, des cases, la moins vue rendue d'abord -----

  class Atlas {
    constructor(THREE, w, h, cw, ch, opts) {
      this.THREE = THREE;
      this.w = w; this.h = h; this.cw = cw; this.ch = ch;
      this.cols = Math.floor(w / cw); this.rows = Math.floor(h / ch);
      this.toile = document.createElement('canvas');
      this.toile.width = w; this.toile.height = h;
      this.g = this.toile.getContext('2d');
      this.tex = new THREE.CanvasTexture(this.toile);
      this.tex.flipY = false;
      this.tex.encoding = THREE.sRGBEncoding;
      this.tex.generateMipmaps = !(opts && opts.sansMip);
      this.tex.minFilter = opts && opts.sansMip ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
      this.tex.magFilter = THREE.LinearFilter;
      this.tex.anisotropy = 2;
      this.cases = new Map();   // clé -> { i, vu }
      this.libres = [];
      for (let i = this.cols * this.rows - 1; i >= 0; i--) this.libres.push(i);
      this.sale = false;
      this.horloge = 0;
    }
    // La case d'une clé (peinte par `peindre(g, x, y, cw, ch)` la première fois) : { u0, v0, du, dv }.
    obtenir(cle, peindre) {
      let c = this.cases.get(cle);
      if (!c) {
        let i = this.libres.pop();
        if (i == null) {
          // Plus de place : la case la moins récemment vue est rendue.
          let vieux = null;
          for (const [k, v] of this.cases) if (!vieux || v.vu < vieux[1].vu) vieux = [k, v];
          this.cases.delete(vieux[0]);
          i = vieux[1].i;
        }
        const x = (i % this.cols) * this.cw, y = Math.floor(i / this.cols) * this.ch;
        this.g.clearRect(x, y, this.cw, this.ch);
        this.g.save();
        this.g.beginPath(); this.g.rect(x, y, this.cw, this.ch); this.g.clip();
        try { peindre(this.g, x, y, this.cw, this.ch); } catch (e) { console.error(e); }
        this.g.restore();
        c = { i, x, y, u0: x / this.w, v0: y / this.h, du: this.cw / this.w, dv: this.ch / this.h };
        this.cases.set(cle, c);
        this.sale = true;
      }
      c.vu = ++this.horloge;
      return c;
    }
    envoyer() { if (this.sale) { this.tex.needsUpdate = true; this.sale = false; } }
    octets() { return this.w * this.h * 4 * (this.tex.generateMipmaps ? 1.33 : 1) + this.w * this.h * 4; }
    liberer() { this.tex.dispose(); this.toile.width = 0; this.toile.height = 0; }
  }

  // ----- Les shaders -----

  const VS_FIGURE = `
attribute vec3 pied;
attribute vec4 rect;
attribute vec4 taille;
attribute vec4 etat;
uniform float biais;
varying vec2 vUv;
varying float vAlpha;
varying float vFlash;
#include <fog_pars_vertex>
void main() {
  vec4 mvPied = modelViewMatrix * vec4(pied, 1.0);
  vec2 local = vec2((position.x - taille.z) * taille.x, (position.y - (1.0 - taille.w)) * taille.y);
  vec4 mvPosition = mvPied + vec4(local, 0.0, 0.0);
  gl_Position = projectionMatrix * mvPosition;
  vec4 p = projectionMatrix * (mvPied + vec4(0.0, 0.0, biais, 0.0));
  gl_Position.z = p.z / p.w * gl_Position.w;
  float u = etat.z < 0.0 ? 1.0 - position.x : position.x;
  vUv = vec2(rect.x + u * rect.z, rect.y + (1.0 - position.y) * rect.w);
  vAlpha = etat.x;
  vFlash = etat.y;
  #include <fog_vertex>
}`;
  const FS_FIGURE = `
uniform sampler2D atlas;
uniform vec3 teinteX;
uniform float modeX;
varying vec2 vUv;
varying float vAlpha;
varying float vFlash;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec4 c = texture2D(atlas, vUv);
  if (c.a < 0.03) discard;
  c.rgb = mix(c.rgb, vec3(1.0), vFlash);
  if (modeX > 0.5) { c.rgb = teinteX; c.a *= 0.55; }
  gl_FragColor = vec4(c.rgb, c.a * vAlpha);
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>
}`;
  const VS_BARRE = `
attribute vec3 ancre;
attribute vec4 boite;
attribute vec4 couleur;
uniform vec2 vue;
varying vec4 vCol;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(ancre, 1.0);
  vec2 px = boite.xy + (position.xy - vec2(0.5)) * boite.zw;
  p.xy += px / vue * 2.0 * p.w;
  gl_Position = p;
  vCol = couleur;
  vCol.a *= step(-p.w, p.z) * step(p.z, p.w);
}`;
  const FS_BARRE = `
varying vec4 vCol;
void main() {
  gl_FragColor = vCol;
  #include <encodings_fragment>
}`;
  // L'anneau d'un combattant, couché au sol.
  function peindreAnneau() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = 13; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#ffffff'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
    return c;
  }
  const MAX_BARRES = 72;
  const VS_TEXTE = `
attribute vec3 ancre;
attribute vec4 rect;
attribute vec4 boite;
attribute float alpha;
uniform vec2 vue;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(ancre, 1.0);
  vec2 px = boite.xy + (position.xy - vec2(0.5)) * boite.zw;
  p.xy += px / vue * 2.0 * p.w;
  gl_Position = p;
  vUv = vec2(rect.x + position.x * rect.z, rect.y + (1.0 - position.y) * rect.w);
  vAlpha = alpha * step(-p.w, p.z) * step(p.z, p.w);
}`;
  const FS_TEXTE = `
uniform sampler2D atlas;
varying vec2 vUv;
varying float vAlpha;
void main() {
  vec4 c = texture2D(atlas, vUv);
  gl_FragColor = vec4(c.rgb, c.a * vAlpha);
  #include <encodings_fragment>
}`;

  // ======================================================================

  class Figures {
    constructor(THREE, opts) {
      this.THREE = THREE;
      this.painter = opts.painter;
      this.telephone = !!opts.telephone;
      this.scene = opts.scene;
      // L'atlas des figures : 1 024 × 2 048 au téléphone, 2 048 × 2 048 ailleurs ; des cases de
      // 192 × 176 (la peinture de 176 × 168, une marge contre les débordements des niveaux de mip).
      this.atlas = new Atlas(THREE, this.telephone ? 1024 : 2048, 2048, 192, 176);
      // Les textes : 1 024 × 512 au téléphone (32 étiquettes à la fois), 2 048 × 512 ailleurs.
      this.textes = new Atlas(THREE, this.telephone ? 1024 : 2048, 512, 256, 64, { sansMip: true });
      const quad = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
      // Les figures.
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = quad.index; geo.attributes.position = quad.attributes.position; geo.attributes.uv = quad.attributes.uv;
      this.aPied = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
      this.aRect = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      this.aTaille = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      this.aEtat = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      for (const a of [this.aPied, this.aRect, this.aTaille, this.aEtat]) a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('pied', this.aPied); geo.setAttribute('rect', this.aRect); geo.setAttribute('taille', this.aTaille); geo.setAttribute('etat', this.aEtat);
      geo.instanceCount = 0;
      const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { atlas: { value: null }, biais: { value: 0.9 }, teinteX: { value: new THREE.Color('#9fe8ff') }, modeX: { value: 0 } }]);
      this.mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VS_FIGURE, fragmentShader: FS_FIGURE, transparent: true, depthWrite: false, fog: true });
      this.mat.uniforms.atlas.value = this.atlas.tex;
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 10;
      // La silhouette du Veilleur derrière ce qui le cache : le même panneau, dessiné là où le
      // test de profondeur échoue, en bleu pâle.
      const geoX = new THREE.InstancedBufferGeometry();
      geoX.index = quad.index; geoX.attributes.position = quad.attributes.position;
      this.xPied = new THREE.InstancedBufferAttribute(new Float32Array(3), 3);
      this.xRect = new THREE.InstancedBufferAttribute(new Float32Array(4), 4);
      this.xTaille = new THREE.InstancedBufferAttribute(new Float32Array(4), 4);
      this.xEtat = new THREE.InstancedBufferAttribute(new Float32Array(4), 4);
      for (const [n, a] of [['pied', this.xPied], ['rect', this.xRect], ['taille', this.xTaille], ['etat', this.xEtat]]) { a.setUsage(THREE.DynamicDrawUsage); geoX.setAttribute(n, a); }
      geoX.instanceCount = 0;
      this.matX = this.mat.clone();
      this.matX.uniforms.atlas.value = this.atlas.tex;
      this.matX.uniforms.modeX.value = 1;
      this.matX.depthFunc = THREE.GreaterDepth;
      this.meshX = new THREE.Mesh(geoX, this.matX);
      this.meshX.frustumCulled = false;
      this.meshX.renderOrder = 11;
      // Les ombres au sol.
      const plan = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.texOmbre = new THREE.CanvasTexture(IlePeinture.ombre());
      this.matOmbre = new THREE.MeshBasicMaterial({ map: this.texOmbre, transparent: true, depthWrite: false, opacity: 0.5, color: 0x1a1e2a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, fog: true });
      this.ombres = new THREE.InstancedMesh(plan, this.matOmbre, MAX);
      this.ombres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.ombres.count = 0;
      this.ombres.frustumCulled = false;
      this.ombres.renderOrder = 5;
      // Les textes.
      const geoT = new THREE.InstancedBufferGeometry();
      geoT.index = quad.index; geoT.attributes.position = quad.attributes.position;
      this.aAncre = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TEXTES * 3), 3);
      this.aRectT = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TEXTES * 4), 4);
      this.aBoite = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TEXTES * 4), 4);
      this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(MAX_TEXTES), 1);
      for (const a of [this.aAncre, this.aRectT, this.aBoite, this.aAlpha]) a.setUsage(THREE.DynamicDrawUsage);
      geoT.setAttribute('ancre', this.aAncre); geoT.setAttribute('rect', this.aRectT); geoT.setAttribute('boite', this.aBoite); geoT.setAttribute('alpha', this.aAlpha);
      geoT.instanceCount = 0;
      this.matT = new THREE.ShaderMaterial({ uniforms: { atlas: { value: this.textes.tex }, vue: { value: new THREE.Vector2(1, 1) } }, vertexShader: VS_TEXTE, fragmentShader: FS_TEXTE, transparent: true, depthTest: false, depthWrite: false });
      this.textesMesh = new THREE.Mesh(geoT, this.matT);
      this.textesMesh.frustumCulled = false;
      this.textesMesh.renderOrder = 20;
      // Les anneaux des combattants : le camp (mélange), l'acteur du tour (additif).
      this.texAnneau = new THREE.CanvasTexture(peindreAnneau());
      this.texAnneau.encoding = THREE.sRGBEncoding;
      const planA = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.matAnneaux = new THREE.MeshBasicMaterial({ map: this.texAnneau, transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, fog: false });
      this.matAnneauxL = new THREE.MeshBasicMaterial({ map: this.texAnneau, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, fog: false });
      const blanc = new THREE.Color(1, 1, 1);
      this.anneaux = new THREE.InstancedMesh(planA, this.matAnneaux, 48);
      this.anneauxL = new THREE.InstancedMesh(planA, this.matAnneauxL, 24);
      for (const a of [this.anneaux, this.anneauxL]) { a.instanceMatrix.setUsage(THREE.DynamicDrawUsage); a.setColorAt(0, blanc); a.instanceColor.setUsage(THREE.DynamicDrawUsage); a.count = 0; a.frustumCulled = false; a.renderOrder = 6; }
      // Les barres de vie : des rectangles à taille constante à l'écran.
      const geoB = new THREE.InstancedBufferGeometry();
      geoB.index = quad.index; geoB.attributes.position = quad.attributes.position;
      this.bAncre = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARRES * 3), 3);
      this.bBoite = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARRES * 4), 4);
      this.bCouleur = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARRES * 4), 4);
      for (const a of [this.bAncre, this.bBoite, this.bCouleur]) a.setUsage(THREE.DynamicDrawUsage);
      geoB.setAttribute('ancre', this.bAncre); geoB.setAttribute('boite', this.bBoite); geoB.setAttribute('couleur', this.bCouleur);
      geoB.instanceCount = 0;
      this.matB = new THREE.ShaderMaterial({ uniforms: { vue: this.matT.uniforms.vue }, vertexShader: VS_BARRE, fragmentShader: FS_BARRE, transparent: true, depthTest: false, depthWrite: false });
      this.barres = new THREE.Mesh(geoB, this.matB);
      this.barres.frustumCulled = false;
      this.barres.renderOrder = 19;
      this.groupe = new THREE.Group();
      this.groupe.add(this.ombres, this.anneaux, this.anneauxL, this.mesh, this.meshX, this.barres, this.textesMesh);
      this.traces = new Map();      // nid du groupe -> trace de ses positions
      this.rects = [];              // les rectangles à l'écran de la dernière image (sélection)
      this.dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._n = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
    }

    // ----- Peindre une figure (les clés et les gestes de RendererGL) -----

    peindreFigure(s) {
      const pt = this.painter;
      return (g, x, y, cw, ch) => {
        const OS = 2;
        g.translate(x + (cw - 176) / 2, y + (ch - 168) / 2);
        g.scale(OS, OS); g.lineJoin = 'round'; g.lineCap = 'round';
        if (s.kind === 'npc') pt.drawNpc(g, { x: 44, y: 76 }, Object.assign({}, s, { bob: 0, phase: 0 }), 0);
        else if (s.kind === 'node') pt.drawNode(g, { x: 44, y: 76 }, Object.assign({}, s, { ready: true }));
        else {
          pt.drawBody(g, { x: 44, y: 76 }, s);
          if (s.motif) pt.drawMotif(g, { x: 44, y: 76 }, s);
          if (s.noyau && typeof Paint === 'object' && Paint.noyau) Paint.noyau(g, { x: 44, y: 76 }, s);
        }
      };
    }

    cleFigure(s) {
      if (s.kind === 'npc') return `npc|${s.look}`;
      if (s.kind === 'node') return `node|${s.nodeKind}`;
      const hero = s.shape === 'player' ? '|' + Renderer.heroKey(s) : '';
      const allure = typeof s.look === 'string' ? s.look : '';
      return `body|${s.shape}|${allure}|${s.color}|${s.glyph || ''}|${s.motif || ''}|${s.noyau || ''}|${s.team}|${s.flash ? 1 : 0}${hero}`;
    }

    // ----- Peindre un texte -----

    texte(cle, sorte, chaine, couleur) {
      return this.textes.obtenir(cle, (g, x, y, cw, ch) => {
        const k = 2;
        g.translate(x, y);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (sorte === 'icone') {
          // Une icône d'état, dans le carré de gauche de la case (64 × 64).
          const ic = chaine === 'etoile' ? Paint.star() : chaine === 'armure' ? Paint.shieldIcon() : chaine === 'bulle' ? Paint.bubble() : Paint.lanternIcon({ lantern: '#ffcf70' });
          const f = Math.min(64 / ic.width, 64 / ic.height);
          if (chaine === 'bulle') g.drawImage(ic, 0, 0, 64, 64);
          else g.drawImage(ic, (64 - ic.width * f) / 2, (64 - ic.height * f) / 2, ic.width * f, ic.height * f);
        } else if (sorte === 'chiffre') {
          // Un chiffre qui monte (dégâts, soins, PA, esquive) : gras, cerné de sombre.
          g.font = `800 ${18 * k}px Inter, "Segoe UI", system-ui, sans-serif`;
          g.lineWidth = 4 * k; g.lineJoin = 'round'; g.strokeStyle = '#0b0f18'; g.strokeText(chaine, cw / 2, ch / 2);
          g.fillStyle = couleur || '#ffffff'; g.fillText(chaine, cw / 2, ch / 2);
        } else if (sorte === 'nom' || sorte === 'ennemi') {
          g.font = `600 ${11 * k}px Inter, "Segoe UI", system-ui, sans-serif`;
          const w = Math.min(cw - 4, g.measureText(chaine).width + 12 * k), h = 15 * k;
          const x0 = (cw - w) / 2, y0 = (ch - h) / 2;
          g.beginPath();
          if (g.roundRect) g.roundRect(x0, y0, w, h, 4 * k); else g.rect(x0, y0, w, h);
          g.fillStyle = 'rgba(9,13,22,0.74)'; g.fill();
          g.lineWidth = 1.2 * k; g.strokeStyle = sorte === 'ennemi' ? 'rgba(240,122,92,0.6)' : 'rgba(201,166,107,0.6)'; g.stroke();
          g.fillStyle = '#f2e2c9'; g.fillText(chaine, cw / 2, ch / 2 + 0.5 * k);
        } else if (sorte === 'marque') {
          g.font = `800 ${22 * k}px Inter, "Segoe UI", system-ui, sans-serif`;
          g.lineWidth = 4.5 * k; g.strokeStyle = '#0b0f18'; g.strokeText(chaine, cw / 2, ch / 2);
          g.fillStyle = chaine === '!' ? '#f2b134' : '#8db585'; g.fillText(chaine, cw / 2, ch / 2);
        } else {
          g.font = `800 ${11 * k}px Inter, "Segoe UI", system-ui, sans-serif`;
          g.lineWidth = 4 * k; g.strokeStyle = '#0b0f18'; g.strokeText(chaine, cw / 2, ch / 2);
          g.fillStyle = '#ffffff'; g.fillText(chaine, cw / 2, ch / 2);
        }
      });
    }
    largeurTexte(sorte, chaine) {
      if (!this._mes) { this._mes = document.createElement('canvas').getContext('2d'); }
      const g = this._mes;
      if (sorte === 'marque') return 32;
      g.font = sorte === 'badge' ? '800 11px Inter, sans-serif' : '600 11px Inter, sans-serif';
      return Math.min(126, g.measureText(chaine).width + (sorte === 'badge' ? 8 : 14));
    }

    // ----- Les membres d'un groupe : en file lâche derrière le premier -----

    membres(g, now) {
      let t = this.traces.get(g.nid);
      if (!t) { t = { pts: [], graine: IleTerrain.M.cle(g.nid || String(g.idx)) }; this.traces.set(g.nid, t); }
      const p = t.pts;
      if (!p.length || Math.hypot(p[0][0] - g.rx, p[0][1] - g.ry) > 0.12) {
        p.unshift([g.rx, g.ry]);
        if (p.length > 80) p.length = 80;
      }
      const out = [];
      const n = Math.min(4, g.monsters.length);
      for (let k = 0; k < n; k++) {
        if (k === 0) { out.push([g.rx, g.ry]); continue; }
        // À 1,2 u l'un de l'autre le long de la trace ; sans trace, en arc derrière.
        let reste = 1.2 * k, x = null, y = null;
        for (let i = 0; i + 1 < p.length; i++) {
          const d = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
          if (d >= reste) { const f = reste / (d || 1); x = p[i][0] + (p[i + 1][0] - p[i][0]) * f; y = p[i][1] + (p[i + 1][1] - p[i][1]) * f; break; }
          reste -= d;
        }
        const h = IleTerrain.M.hache(t.graine, k, 3), a = 2.4 + k * 1.1 + h * 0.8;
        if (x == null) { x = g.rx + Math.cos(a) * 1.2 * Math.sqrt(k); y = g.ry + Math.sin(a) * 1.2 * Math.sqrt(k); }
        else { x += (h - 0.5) * 0.5; y += (IleTerrain.M.hache(t.graine, k, 4) - 0.5) * 0.5; }
        out.push([x, y]);
      }
      return out;
    }

    // ----- Chaque image -----
    // `sprites` : [{ kind, x, y, h, scale, alpha, flash, facing (±1 ou diagonale), cle, peindre,
    // cible, label, labelSorte, quest, badge, bob, joueur }] ; `cam` : la CameraIle.
    maj(sprites, cam, now, extras) {
      const THREE = this.THREE;
      const camera = cam.courante || cam.cam, camPos = camera.position;
      // De l'arrière vers l'avant (profondeur dans la vue décroissante : vaut pour la perspective
      // comme pour l'orthographique du combat).
      const fwd = this._v.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const fx = fwd.x, fy = fwd.y, fz = fwd.z;
      for (const s of sprites) s._d = (s.x - camPos.x) * fx + (s.h - camPos.y) * fy + (s.y - camPos.z) * fz;
      sprites.sort((a, b) => b._d - a._d);
      const n = Math.min(MAX, sprites.length);
      let joueur = -1;
      this.rects = [];
      const ppuCache = cam.pixelsParU(cam.cible.x, cam.cible.h, cam.cible.y);
      for (let i = 0; i < n; i++) {
        const s = sprites[i];
        const c = this.atlas.obtenir(s.cle, s.peindre);
        const k = s.scale || 1;
        const w = 88 * PX * k, h = 84 * PX * k;
        const lift = (s.bob || 0) * PX;
        this.aPied.setXYZ(i, s.x, s.h + lift, s.y);
        // La case de 192 × 176 contient la peinture de 176 × 168 en son milieu.
        const ox = (192 - 176) / 2 / this.atlas.w, oy = (176 - 168) / 2 / this.atlas.h;
        this.aRect.setXYZW(i, c.u0 + ox, c.v0 + oy, 176 / this.atlas.w, 168 / this.atlas.h);
        this.aTaille.setXYZW(i, w, h, 0.5, 76 / 84);
        this.aEtat.setXYZW(i, s.alpha == null ? 1 : s.alpha, s.flash ? 0.8 : 0, typeof s.facing === 'number' ? s.facing : 1, 0);
        if (s.joueur) joueur = i;
        // L'ombre au sol, couchée sur la pente.
        const nrm = s.normale || [0, 1, 0];
        this._n.set(nrm[0], nrm[1], nrm[2]);
        this._q.setFromUnitVectors(this._up, this._n);
        const r = (s.kind === 'node' ? 0.7 : 0.95) * k;
        this._m.compose(this._v.set(s.x, s.h + 0.04, s.y), this._q, this._s.set(r * 1.25, 1, r));
        this.ombres.setMatrixAt(i, this._m);
        // Le rectangle à l'écran, pour la sélection (agrandi à 44 px de côté au doigt).
        const p = cam.versEcran(s.x, s.h, s.y);
        if (p.devant) {
          const ppu = cam.pixelsParU(s.x, s.h, s.y);
          const W = w * ppu, H = h * ppu;
          this.rects.push({ s, x: p.x, y: p.y, w: W, h: H, z: p.z });
        }
        void ppuCache;
      }
      this.aPied.needsUpdate = this.aRect.needsUpdate = this.aTaille.needsUpdate = this.aEtat.needsUpdate = true;
      this.mesh.geometry.instanceCount = n;
      this.ombres.count = n;
      this.ombres.instanceMatrix.needsUpdate = true;
      // La silhouette : seulement le Veilleur, son panneau recopié.
      if (joueur >= 0) {
        const cp = (a, b, k) => { for (let q = 0; q < k; q++) b.array[q] = a.array[joueur * k + q]; b.needsUpdate = true; };
        cp(this.aPied, this.xPied, 3); cp(this.aRect, this.xRect, 4); cp(this.aTaille, this.xTaille, 4); cp(this.aEtat, this.xEtat, 4);
        this.meshX.geometry.instanceCount = 1;
      } else this.meshX.geometry.instanceCount = 0;
      this.atlas.envoyer();
      this.majCombat(sprites.slice(0, n), cam, now);
      this.majTextes(sprites.slice(0, n), cam, now, extras);
    }

    // Les anneaux et les barres des combattants (les sprites qui portent `combat`), à la manière
    // de RendererGL.updateEntities.
    majCombat(sprites, cam, now) {
      let na = 0, nl = 0, nb = 0;
      const blanc = this._c || (this._c = new this.THREE.Color());
      const anneau = (mesh, i, s, r, couleur, f) => {
        const nrm = s.normale || [0, 1, 0];
        this._n.set(nrm[0], nrm[1], nrm[2]);
        this._q.setFromUnitVectors(this._up, this._n);
        this._m.compose(this._v.set(s.x, s.h + 0.05, s.y), this._q, this._s.set(r, 1, r));
        mesh.setMatrixAt(i, this._m);
        blanc.set(couleur);
        if (f != null) blanc.multiplyScalar(f);
        mesh.setColorAt(i, blanc);
      };
      const barre = (s, dx, dy, w, h, couleur, a) => {
        if (nb >= MAX_BARRES) return;
        const k = s.scale || 1;
        this.bAncre.setXYZ(nb, s.x, s.h + 1.86 * k, s.y);
        this.bBoite.setXYZW(nb, dx, dy, w, h);
        blanc.set(couleur);
        this.bCouleur.setXYZW(nb, blanc.r, blanc.g, blanc.b, a * (s.alpha == null ? 1 : s.alpha));
        nb++;
      };
      for (const s of sprites) {
        const c = s.combat;
        if (!c) continue;
        const k = s.scale || 1;
        if (na < 48) anneau(this.anneaux, na++, s, 0.98 * k, c.equipe === 'player' ? '#4a90ff' : '#ff5a5a');
        if (c.immun && na < 48) anneau(this.anneaux, na++, s, 1.16 * k, c.immun);
        if (c.actif && nl < 24) { const p = 0.5 + 0.5 * Math.sin(now / 180); anneau(this.anneauxL, nl++, s, (1.18 + p * 0.12) * k, '#ffffff', 0.35 + 0.45 * p); }
        // La barre : un fond sombre, la vie, le bouclier au-dessus.
        const hp = Math.max(0, Math.min(1, c.hp)), dy = 8;
        barre(s, 0, dy, 40, 7, '#0a0d14', 0.85);
        if (hp > 0) barre(s, -18 + 18 * hp, dy, 36 * hp, 5, c.equipe === 'player' ? (hp <= 0.25 ? '#f07a5c' : '#8db585') : '#f07a5c', 1);
        if (c.bouclier > 0) { const b = Math.min(1, c.bouclier); barre(s, -18 + 18 * b, dy + 4.5, 36 * b, 2, '#dff3ff', 1); }
      }
      this.anneaux.count = na; this.anneauxL.count = nl;
      for (const a of [this.anneaux, this.anneauxL]) { a.instanceMatrix.needsUpdate = true; if (a.instanceColor) a.instanceColor.needsUpdate = true; }
      this.bAncre.needsUpdate = this.bBoite.needsUpdate = this.bCouleur.needsUpdate = true;
      this.barres.geometry.instanceCount = nb;
    }

    // Les noms sous les pieds, les marques de quête au-dessus de la tête, le nombre de monstres d'un
    // groupe près d'elle ; à taille constante, effacés au-delà de 22 u du point visé (le champ le
    // plus large en montrerait trop).
    majTextes(sprites, cam, now, extras) {
      const items = [];
      const c0 = cam.vise || cam.cible;
      // La boîte du Veilleur à l'écran : le nom d'un groupe qui tomberait dessus (sous les pieds du
      // premier monstre) passe au-dessus de sa tête.
      const v = sprites.find(s => s.joueur);
      let boiteV = null;
      if (v) {
        const pf = cam.versEcran(v.x, v.h, v.y), ph = cam.versEcran(v.x, v.h + 1.8, v.y), lv = Math.max(14, (pf.y - ph.y) * 0.45);
        if (pf.devant) boiteV = { x0: pf.x - lv, x1: pf.x + lv, y0: ph.y - 8, y1: pf.y + 6 };
      }
      const surVeilleur = s => {
        if (!boiteV) return false;
        const a = cam.versEcran(s.x, s.h, s.y), cy = a.y + 22;
        return a.x + 64 > boiteV.x0 && a.x - 64 < boiteV.x1 && cy + 14 > boiteV.y0 && cy - 14 < boiteV.y1;
      };
      for (const s of sprites) {
        const d = Math.hypot(s.x - c0.x, s.y - c0.y);
        const a = 1 - Math.max(0, Math.min(1, (d - 22) / 8));
        if (a <= 0.02) continue;
        const k = s.scale || 1;
        const tete = s.h + 1.8 * k;
        if (s.label) {
          if (s.labelSorte === 'ennemi' && surVeilleur(s)) items.push({ x: s.x, y: tete, z: s.y, dy: s.badge ? 30 : 16, sorte: 'ennemi', texte: s.label, a });
          else items.push({ x: s.x, y: s.h, z: s.y, dy: -22, sorte: s.labelSorte || 'nom', texte: s.label, a });
        }
        if (s.quest) items.push({ x: s.x, y: tete, z: s.y, dy: 14 + Math.sin(now / 300) * 2, sorte: 'marque', texte: s.quest, a: Math.max(a, 0.6) });
        if (s.badge) items.push({ x: s.x, y: tete - 0.3, z: s.y, dy: 2, dx: 18, sorte: 'badge', texte: s.badge, a });
        // Les états d'un combattant (comme RendererGL.updateStates) : étoiles qui tournent (sonné),
        // bouclier (armure), bulle (invulnérable), lanterne.
        const c = s.combat;
        if (c) {
          const al = s.alpha == null ? 1 : s.alpha, ppu = cam.pixelsParU(s.x, s.h, s.y) * PX * k;
          if (c.sonne) for (let i = 0; i < 3; i++) { const an = now / 300 + i * 2.094; items.push({ x: s.x, y: tete, z: s.y, dx: Math.cos(an) * 14, dy: 20 + Math.sin(an) * 4, w: 15, h: 15, sorte: 'icone', texte: 'etoile', a: al }); }
          if (c.armure) items.push({ x: s.x, y: tete, z: s.y, dx: 26, dy: 4, w: 17, h: 17, sorte: 'icone', texte: 'armure', a: al });
          if (c.invuln) items.push({ x: s.x, y: s.h, z: s.y, dx: 0, dy: 20 * ppu, w: 58 * ppu, h: 66 * ppu, sorte: 'icone', texte: 'bulle', a: al * (0.8 + 0.15 * Math.sin(now / 400)) });
          if (c.lanterne) items.push({ x: s.x, y: s.h, z: s.y, dx: -18 * ppu, dy: 30 * ppu, w: 20, h: 20, sorte: 'icone', texte: 'lanterne', a: al });
        }
      }
      for (const it of extras || []) items.push(it);
      // Les noms et les marques (pas les chiffres ni les états d'un combat) : jamais sous un rectangle
      // de l'interface (Ile3D.mesurerHUD), et deux plaques de noms qui se chevaucheraient s'écartent,
      // la seconde descendant de 14 px (revue finale : les étiquettes passaient sous la barre de menu).
      const zones = this.zonesHUD || [], poses = [];
      const gardes = [];
      for (const it of items) {
        if (!(it.sorte === 'nom' || it.sorte === 'ennemi' || it.sorte === 'badge' || it.sorte === 'marque')) { gardes.push(it); continue; }
        const p = cam.versEcran(it.x, it.y, it.z);
        if (!p.devant) continue;
        const w = it.w || (it.sorte === 'marque' ? 32 : this.largeurTexte(it.sorte, it.texte)), h = it.h || (it.sorte === 'marque' ? 32 : 22);
        let dy = it.dy || 0;
        const boite = () => ({ x0: p.x + (it.dx || 0) - w / 2, y0: p.y - dy - h / 2, x1: p.x + (it.dx || 0) + w / 2, y1: p.y - dy + h / 2 });
        const croise = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
        let b = boite();
        if (zones.some(z => croise(b, z))) continue;
        if (it.sorte === 'nom' || it.sorte === 'ennemi') {
          for (let k = 0; k < 3 && poses.some(q => croise(b, q)); k++) { dy -= 14; b = boite(); }
          if (poses.some(q => croise(b, q))) continue;
          poses.push(b);
        }
        gardes.push(dy === (it.dy || 0) ? it : Object.assign({}, it, { dy }));
      }
      items.length = 0;
      for (const it of gardes) items.push(it);
      const n = Math.min(MAX_TEXTES, items.length);
      for (let i = 0; i < n; i++) {
        const it = items[i];
        const c = this.texte(`${it.sorte}|${it.texte}|${it.couleur || ''}`, it.sorte, it.texte, it.couleur);
        const kk = it.k || 1;
        this.aAncre.setXYZ(i, it.x, it.y, it.z);
        // Une icône occupe le carré de gauche de sa case.
        if (it.sorte === 'icone') this.aRectT.setXYZW(i, c.u0, c.v0, c.du / 4, c.dv);
        else this.aRectT.setXYZW(i, c.u0, c.v0, c.du, c.dv);
        this.aBoite.setXYZW(i, it.dx || 0, it.dy || 0, (it.w || 128) * kk, (it.h || 32) * kk);
        this.aAlpha.setX(i, it.a);
      }
      this.aAncre.needsUpdate = this.aRectT.needsUpdate = this.aBoite.needsUpdate = this.aAlpha.needsUpdate = true;
      this.textesMesh.geometry.instanceCount = n;
      this.matT.uniforms.vue.value.set(cam.vw || 1, cam.vh || 1);
      this.textes.envoyer();
    }

    octets() { return this.atlas.octets() + this.textes.octets(); }

    liberer() {
      this.atlas.liberer(); this.textes.liberer(); this.texOmbre.dispose(); this.texAnneau.dispose();
      for (const m of [this.mesh, this.meshX, this.textesMesh, this.barres]) m.geometry.dispose();
      this.ombres.dispose(); this.anneaux.dispose(); this.anneauxL.dispose();
      for (const m of [this.mat, this.matX, this.matT, this.matOmbre, this.matAnneaux, this.matAnneauxL, this.matB]) m.dispose();
    }
  }

  return { Figures, Atlas, PX };
})();
