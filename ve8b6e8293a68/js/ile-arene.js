const IleArene = (() => {
  const N = 15;
  const octet = v => Math.max(0, Math.min(255, Math.round(v)));
  const rgb = n => [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const rgbHex = h => { const n = parseInt(String(h).replace('#', ''), 16) || 0; return rgb(n); };
  const CRISTAL = '#7fe3ff';
  const PLACEMENT = { joueur: { fill: [0x209fec, 0.55], stroke: [0xacdded, 0.95] }, monstre: { fill: [0xd9424f, 0.56], stroke: [0xffb2ac, 0.9] } };

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


  const hasard = (a, b) => a + Math.random() * (b - a);
  const FX_SORTS = {
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
    braisille: {
      couleur: '#ff8a3d',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1;
        A.semer(12, (i) => ({ x: de.u + dx / l * 0.35, h: hde, z: de.v + dz / l * 0.35, vx: dx / l * hasard(1.2, 2.6) + hasard(-0.5, 0.5), vy: hasard(0.4, 1.4), vz: dz / l * hasard(1.2, 2.6) + hasard(-0.5, 0.5), vie: hasard(0.35, 0.6), max: 0.6, g: 3.5, couleur: ['#ffb347', '#ff6a1f', '#ffe08a'][i % 3], taille: hasard(0.12, 0.22) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#ff6a1f', ne: null, duree: 520 });
        A.semer(14, (i) => ({ x: p.u + hasard(-0.25, 0.25), h: h + hasard(0.05, 0.3), z: p.v + hasard(-0.25, 0.25), vx: hasard(-0.25, 0.25), vy: hasard(0.8, 1.7), vz: hasard(-0.25, 0.25), vie: hasard(0.45, 0.8), max: 0.8, g: -0.6, couleur: ['#ffe08a', '#ffb347', '#ff6a1f', '#d9341a'][i % 4], taille: hasard(0.2, 0.4) }));
        A.semer(10, (i, n) => { const a = i / n * Math.PI * 2 + hasard(-0.4, 0.4), v = hasard(0.6, 1.5); return { x: p.u, h: h + 0.35, z: p.v, vx: Math.cos(a) * v, vy: hasard(1.2, 2.4), vz: Math.sin(a) * v, vie: hasard(0.5, 0.85), max: 0.85, g: 6, couleur: ['#ff8a3d', '#ffd27a'][i % 2], taille: hasard(0.1, 0.18) }; });
      },
    },
    gouttelette: {
      couleur: '#7fdcff',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1;
        A.semer(10, (i) => ({ x: de.u + dx / l * 0.3, h: hde, z: de.v + dz / l * 0.3, vx: dx / l * hasard(0.9, 2.0) + hasard(-0.3, 0.3), vy: hasard(0.5, 1.3), vz: dz / l * hasard(0.9, 2.0) + hasard(-0.3, 0.3), vie: hasard(0.35, 0.6), max: 0.6, g: 5, couleur: ['#7fdcff', '#c9f4ff', '#3fa9d8'][i % 3], taille: hasard(0.12, 0.22) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#bfefff', ne: null, duree: 640 });
        A.semer(16, (i, n) => { const a = i / n * Math.PI * 2 + hasard(-0.3, 0.3), v = hasard(0.5, 1.4); return { x: p.u, h: h + 0.15, z: p.v, vx: Math.cos(a) * v, vy: hasard(1.4, 2.6), vz: Math.sin(a) * v, vie: hasard(0.45, 0.8), max: 0.8, g: 7, couleur: ['#7fdcff', '#e6fbff', '#3fa9d8'][i % 3], taille: hasard(0.14, 0.26) }; });
      },
    },
    miel: {
      couleur: '#ffc94a',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1;
        A.semer(10, (i) => ({ x: de.u, h: hde + 0.2, z: de.v, vx: dx / l * hasard(1.0, 1.8), vy: hasard(1.6, 2.4), vz: dz / l * hasard(1.0, 1.8), vie: hasard(0.5, 0.75), max: 0.75, g: 6, couleur: ['#ffc94a', '#f0a020', '#ffe08a'][i % 3], taille: hasard(0.12, 0.22) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#ffc94a', ne: null, duree: 700 });
        A.semer(12, (i, n) => { const a = i / n * Math.PI * 2, v = hasard(0.4, 0.9); return { x: p.u, h: h + 0.1, z: p.v, vx: Math.cos(a) * v, vy: hasard(0.8, 1.6), vz: Math.sin(a) * v, vie: hasard(0.4, 0.7), max: 0.7, g: 8, couleur: ['#ffc94a', '#e89a20'][i % 2], taille: hasard(0.12, 0.2) }; });
      },
    },
    saisie: {
      couleur: '#7fe0a0',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1;
        A.semer(8, (i) => ({ x: de.u + dx / l * 0.3, h: hde + 0.1, z: de.v + dz / l * 0.3, vx: dx / l * hasard(2.5, 3.5), vy: hasard(0, 0.4), vz: dz / l * hasard(2.5, 3.5), vie: hasard(0.25, 0.4), max: 0.4, g: 0, couleur: ['#7fe0a0', '#c8f0b0'][i % 2], taille: hasard(0.08, 0.14) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#9fe8b0', ne: null, duree: 520 });
        A.semer(14, (i, n) => { const a = i / n * Math.PI * 2, v = hasard(1.0, 1.6); return { x: p.u + Math.cos(a) * 0.35, h: h + 0.5, z: p.v + Math.sin(a) * 0.35, vx: -Math.cos(a) * v, vy: hasard(-0.4, 0.2), vz: -Math.sin(a) * v, vie: hasard(0.2, 0.35), max: 0.35, g: 0, couleur: ['#7fe0a0', '#e0ffe8'][i % 2], taille: hasard(0.08, 0.14) }; });
      },
    },
    bogue: {
      couleur: '#a86a3a',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1;
        A.semer(12, (i) => ({ x: de.u, h: hde + 0.3, z: de.v, vx: dx / l * hasard(2.0, 3.0) + hasard(-0.5, 0.5), vy: hasard(0.6, 1.4), vz: dz / l * hasard(2.0, 3.0) + hasard(-0.5, 0.5), vie: hasard(0.35, 0.55), max: 0.55, g: 5, couleur: ['#a86a3a', '#d9a060', '#6e4020'][i % 3], taille: hasard(0.07, 0.12) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#c8864a', ne: null, duree: 560 });
        A.semer(14, (i, n) => { const a = i / n * Math.PI * 2 + hasard(-0.3, 0.3), v = hasard(0.8, 1.6); return { x: p.u, h: h + 0.2, z: p.v, vx: Math.cos(a) * v, vy: hasard(1.0, 2.0), vz: Math.sin(a) * v, vie: hasard(0.35, 0.6), max: 0.6, g: 9, couleur: ['#a86a3a', '#d9a060'][i % 2], taille: hasard(0.07, 0.13) }; });
      },
    },
    corne: {
      couleur: '#e0b060',
      depart(A, de, hde, vers) {
        const h = A.ile.hauteur(de.u, de.v);
        A.semer(10, (i) => ({ x: de.u + hasard(-0.3, 0.3), h: h + 0.05, z: de.v + hasard(-0.3, 0.3), vx: hasard(-0.6, 0.6), vy: hasard(0.4, 1.0), vz: hasard(-0.6, 0.6), vie: hasard(0.4, 0.7), max: 0.7, g: 1, couleur: '#cbb894', taille: hasard(0.12, 0.22) }));
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#ffcf6a', ne: null, duree: 600 });
        A.semer(16, (i, n) => { const a = i / n * Math.PI * 2, v = hasard(0.9, 1.7); return { x: p.u, h: h + 0.3, z: p.v, vx: Math.cos(a) * v, vy: hasard(1.2, 2.4), vz: Math.sin(a) * v, vie: hasard(0.45, 0.75), max: 0.75, g: 8, couleur: ['#ffcf6a', '#e8a840', '#cbb894'][i % 3], taille: hasard(0.1, 0.2) }; });
      },
    },
    motte: {
      couleur: '#9a7a4a',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1, h = A.ile.hauteur(de.u, de.v);
        A.semer(14, (i) => { const f = hasard(0.2, 1); return { x: de.u + dx * f, h: h + 0.05, z: de.v + dz * f, vx: hasard(-0.4, 0.4), vy: hasard(0.8, 1.8), vz: hasard(-0.4, 0.4), vie: hasard(0.3, 0.55), max: 0.55, g: 6, couleur: ['#7a5a32', '#9a7a4a', '#5f7f2e'][i % 3], taille: hasard(0.08, 0.16) }; });
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#b89a62', ne: null, duree: 620 });
        A.semer(18, (i, n) => { const a = i / n * Math.PI * 2 + hasard(-0.3, 0.3), v = hasard(0.6, 1.5); return { x: p.u, h: h + 0.1, z: p.v, vx: Math.cos(a) * v, vy: hasard(1.8, 3.2), vz: Math.sin(a) * v, vie: hasard(0.5, 0.85), max: 0.85, g: 8, couleur: ['#6e4f2a', '#8f6d3f', '#6a8f34', '#a58a5c'][i % 4], taille: hasard(0.14, 0.3) }; });
        A.semer(14, (i, n) => { const a = i / n * Math.PI * 2, v = hasard(1.0, 1.8); return { x: p.u, h: h + 0.05, z: p.v, vx: Math.cos(a) * v, vy: hasard(0.1, 0.35), vz: Math.sin(a) * v, vie: hasard(0.4, 0.7), max: 0.7, g: 0.5, couleur: '#cbb894', taille: hasard(0.12, 0.22) }; });
      },
    },
    rafale: {
      couleur: '#d9f2ff',
      depart(A, de, hde, vers) {
        const dx = vers.u - de.u, dz = vers.v - de.v, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
        A.semer(18, (i) => { const v = hasard(2.2, 3.6), lat = hasard(-0.5, 0.5); return { x: de.u + ux * 0.25 - uz * lat * 0.3, h: hde + hasard(-0.15, 0.25), z: de.v + uz * 0.25 + ux * lat * 0.3, vx: ux * v - uz * lat, vy: hasard(-0.1, 0.5), vz: uz * v + ux * lat, vie: hasard(0.35, 0.6), max: 0.6, g: 0.6, couleur: ['#9fd86b', '#e8f8ff', '#6fb84a', '#c4ecff'][i % 4], taille: i % 2 ? hasard(0.08, 0.14) : hasard(0.14, 0.24) }; });
      },
      impact(A, c) {
        const p = A.versMonde(c.x, c.y), h = A.ile.hauteur(p.u, p.v);
        A.eclats.push({ x: c.x, y: c.y, couleur: '#d9f2ff', ne: null, duree: 560 });
        A.semer(20, (i, n) => { const a = i / n * Math.PI * 2, r = hasard(0.25, 0.45), v = hasard(1.2, 2.0); return { x: p.u + Math.cos(a) * r, h: h + hasard(0.05, 0.4), z: p.v + Math.sin(a) * r, vx: -Math.sin(a) * v + Math.cos(a) * 0.3, vy: hasard(1.0, 2.2), vz: Math.cos(a) * v + Math.sin(a) * 0.3, vie: hasard(0.5, 0.9), max: 0.9, g: 1.5, couleur: ['#9fd86b', '#f2fbff', '#6fb84a', '#b9e3ff'][i % 4], taille: hasard(0.1, 0.22) }; });
      },
    },
  };
  class Arene {
    constructor(THREE, ile) {
      this.THREE = THREE;
      this.ile = ile;
      this.etat = null;
      this.map = null;
      this.x0 = 0; this.y0 = 0;
      this.sig = null;
      this.anims = [];
      this.eclats = [];
      this.projectiles = [];
      this.etincelles = [];
      this.chiffres = [];
      this.entrees = new Map();
      this.morts = new Map();
      this.vus = new Set();
      this.rochers = new Map();
      this.donnees = new Uint8Array(64 * 16 * 4);
      const t = this.texCases = new THREE.DataTexture(this.donnees, 64, 16, THREE.RGBAFormat, THREE.UnsignedByteType);
      t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.flipY = false; t.needsUpdate = true;
      const tex = this.tex = {};
      for (const k of Object.keys(PEINTURES)) { const c = new THREE.CanvasTexture(PEINTURES[k]()); c.flipY = false; tex[k] = c; }
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
      const L = IleDecor.bibliotheque(!!ile.telephone);
      this.matRocher = new THREE.MeshToonMaterial({ color: new THREE.Color('#9a958a'), gradientMap: ile.rampe || null });
      this.rocs = new THREE.InstancedMesh(L.blocs[3], this.matRocher, 12);
      this.rocs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.rocs.count = 0; this.rocs.frustumCulled = false;
      this.groupe = new THREE.Group();
      this.glyphes = new THREE.Group(); this.cleGlyphes = ''; this.texGlyphes = {};
      this.groupe.add(this.carres, this.panneaux, this.rocs, this.glyphes);
      this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = new THREE.Color(); this._e = new THREE.Euler();
    }

    get ouverte() { return this.etat === 'ouverte'; }


    ouvrir(map) {
      this.finirAnimations();
      this.map = map;
      this.x0 = map.ancre.x0; this.y0 = map.ancre.y0;
      this.etat = 'ouverte';
      this.sig = null;
      this.eclats = []; this.projectiles = []; this.etincelles = []; this.chiffres = [];
      this.entrees = new Map();
      this.morts = new Map();
      this.vus = new Set();
      const H = (u, v) => this.ile.hauteur(u, v);
      const { hMin, hMax, hMoy } = this.mesurer(map);
      this.donnees.fill(0);
      this.horsAire = Arene.horsAire(map);
      for (let y = 0; y < map.h && y < 16; y++) for (let x = 0; x < map.w && x < 16; x++) this.ecrireFixe(x, y);
      this.texCases.needsUpdate = true;
      const coin = (u, v) => { const h = H(u, v); return [u, v, Number.isFinite(h) ? h : hMoy]; };
      const X1 = this.x0 + map.w, Y1 = this.y0 + map.h;
      const points = [];
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
        if (map.cells[y][x] === Grid.HOLE) continue;
        for (const [u, v] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) {
          const U = this.x0 + u, V = this.y0 + v, hs = this.ile.T && this.ile.T.marcheA ? this.ile.T.marcheA(U, V) : H(U, V);
          if (Number.isFinite(hs)) points.push([U, V, hs]);
        }
      }
      return { x0: this.x0, y0: this.y0, w: map.w, h: map.h, hMin, hMax, hMoy, points, coins: [coin(this.x0, this.y0), coin(X1, this.y0), coin(this.x0, Y1), coin(X1, Y1)] };
    }

    mesurer(map) {
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
      return { hMin, hMax, hMoy };
    }

    apercu(map, d) {
      if (this.etat === 'ouverte' || this.etat === 'fermeture') return false;
      const cle = c => c.x + ',' + c.y;
      const sig = [map.ancre.x0, map.ancre.y0, d.bleues.map(cle).join(';'), d.rouges.map(cle).join(';'), d.joueur ? cle(d.joueur) : ''].join('|');
      if (this.etat === 'apercu' && sig === this.sigApercu) return true;
      this.sigApercu = sig;
      this.map = map;
      this.x0 = map.ancre.x0; this.y0 = map.ancre.y0;
      this.etat = 'apercu';
      this.sig = null;
      this.mesurer(map);
      this.horsAire = Arene.horsAire(map);
      const D = this.donnees;
      D.fill(0);
      const peindre = (c, fill, stroke, drapeaux) => {
        if (!c || !Grid.inBounds(map, c.x, c.y) || c.x > 15 || c.y > 15) return;
        const o = (c.y * 64 + c.x * 4) * 4, f = rgb(fill[0]), t = rgb(stroke[0]);
        D[o] = f[0]; D[o + 1] = f[1]; D[o + 2] = f[2]; D[o + 3] = octet(fill[1] * 255);
        D[o + 4] = t[0]; D[o + 5] = t[1]; D[o + 6] = t[2]; D[o + 7] = octet(stroke[1] * 255);
        D[o + 9] |= drapeaux;
      };
      for (let y = 0; y < map.h && y < 16; y++) for (let x = 0; x < map.w && x < 16; x++) this.ecrireFixe(x, y);
      for (const c of d.bleues) peindre(c, PLACEMENT.joueur.fill, PLACEMENT.joueur.stroke, 4);
      for (const c of d.rouges) peindre(c, PLACEMENT.monstre.fill, PLACEMENT.monstre.stroke, 0);
      if (d.joueur) peindre(d.joueur, PLACEMENT.joueur.fill, PLACEMENT.joueur.stroke, 1);
      this.texCases.needsUpdate = true;
      return true;
    }
    finApercu() {
      if (this.etat !== 'apercu') return;
      this.etat = null; this.map = null; this.sigApercu = null;
      this.donnees.fill(0);
      this.texCases.needsUpdate = true;
    }

    fermer() {
      if (!this.etat) return;
      this.finirAnimations();
      this.etat = 'fermeture';
      this.eclats = []; this.projectiles = []; this.etincelles = []; this.chiffres = [];
      this.rochers.clear(); this.rocs.count = 0;
      for (const o of [...this.glyphes.children]) { this.glyphes.remove(o); o.geometry.dispose(); o.material.dispose(); }
      this.cleGlyphes = '';
      this.donnees.fill(0);
      this.texCases.needsUpdate = true;
      this.sig = null;
    }
    eteindre() { this.etat = null; this.map = null; this.carres.geometry.instanceCount = 0; this.panneaux.geometry.instanceCount = 0; this.rocs.count = 0; }

    finirAnimations() {
      const a = this.anims;
      this.anims = [];
      for (const x of a) { try { x.finir(); } catch (e) { console.error(e); } }
    }


    versMonde(x, y) { return { u: this.x0 + x + 0.5, v: this.y0 + y + 0.5 }; }
    caseSous(u, v) { return { x: Math.floor(u - this.x0), y: Math.floor(v - this.y0) }; }

    static horsAire(map) {
      const hors = new Set(), file = [];
      const trou = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && map.cells[y][x] === Grid.HOLE;
      for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if ((x === 0 || y === 0 || x === map.w - 1 || y === map.h - 1) && trou(x, y)) { hors.add(x + ',' + y); file.push([x, y]); }
      for (let i = 0; i < file.length; i++) {
        const [x, y] = file[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = nx + ',' + ny; if (trou(nx, ny) && !hors.has(k)) { hors.add(k); file.push([nx, ny]); } }
      }
      return hors;
    }

    ecrireFixe(x, y) {
      const D = this.donnees, o = (y * 64 + x * 4) * 4;
      D[o + 8] = this.map.cells[y][x] === Grid.HOLE && this.horsAire && this.horsAire.has(x + ',' + y) ? 5 : this.map.cells[y][x];
      const h = this.ile.hauteur(this.x0 + x + 0.5, this.y0 + y + 0.5);
      D[o + 10] = Number.isFinite(h) ? Math.max(0, Math.min(255, Math.round(128 + (h - (this.hMoy || 0)) * 32))) : 128;
      D[o + 11] = 0;
    }


    majCases(H, cb) {
      if (this.etat !== 'ouverte') return;
      const m = this.map, placement = cb.phase === 'placement';
      const traps = (cb.traps || []).filter(t => t.owner && t.owner.team === 'player');
      const hv = H.hover && Grid.inBounds(m, H.hover.x, H.hover.y) ? H.hover : null;
      const chemin = H.path && H.path.length && cb.actor ? [{ x: cb.actor.x, y: cb.actor.y }].concat(H.path) : [];
      const cible = H.cible != null ? cb.entities.find(e => e.id === H.cible && e.alive) : null;
      const sig = [placement ? 1 : 0, [...H.move].join(','), [...H.range].join(','), [...H.blocked].join(','), [...H.aoe].join(','), [...cb.temp.keys()].map(k => k + cb.temp.get(k).kind).join(','), traps.map(t => t.x + ',' + t.y + t.element).join(';'), hv ? hv.x + ',' + hv.y : '', chemin.map(p => p.x + ',' + p.y).join(';'), cible ? cible.x + ',' + cible.y : ''].join('|');
      this.majRochers(cb);
      this.majGlyphes(cb);
      if (sig === this.sig) return;
      this.sig = sig;
      const D = this.donnees;
      D.fill(0);
      const cotes = new Map();
      for (let i = 0; i < chemin.length; i++) {
        const p = chemin[i], k = Grid.key(p.x, p.y);
        let b = 2 | (i === chemin.length - 1 ? 8 : 0);
        for (const q of [chemin[i - 1], chemin[i + 1]]) {
          if (!q) continue;
          if (q.x === p.x + 1) b |= 16; else if (q.x === p.x - 1) b |= 32; else if (q.y === p.y + 1) b |= 64; else if (q.y === p.y - 1) b |= 128;
        }
        cotes.set(k, (cotes.get(k) || 0) | b);
      }
      for (let y = 0; y < m.h && y < 16; y++) for (let x = 0; x < m.w && x < 16; x++) {
        const k = Grid.key(x, y), o = (y * 64 + x * 4) * 4;
        const tmp = cb.tempAt ? cb.tempAt(x, y) : null;
        let fill = null, stroke = null, respire = false, coupe = false;
        if (tmp && tmp.kind === 'water') { fill = [0x113f8a, 0.6]; stroke = [0x78b4e6, 0.6]; }
        if (tmp && tmp.kind === 'fente') { fill = [0x120818, 0.92]; stroke = [0xbf95ff, 0.9]; }
        if (placement) {
          if (cb.isStartCell('player', x, y)) { fill = PLACEMENT.joueur.fill; stroke = PLACEMENT.joueur.stroke; respire = true; }
          else if (cb.isStartCell('monster', x, y)) { fill = PLACEMENT.monstre.fill; stroke = PLACEMENT.monstre.stroke; }
        }
        if (H.move.has(k)) { fill = [0x80d697, 0.42]; stroke = [0xcef6d6, 0.8]; respire = false; }
        if (H.range.has(k)) { fill = [0x209fec, 0.42]; stroke = [0xacdded, 0.85]; respire = false; }
        if (H.blocked.has(k)) { fill = [0x0b1322, 0.5]; stroke = [0x4a5878, 0.6]; respire = false; coupe = true; }
        if (H.aoe.has(k)) { fill = [0xef7574, 0.6]; stroke = [0xffd6d0, 0.95]; respire = false; }
        if (fill) { const c = rgb(fill[0]); D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = octet(fill[1] * 255); }
        if (stroke) { const c = rgb(stroke[0]); D[o + 4] = c[0]; D[o + 5] = c[1]; D[o + 6] = c[2]; D[o + 7] = octet(stroke[1] * 255); }
        this.ecrireFixe(x, y);
        D[o + 9] = (hv && hv.x === x && hv.y === y ? 1 : 0) | (cotes.get(k) || 0) | (respire ? 4 : 0);
        D[o + 11] = (coupe ? 1 : 0) | (cible && cible.x === x && cible.y === y ? 2 : 0);
      }
      for (const tr of traps) {
        if (!Grid.inBounds(m, tr.x, tr.y)) continue;
        const o = (tr.y * 64 + tr.x * 4) * 4 + 12, c = rgbHex(DATA.elements[tr.element].color);
        D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = 255;
      }
      this.texCases.needsUpdate = true;
    }

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

    majGlyphes(cb) {
      const THREE = window.THREE, liste = (cb.glyphs || []).filter(g => g.owner && g.cells && g.cells.length);
      const cle = liste.map(g => g.cells.map(c => c.x + ',' + c.y).join(';') + '|' + g.element + '|' + g.affects + '|' + (g.owner.kit && g.owner.kit.mare ? 1 : 0)).join('/');
      if (cle === this.cleGlyphes) return;
      this.cleGlyphes = cle;
      for (const o of [...this.glyphes.children]) { this.glyphes.remove(o); o.geometry.dispose(); o.material.dispose(); }
      for (const g of liste) {
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, h = -Infinity;
        for (const c of g.cells) {
          x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y);
          const p = this.versMonde(c.x, c.y); h = Math.max(h, this.ile.hauteur(p.u, p.v));
        }
        const tortue = !!(g.owner.kit && g.owner.kit.mare), sorte = tortue ? 'tortue:' + (g.element || 'neutre') : g.affects === 'allies' ? 'or' : 'amethyste';
        const tex = this.texGlyphes[sorte] || (this.texGlyphes[sorte] = Arene.texGlyphe(sorte));
        const taille = Math.max(x1 - x0, y1 - y0) + 1.15;
        const geo = new THREE.PlaneGeometry(taille, taille);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false });
        const me = new THREE.Mesh(geo, mat);
        me.position.set(this.x0 + (x0 + x1) / 2 + 0.5, h + 0.035, this.y0 + (y0 + y1) / 2 + 0.5);
        me.renderOrder = 2; me.frustumCulled = false;
        this.glyphes.add(me);
      }
    }


    sprites(cb, now, fig, telephone) {
      if (this.etat !== 'ouverte') return [];
      const out = [], Hc = this.ile.highlights;
      for (const e of cb.entities) {
        let mort = null;
        if (!e.alive) {
          const Dm = this.vus.has(e.id) && e.team === 'monster' && fig.modeles && fig.modeles.prend(e.def.id) ? fig.modeles.durees(e.def.id) : null;
          if (!Dm || !(Dm.mort > 0)) continue;
          if (!this.morts.has(e.id)) this.morts.set(e.id, now);
          mort = (now - this.morts.get(e.id)) / Dm.mort;
          if (mort >= 1) continue;
        } else if (!cb.canSee(cb.player, e)) continue;
        else { this.vus.add(e.id); this.morts.delete(e.id); }
        const p = this.versMonde(e.rx, e.ry), h = this.ile.hauteur(p.u, p.v);
        const hpF = Math.max(0, Math.min(1, e.hp / e.hpMax));
        if (e._trace == null || hpF >= e._trace) e._trace = hpF;
        else {
          if (e._traceHp == null || hpF < e._traceHp) e._traceDepuis = now;
          if (now - (e._traceDepuis || 0) > 380) { const dt = Math.min(0.1, Math.max(0, (now - (e._traceT || now)) / 1000)); e._trace += (hpF - e._trace) * Math.min(1, dt * 2.6); if (e._trace - hpF < 0.004) e._trace = hpF; }
        }
        e._traceHp = hpF; e._traceT = now;
        const s = {
          kind: 'entity', shape: e.shape, color: e.color, glyph: e.glyph, name: e.name, look: e.def.look, auraCos: this.ile.qualite === 'basse' ? null : e.def.auraCos, lueur: e.def.lueur, gender: e.def.gender,
          team: e.team, flash: now < (e.flashUntil || 0), motif: e.team === 'monster' ? Renderer.motifOf(e.def.id) : null, noyau: e.def.noyau || null, figure: e.team === 'monster' ? (typeof Figures === 'object' ? Figures.de(e.def.id) : null) : null,
          scale: (e.boss ? 1.3 : (e.isSummon && !e.ally ? 0.8 : 1)) * (telephone ? (e.team === 'monster' ? 1.3 : 1.12) : 1),
          alpha: (e.alpha == null ? 1 : e.alpha) * (e.hasState('invisible') ? 0.45 : 1),
          facing: e.shape === 'player' ? e.facing || Renderer.faceFoe(cb, e) : 1,
          x: p.u, y: p.v, h, normale: this.ile.normale(p.u, p.v), bob: e.hop || 0,
          cible: { type: 'combattant', ref: e },
          combat: {
            hp: hpF, trace: e._trace, bouclier: e.shield / e.hpMax, equipe: e.team, actif: cb.actor === e && cb.phase === 'battle', boss: !!e.boss,
            vise: !!(Hc && Hc.cible != null && Hc.cible === e.id),
            immun: e.immuneElement ? DATA.elements[e.immuneElement].color : null,
            sonne: e.hasState('stunned'), invuln: !!e.def.invulnerable || e.hasState('invulnerable'), armure: e.modifier('armor') > 0,
            lanterne: e.effects.some(f => f.type === 'state' && f.farDodge),
          },
        };
        if (fig.modeles && e.team === 'monster' && fig.modeles.prend(e.def.id)) {
          s.modele = e.def.id; s.modeleCle = 'combat|' + e.id;
          const D = fig.modeles.durees(e.def.id);
          if (D) this.gesteFigure(s, e, D, now, cb);
          if (mort != null) { s.geste = { type: 'mort', t: mort }; s.combat = null; s.cible = null; s.flash = false; }
        } else if (fig.heros && e === cb.player) {
          s.heros = true;
          this.gesteHeros(s, e, now, cb);
        }
        s.cle = fig.cleFigure(s); s.peindre = fig.peindreFigure(s);
        out.push(s);
      }
      return out;
    }

    gesteFigure(s, e, D, now, cb) {
      let a = this.entrees.get(e.id);
      if (a == null) { a = now + (cb.phase === 'placement' ? Math.min(6, this.entrees.size) * 110 : 0); this.entrees.set(e.id, a); }
      if (now < a) { s.alpha = 0; return; }
      if (now < a + D.placement) { s.geste = { type: 'placement', t: (now - a) / D.placement }; return; }
      const g = e.geste;
      if (g && g.debut != null && now < g.debut + g.duree) { s.geste = { type: g.type, t: (now - g.debut) / g.duree }; if (g.vers) s.vers = g.vers; return; }
      if (now < (e.flashUntil || 0)) s.geste = { type: 'coup', t: 1 - (e.flashUntil - now) / 250 };
    }
    gesteHeros(s, e, now, cb) {
      const g = e.geste;
      if (g && g.debut != null && now < g.debut + g.duree) { s.geste = { type: g.type, t: (now - g.debut) / g.duree }; if (g.vers) s.vers = g.vers; return; }
      if (now < (e.flashUntil || 0)) s.geste = { type: 'coup', t: 1 - (e.flashUntil - now) / 250 };
      let proche = null, d = Infinity;
      for (const o of cb.entities) {
        if (!o.alive || o.team !== 'monster') continue;
        const q = Math.hypot(o.rx - e.rx, o.ry - e.ry);
        if (q < d) { d = q; proche = o; }
      }
      if (proche) s.vers = this.versMonde(proche.rx, proche.ry);
    }
    gestesDe(e) {
      const F = this.ile.figures;
      if (!e || !F) return null;
      const cb = this.ile.combat;
      if (F.heros && (cb ? e === cb.player : e.shape === 'player' && e.team === 'player')) return F.heros.durees ? F.heros.durees() : (typeof IleHeros === 'object' ? IleHeros.DUREES : null);
      const P = F.modeles;
      return P && e.team === 'monster' && P.prend(e.def.id) ? P.durees(e.def.id) : null;
    }


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

    semer(n, f) {
      if (this.etat !== 'ouverte') return;
      const k = this.ile.qualite === 'haute' ? 1 : 0.6;
      for (let i = 0, m = Math.max(2, Math.round(n * k)); i < m; i++) this.etincelles.push(f(i, m));
      if (this.etincelles.length > 160) this.etincelles.splice(0, this.etincelles.length - 160);
    }

    animTrap() {
      return new Promise(resolve => {
        let debut = null;
        this.anims.push({ finir: resolve, tick: now => { if (debut == null) debut = now; if (now - debut >= 180) { resolve(); return true; } return false; } });
      });
    }

    fx(d) { this.eclater(d.cells || [], d.color || '#ffffff', 420); }
    float(d) { this.chiffres.push({ x: d.x, y: d.y, texte: String(d.text), couleur: d.color || '#ffffff', ne: null }); if (this.chiffres.length > 24) this.chiffres.shift(); }

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


    avancer(now) {
      if (!this.anims.length) return;
      this.anims = this.anims.filter(a => { try { return !a.tick(now); } catch (e) { console.error(e); a.finir(); return false; } });
    }

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
      this.eclats = this.eclats.filter(f => { if (f.ne == null) f.ne = now; return now - f.ne < f.duree; });
      const sol = [], lueurs = [];
      for (const f of this.eclats) {
        const t = (now - f.ne) / f.duree, p = this.versMonde(f.x, f.y), h = this.ile.hauteur(p.u, p.v);
        sol.push({ x: p.u, h: h + 0.07, z: p.v, couleur: f.couleur, a: 1 - t, taille: (0.4 + 0.7 * t) * 1.4 });
        lueurs.push({ x: p.u, h: h + 0.5, z: p.v, couleur: f.couleur, a: (1 - t) * 0.8, taille: (0.55 + 0.5 * t) * 2.6 });
        lueurs.push({ x: p.u, h: h + 0.5, z: p.v, couleur: '#ffffff', a: (1 - t) * (1 - t) * 0.85, taille: 0.8 + 0.5 * t });
      }
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
      const g = 3.2;
      this.etincelles = this.etincelles.filter(e => (e.vie -= dt) > 0);
      for (const e of this.etincelles) {
        e.vy -= (e.g == null ? g : e.g) * dt; e.vx *= 0.96; e.vz *= 0.96;
        e.x += e.vx * dt; e.h += e.vy * dt; e.z += e.vz * dt;
        lueurs.push({ x: e.x, h: e.h, z: e.z, couleur: e.couleur, a: Math.max(0, Math.min(1, e.vie / 0.6)), taille: e.taille });
      }
      poser(this.sol, sol);
      poser(this.air, lueurs);
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
      for (const o of [...this.glyphes.children]) { o.geometry.dispose(); o.material.dispose(); }
      for (const t of Object.values(this.texGlyphes)) t.dispose();
      this.carres.geometry.dispose(); this.panneaux.geometry.dispose();
      for (const m of [this.matCarres, this.matPanneaux, this.matRocher]) m.dispose();
    }
  }

  Arene.texGlyphe = function (sorte) {
    const THREE = window.THREE, S = 512, cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const c = cv.getContext('2d'), C = S / 2;
    const ELEM = { terre: '#b98b4e', feu: '#ef7a3a', eau: '#3fb8e8', air: '#9fe0a8', neutre: '#e8d8b0' };
    const hex = (x, y, r, rot = 0) => { c.beginPath(); for (let i = 0; i < 6; i++) { const a = rot + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](x + r * Math.cos(a), y + r * Math.sin(a)); } c.closePath(); };
    if (sorte.startsWith('tortue')) {
      const el = ELEM[sorte.split(':')[1]] || ELEM.neutre, OR = '#f2c14e', CY = '#7fe6ff';
      c.beginPath(); c.arc(C, C, S * 0.47, 0, Math.PI * 2); c.fillStyle = 'rgba(28,40,58,0.42)'; c.fill();
      const gr = c.createRadialGradient(C, C, S * 0.05, C, C, S * 0.48);
      gr.addColorStop(0, 'rgba(127,230,255,0.38)'); gr.addColorStop(0.75, 'rgba(127,230,255,0.18)'); gr.addColorStop(1, 'rgba(127,230,255,0)');
      c.fillStyle = gr; c.fillRect(0, 0, S, S);
      c.lineJoin = 'round'; c.lineCap = 'round';
      const trait = (w, col, flou) => { c.shadowColor = CY; c.shadowBlur = flou; c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.shadowBlur = 0; };
      c.beginPath(); c.arc(C, C, S * 0.47, 0, Math.PI * 2); trait(S * 0.026, OR, 18);
      c.beginPath(); c.arc(C, C, S * 0.395, 0, Math.PI * 2); trait(S * 0.016, OR, 10);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; c.beginPath(); c.moveTo(C + Math.cos(a) * S * 0.395, C + Math.sin(a) * S * 0.395); c.lineTo(C + Math.cos(a) * S * 0.47, C + Math.sin(a) * S * 0.47); trait(S * 0.013, OR, 6); }
      const r = S * 0.105, d = r * Math.sqrt(3);
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3, x = C + Math.cos(a) * d, y = C + Math.sin(a) * d;
        hex(x, y, r * 0.92); c.fillStyle = 'rgba(127,230,255,0.24)'; c.fill(); trait(S * 0.018, OR, 10);
      }
      hex(C, C, r * 0.92); c.fillStyle = el; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1; trait(S * 0.022, OR, 14);
      c.beginPath(); c.moveTo(C, C - r * 0.5); c.quadraticCurveTo(C + r * 0.42, C + r * 0.05, C, C + r * 0.42); c.quadraticCurveTo(C - r * 0.42, C + r * 0.05, C, C - r * 0.5);
      c.fillStyle = CY; c.shadowColor = CY; c.shadowBlur = 16; c.fill(); c.shadowBlur = 0;
    } else {
      const col = sorte === 'or' ? '#f3bc72' : '#b48cf0';
      c.beginPath(); c.arc(C, C, S * 0.44, 0, Math.PI * 2); c.fillStyle = sorte === 'or' ? 'rgba(243,188,114,0.22)' : 'rgba(151,100,214,0.26)'; c.fill();
      c.lineWidth = S * 0.016; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 14; c.stroke(); c.shadowBlur = 0;
      c.beginPath(); c.arc(C, C, S * 0.34, 0, Math.PI * 2); c.lineWidth = S * 0.008; c.stroke();
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };

  return { Arene, N, PLACEMENT };
})();
