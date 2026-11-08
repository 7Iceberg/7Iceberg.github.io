const CarteIcones = (() => {
  const D = typeof CARTE_ICONES_DATA === 'object' ? CARTE_ICONES_DATA : null;

  const CATEGORIES = [
    { id: 'quetes', nom: 'Quêtes', couleur: '#e3ad35', sortes: ['offre', 'rendre', 'quete'] },
    { id: 'relais', nom: 'Relais de l\'Aube', couleur: '#2f9fcc', sortes: ['relais'] },
    { id: 'donjons', nom: 'Donjons', couleur: '#8560cc', sortes: ['donjon'] },
    { id: 'ateliers', nom: 'Ateliers et métiers', couleur: '#d07a3a', sortes: ['artisan', 'metiers'] },
    { id: 'commerce', nom: 'Commerce', couleur: '#3f9c55', sortes: ['marchand', 'marche', 'banque'] },
    { id: 'services', nom: 'Services', couleur: '#c44f4c', sortes: ['dojo', 'avis', 'temple'] },
    { id: 'reperes', nom: 'Repères', couleur: '#76809e', sortes: ['monument'] },
  ];
  const CAT_DE = new Map();
  for (const c of CATEGORIES) for (const s of c.sortes) CAT_DE.set(s, c);
  const categorie = kind => CAT_DE.get(kind) || null;

  const NOMS = {
    offre: 'Quête à prendre', rendre: 'Quête à rendre', quete: 'Quête suivie', relais: 'Relais de l\'Aube', donjon: 'Donjon',
    artisan: 'Atelier', metiers: 'Hôtel des Métiers', marchand: 'Marchand', marche: 'Marché', banque: 'Banque',
    dojo: 'Dojo', avis: 'Avis de recherche', temple: 'Temple des Voies', monument: 'Repère',
  };

  const GLYPHES = {
    donjon: 'skull', marchand: 'store', marche: 'shopping', banque: 'cash', dojo: 'sword', metiers: 'pickaxe',
    avis: 'target', temple: 'star', verrou: 'lock',
    artisan: { forgeron: 'hammer_wrench', tailleur: 'hanger', bijoutier: 'ring', alchimiste: 'flask', cordonnier: 'toolbox', '': 'hammer_wrench' },
  };
  function glyphe(kind, sub) {
    const g = GLYPHES[kind];
    if (!g) return null;
    const nom = typeof g === 'string' ? g : (g[sub || ''] || g['']);
    return D && D.masques[nom] ? nom : null;
  }

  const toiles = new Map();
  function decoder(s) {
    if (typeof atob === 'function') { const b = atob(s), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
    return new Uint8Array(Buffer.from(s, 'base64'));
  }
  function toile(nom) {
    if (toiles.has(nom)) return toiles.get(nom);
    if (!D || !D.masques[nom] || typeof document !== 'object') return null;
    const N = D.taille, pl = decoder(D.masques[nom]);
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const g = cv.getContext('2d'), img = g.createImageData(N, N), d = img.data;
    let o = 0;
    for (let i = 0; i + 1 < pl.length; i += 2) {
      const a = pl[i] * 17;
      for (let k = 0; k < pl[i + 1] && o < N * N; k++, o++) { const j = o * 4; d[j] = 255; d[j + 1] = 255; d[j + 2] = 255; d[j + 3] = a; }
    }
    g.putImageData(img, 0, 0);
    toiles.set(nom, cv);
    return cv;
  }

  function dessiner(c, nom, x, y, s) {
    const t = toile(nom);
    if (!t) return false;
    c.save();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(t, x - s / 2, y - s / 2, s, s);
    c.restore();
    return true;
  }

  const couleur = kind => (categorie(kind) || { couleur: '#6c6880' }).couleur;

  return { CATEGORIES, NOMS, categorie, couleur, glyphe, toile, dessiner };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CarteIcones;
