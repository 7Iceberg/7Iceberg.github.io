const IleFigures = (() => {
  const PX = 1 / 42;
  const MAX = 160;
  const MAX_TEXTES = 96;


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
      this.cases = new Map();
      this.libres = [];
      for (let i = this.cols * this.rows - 1; i >= 0; i--) this.libres.push(i);
      this.sale = false;
      this.horloge = 0;
    }
    obtenir(cle, peindre) {
      let c = this.cases.get(cle);
      if (!c) {
        let i = this.libres.pop();
        if (i == null) {
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
uniform vec3 lumiereFig;
varying vec2 vUv;
varying float vAlpha;
varying float vFlash;
#include <common>
#include <fog_pars_fragment>
void main() {
  vec4 c = texture2D(atlas, vUv);
  if (c.a < 0.03) discard;
  c.rgb = mix(c.rgb * lumiereFig, vec3(1.0), vFlash);
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
attribute vec4 jauge;
uniform vec2 vue;
varying vec4 vCol;
varying vec4 vJauge;
varying vec2 vUv;
varying vec2 vTaille;
void main() {
  vec4 p = projectionMatrix * modelViewMatrix * vec4(ancre, 1.0);
  vec2 px = boite.xy + (position.xy - vec2(0.5)) * boite.zw;
  p.xy += px / vue * 2.0 * p.w;
  gl_Position = p;
  vCol = couleur;
  vCol.a *= step(-p.w, p.z) * step(p.z, p.w);
  vJauge = jauge;
  vUv = position.xy;
  vTaille = boite.zw;
}`;
  const FS_BARRE = `
varying vec4 vCol;
varying vec4 vJauge;
varying vec2 vUv;
varying vec2 vTaille;
void main() {
  vec2 px = (vUv - 0.5) * vTaille;
  float r = vTaille.y * 0.5;
  vec2 q = abs(px) - (vTaille * 0.5 - r);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  float pilule = 1.0 - smoothstep(-0.6, 0.6, d);
  float dedans = 1.0 - smoothstep(-0.6, 0.6, d + 1.1);
  float liseret = pilule - dedans;
  vec3 col = vec3(0.03, 0.045, 0.075);
  col = mix(col, vCol.rgb * (0.55 + 0.35 * vJauge.w), liseret);
  float x = vUv.x;
  float vie = step(x, vJauge.x) * dedans;
  float trace = step(vJauge.x, x) * step(x, vJauge.z) * dedans;
  float haut = smoothstep(0.3, 1.0, vUv.y);
  vec3 cvie = vCol.rgb * (0.72 + 0.55 * haut) + 0.14 * smoothstep(0.78, 0.96, vUv.y);
  col = mix(col, cvie, vie);
  col = mix(col, vec3(0.96, 0.6, 0.5), trace * 0.78);
  float bouclier = step(x, vJauge.y) * step(0.58, vUv.y) * dedans;
  col = mix(col, vec3(0.85, 0.96, 1.0), bouclier * 0.92);
  float tq = abs(fract(x * 4.0 + 0.5) - 0.5) * vTaille.x * 0.25;
  float rep = (1.0 - smoothstep(0.3, 0.9, tq)) * vie * step(0.02, x) * step(x, 0.98);
  col = mix(col, col * 0.5, rep);
  gl_FragColor = vec4(col, pilule * vCol.a);
  #include <encodings_fragment>
}`;
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


  class Figures {
    constructor(THREE, opts) {
      this.THREE = THREE;
      this.painter = opts.painter;
      this.telephone = !!opts.telephone;
      this.scene = opts.scene;
      this.atlas = new Atlas(THREE, this.telephone ? 1024 : 2048, this.telephone ? 1024 : 2048, 192, 176);
      this.textes = new Atlas(THREE, this.telephone ? 1024 : 2048, 512, 256, 64, { sansMip: true });
      const quad = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
      const geo = new THREE.InstancedBufferGeometry();
      geo.index = quad.index; geo.attributes.position = quad.attributes.position; geo.attributes.uv = quad.attributes.uv;
      this.aPied = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
      this.aRect = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      this.aTaille = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      this.aEtat = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);
      for (const a of [this.aPied, this.aRect, this.aTaille, this.aEtat]) a.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('pied', this.aPied); geo.setAttribute('rect', this.aRect); geo.setAttribute('taille', this.aTaille); geo.setAttribute('etat', this.aEtat);
      geo.instanceCount = 0;
      const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { atlas: { value: null }, biais: { value: 0.9 }, teinteX: { value: new THREE.Color('#9fe8ff') }, modeX: { value: 0 }, lumiereFig: { value: new THREE.Color(1, 1, 1) } }]);
      this.mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VS_FIGURE, fragmentShader: FS_FIGURE, transparent: true, depthWrite: false, fog: true });
      this.mat.uniforms.atlas.value = this.atlas.tex;
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 10;
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
      const plan = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.texOmbre = new THREE.CanvasTexture(IlePeinture.ombre());
      this.matOmbre = new THREE.MeshBasicMaterial({ map: this.texOmbre, transparent: true, depthWrite: false, opacity: 0.5, color: 0x1a1e2a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, fog: true });
      this.ombres = new THREE.InstancedMesh(plan, this.matOmbre, MAX);
      this.ombres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.ombres.count = 0;
      this.ombres.frustumCulled = false;
      this.ombres.renderOrder = 5;
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
      this.texAnneau = new THREE.CanvasTexture(peindreAnneau());
      this.texAnneau.encoding = THREE.sRGBEncoding;
      const planA = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.matAnneaux = new THREE.MeshBasicMaterial({ map: this.texAnneau, transparent: true, depthWrite: false, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, fog: false });
      this.matAnneauxL = new THREE.MeshBasicMaterial({ map: this.texAnneau, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, fog: false });
      const blanc = new THREE.Color(1, 1, 1);
      this.anneaux = new THREE.InstancedMesh(planA, this.matAnneaux, 48);
      this.anneauxL = new THREE.InstancedMesh(planA, this.matAnneauxL, 24);
      for (const a of [this.anneaux, this.anneauxL]) { a.instanceMatrix.setUsage(THREE.DynamicDrawUsage); a.setColorAt(0, blanc); a.instanceColor.setUsage(THREE.DynamicDrawUsage); a.count = 0; a.frustumCulled = false; a.renderOrder = 6; }
      const geoB = new THREE.InstancedBufferGeometry();
      geoB.index = quad.index; geoB.attributes.position = quad.attributes.position;
      this.bAncre = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARRES * 3), 3);
      this.bBoite = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARRES * 4), 4);
      this.bCouleur = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARRES * 4), 4);
      this.bJauge = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BARRES * 4), 4);
      for (const a of [this.bAncre, this.bBoite, this.bCouleur, this.bJauge]) a.setUsage(THREE.DynamicDrawUsage);
      geoB.setAttribute('ancre', this.bAncre); geoB.setAttribute('boite', this.bBoite); geoB.setAttribute('couleur', this.bCouleur); geoB.setAttribute('jauge', this.bJauge);
      geoB.instanceCount = 0;
      this.matB = new THREE.ShaderMaterial({ uniforms: { vue: this.matT.uniforms.vue }, vertexShader: VS_BARRE, fragmentShader: FS_BARRE, transparent: true, depthTest: false, depthWrite: false });
      this.barres = new THREE.Mesh(geoB, this.matB);
      this.barres.frustumCulled = false;
      this.barres.renderOrder = 19;
      this.groupe = new THREE.Group();
      this.groupe.add(this.ombres, this.anneaux, this.anneauxL, this.mesh, this.meshX, this.barres, this.textesMesh);
      this.traces = new Map();
      this.rects = [];
      this.dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._n = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
    }


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


    texte(cle, sorte, chaine, couleur) {
      return this.textes.obtenir(cle, (g, x, y, cw, ch) => {
        const k = sorte === 'nom' || sorte === 'ennemi' ? 256 / Figures.boiteTexte(this.largeurTexte(sorte, chaine)) : 2;
        g.translate(x, y);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        if (sorte === 'icone') {
          const ic = chaine === 'etoile' ? Paint.star() : chaine === 'armure' ? Paint.shieldIcon() : chaine === 'bulle' ? Paint.bubble() : Paint.lanternIcon({ lantern: '#ffcf70' });
          const f = Math.min(64 / ic.width, 64 / ic.height);
          if (chaine === 'bulle') g.drawImage(ic, 0, 0, 64, 64);
          else g.drawImage(ic, (64 - ic.width * f) / 2, (64 - ic.height * f) / 2, ic.width * f, ic.height * f);
        } else if (sorte === 'chiffre') {
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
      return Math.min(sorte === 'badge' ? 126 : 240, g.measureText(chaine).width + (sorte === 'badge' ? 8 : 14));
    }
    static boiteTexte(w) { return Math.max(128, Math.min(240, Math.ceil(w))); }


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

    maj(sprites, cam, now, extras) {
      const THREE = this.THREE;
      const camera = cam.courante || cam.cam, camPos = camera.position;
      const fwd = this._v.set(0, 0, -1).applyQuaternion(camera.quaternion);
      const fx = fwd.x, fy = fwd.y, fz = fwd.z;
      for (const s of sprites) s._d = (s.x - camPos.x) * fx + (s.h - camPos.y) * fy + (s.y - camPos.z) * fz;
      sprites.sort((a, b) => b._d - a._d);
      const n = Math.min(MAX, sprites.length);
      let joueur = -1;
      this.rects = [];
      const ppuCache = cam.pixelsParU(cam.cible.x, cam.cible.h, cam.cible.y);
      const Mo = this.modeles, He = this.heros;
      if (Mo) Mo.debut(now, camera);
      if (He) He.debut(now, camera);
      for (let i = 0; i < n; i++) {
        const s = sprites[i];
        const porteur = Mo && s.modele ? Mo : He && s.heros ? He : null;
        const modele = !!(porteur && porteur.poser(s));
        const c = modele ? null : this.atlas.obtenir(s.cle, s.peindre);
        const k = s.scale || 1;
        const w = 88 * PX * k, h = 84 * PX * k;
        const lift = (s.bob || 0) * PX;
        this.aPied.setXYZ(i, s.x, s.h + lift, s.y);
        const ox = (192 - 176) / 2 / this.atlas.w, oy = (176 - 168) / 2 / this.atlas.h;
        if (modele) this.aRect.setXYZW(i, 0, 0, 0, 0);
        else this.aRect.setXYZW(i, c.u0 + ox, c.v0 + oy, 176 / this.atlas.w, 168 / this.atlas.h);
        this.aTaille.setXYZW(i, modele ? 0 : w, modele ? 0 : h, 0.5, 76 / 84);
        this.aEtat.setXYZW(i, s.alpha == null ? 1 : s.alpha, s.flash ? 0.8 : 0, typeof s.facing === 'number' ? s.facing : 1, 0);
        if (s.joueur) joueur = i;
        const nrm = s.normale || [0, 1, 0];
        this._n.set(nrm[0], nrm[1], nrm[2]);
        this._q.setFromUnitVectors(this._up, this._n);
        const r = (s.kind === 'node' ? 0.7 : 0.95) * k;
        if (modele) { const rm = porteur.emprise(s) * 0.62; this._m.compose(this._v.set(s.x, s.h + 0.04, s.y), this._q, this._s.set(rm, 1, rm)); }
        else this._m.compose(this._v.set(s.x, s.h + 0.04, s.y), this._q, this._s.set(r * 1.25, 1, r));
        this.ombres.setMatrixAt(i, this._m);
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
      if (joueur >= 0) {
        const cp = (a, b, k) => { for (let q = 0; q < k; q++) b.array[q] = a.array[joueur * k + q]; b.needsUpdate = true; };
        cp(this.aPied, this.xPied, 3); cp(this.aRect, this.xRect, 4); cp(this.aTaille, this.xTaille, 4); cp(this.aEtat, this.xEtat, 4);
        this.meshX.geometry.instanceCount = 1;
      } else this.meshX.geometry.instanceCount = 0;
      if (Mo) Mo.fin();
      if (He) He.fin();
      this.atlas.envoyer();
      this.majCombat(sprites.slice(0, n), cam, now);
      this.majTextes(sprites.slice(0, n), cam, now, extras);
    }

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
      const barre = (s, dx, dy, w, h, couleur, a, jauge) => {
        if (nb >= MAX_BARRES) return;
        const k = s.scale || 1;
        this.bAncre.setXYZ(nb, s.x, s.h + 1.86 * k, s.y);
        this.bBoite.setXYZW(nb, dx, dy, w, h);
        blanc.set(couleur);
        this.bCouleur.setXYZW(nb, blanc.r, blanc.g, blanc.b, a * (s.alpha == null ? 1 : s.alpha));
        this.bJauge.setXYZW(nb, jauge[0], jauge[1], jauge[2], jauge[3]);
        nb++;
      };
      const toutes = typeof UI === 'function' && UI.reglage ? UI.reglage('barres') : true;
      for (const s of sprites) {
        const c = s.combat;
        if (!c) continue;
        const k = s.scale || 1;
        if (na < 48) anneau(this.anneaux, na++, s, 0.98 * k, c.equipe === 'player' ? '#4a90ff' : '#ff5a5a');
        if (c.immun && na < 48) anneau(this.anneaux, na++, s, 1.16 * k, c.immun);
        if (c.actif && nl < 24) { const p = 0.5 + 0.5 * Math.sin(now / 180); anneau(this.anneauxL, nl++, s, (1.18 + p * 0.12) * k, '#ffffff', 0.35 + 0.45 * p); }
        if (c.vise && nl < 24) { const p = 0.5 + 0.5 * Math.sin(now / 150); anneau(this.anneauxL, nl++, s, (1.3 + p * 0.08) * k, '#ffe6a8', 0.5 + 0.4 * p); }
        if (!toutes && !c.vise && !c.actif) continue;
        const hp = Math.max(0, Math.min(1, c.hp)), trace = Math.max(hp, Math.min(1, c.trace == null ? hp : c.trace));
        const couleur = c.equipe === 'player' ? (hp <= 0.25 ? '#ffb347' : '#4fc8ff') : '#ff6b5e';
        barre(s, 0, 10, c.boss ? 66 : 52, 8, couleur, 1, [hp, Math.min(1, c.bouclier || 0), trace, c.actif ? 1 : 0]);
      }
      this.anneaux.count = na; this.anneauxL.count = nl;
      for (const a of [this.anneaux, this.anneauxL]) { a.instanceMatrix.needsUpdate = true; if (a.instanceColor) a.instanceColor.needsUpdate = true; }
      this.bAncre.needsUpdate = this.bBoite.needsUpdate = this.bCouleur.needsUpdate = this.bJauge.needsUpdate = true;
      this.barres.geometry.instanceCount = nb;
    }

    majTextes(sprites, cam, now, extras) {
      const items = [];
      const c0 = cam.vise || cam.cible;
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
        if (it.sorte === 'nom' || it.sorte === 'ennemi') { const W = Figures.boiteTexte(w); gardes.push(Object.assign({}, it, { dy, w: W, h: W / 4 })); }
        else gardes.push(dy === (it.dy || 0) ? it : Object.assign({}, it, { dy }));
      }
      items.length = 0;
      for (const it of gardes) items.push(it);
      const n = Math.min(MAX_TEXTES, items.length);
      for (let i = 0; i < n; i++) {
        const it = items[i];
        const c = this.texte(`${it.sorte}|${it.texte}|${it.couleur || ''}`, it.sorte, it.texte, it.couleur);
        const kk = it.k || 1;
        this.aAncre.setXYZ(i, it.x, it.y, it.z);
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

    octets() { return this.atlas.octets() + this.textes.octets() + (this.modeles ? this.modeles.octets() : 0) + (this.heros ? this.heros.octets() : 0); }

    liberer() {
      if (this.modeles) { this.modeles.liberer(); this.modeles = null; }
      if (this.heros) { this.heros.liberer(); this.heros = null; }
      this.atlas.liberer(); this.textes.liberer(); this.texOmbre.dispose(); this.texAnneau.dispose();
      for (const m of [this.mesh, this.meshX, this.textesMesh, this.barres]) m.geometry.dispose();
      this.ombres.dispose(); this.anneaux.dispose(); this.anneauxL.dispose();
      for (const m of [this.mat, this.matX, this.matT, this.matOmbre, this.matAnneaux, this.matAnneauxL, this.matB]) m.dispose();
    }
  }

  return { Figures, Atlas, PX };
})();
