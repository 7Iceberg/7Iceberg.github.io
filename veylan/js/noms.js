// Noms de Veilleurs tirés au sort, dans la langue du monde (docs/MONDE.md, « Sonorité des noms ») :
// deux syllabes, parfois trois ; consonnes franches (k, v, r, th, l), voyelles ouvertes ; aucun mot
// français ou anglais reconnaissable ; jamais de fin en « -ou ». Le gabarit suit les noms du monde
// (Vaelith, Thalor, Kaldrin, Veylan) : une syllabe finale fermée le plus souvent, une seule diphtongue.
// Sans DOM : testable sous Node.
const Noms = (() => {
  const ATTAQUES = ['k', 'v', 'r', 'th', 'l'];
  const PREMIERE = ['a', 'e', 'o', 'y', 'a', 'e', 'ae', 'ai', 'ey'];   // voyelle de la première syllabe
  const SUIVANTE = ['a', 'e', 'o', 'i', 'y', 'a', 'e'];
  const DIPHTONGUES = ['ae', 'ai', 'ey'];
  const CODAS = ['r', 'l', 's', 'n'];                       // au milieu du nom
  const FINALES = ['n', 'r', 'th', 'l', 's', 'n', 'r', 'th'];
  // Jointures dures à dire, et mots ou prénoms trop connus que les syllabes peuvent former.
  const JOINTURES = ['lr', 'nr', 'sr', 'nl', 'sv', 'rr', 'll', 'nn', 'ss', 'sth', 'yy', 'yi', 'iy', 'lol', 'kek'];
  const INTERDITS = new Set(['lava', 'lavas', 'kara', 'karen', 'lara', 'vera', 'raya', 'kaya', 'laya', 'lyra', 'lyre', 'lys', 'lion', 'leon', 'leo', 'lena', 'lens', 'loren', 'loris', 'lotos',
    'rayon', 'royal', 'rival', 'raven', 'river', 'rover', 'ravel', 'revel', 'rebel', 'relais', 'roller', 'rosen', 'roses', 'rotor', 'kelvin', 'kevin', 'kyle', 'kayak', 'koala', 'karl', 'karin',
    'valor', 'valse', 'velo', 'veron', 'veran', 'vertan', 'violon', 'vital', 'viral', 'vocal', 'volar', 'voler', 'volet', 'vyron', 'thor', 'thora', 'thoren', 'thorn', 'thoral', 'thyme', 'aral', 'aris',
    'ares', 'eros', 'eras', 'oral', 'orel', 'ores', 'oras', 'lever', 'laver', 'lover', 'liver', 'loser', 'laser', 'later', 'layer', 'lair', 'lain', 'lean', 'rain', 'vain', 'vein', 'kain', 'kaiser',
    'loki', 'lorel', 'laurel', 'lyon', 'arles', 'oslo', 'kiev', 'kyiv', 'tokyo', 'vatan', 'kalel', 'leyla', 'layla', 'aylin', 'alyn', 'erin', 'eren', 'oren', 'aron', 'aaron', 'elen', 'elon', 'ethan',
    'laika', 'karis', 'reval', 'valin', 'roman', 'rolan', 'lotar', 'lothar', 'kalin', 'karol', 'karel', 'kolin', 'lenin', 'levin', 'rasin', 'rosin', 'vales', 'veles', 'velar', 'volas', 'rakes']);
  const NOMS_PRIS = new Set(Object.keys((typeof DATA !== 'undefined' && DATA.classes) || {}));

  // Vrai si le nom suit les règles : lettres seules, 2 ou 3 syllabes, aucun mot interdit, pas de
  // fin en « -ou », 16 caractères au plus (la limite des noms de personnage).
  function valide(nom) {
    if (typeof nom !== 'string' || !/^[A-Z][a-z]{2,15}$/.test(nom)) return false;
    const bas = nom.toLowerCase();
    const syllabes = (bas.match(/[aeiouy]+/g) || []).length;
    if (syllabes < 2 || syllabes > 3) return false;
    if (/ou$/.test(bas) || INTERDITS.has(bas) || NOMS_PRIS.has(bas)) return false;
    return !JOINTURES.some(j => bas.includes(j));
  }

  // Un nom au hasard (`rnd` : un générateur de 0 à 1, Math.random par défaut).
  function aleatoire(rnd) {
    rnd = rnd || Math.random;
    const pick = a => a[Math.floor(rnd() * a.length)];
    for (let essai = 0; essai < 120; essai++) {
      const n = rnd() < 0.85 ? 2 : 3;
      let nom = '', prev = null, diph = 0;
      for (let i = 0; i < n; i++) {
        const last = i === n - 1;
        let attaque = pick(ATTAQUES);
        if (attaque === prev) attaque = ATTAQUES[(ATTAQUES.indexOf(attaque) + 1) % ATTAQUES.length];
        let voyelle = pick(i === 0 ? PREMIERE : SUIVANTE);
        if (DIPHTONGUES.includes(voyelle) && diph) voyelle = voyelle[0];
        if (DIPHTONGUES.includes(voyelle)) diph++;
        // Trois syllabes restent légères : pas de consonne au milieu.
        let fin = '';
        if (last) fin = rnd() < 0.8 ? pick(FINALES) : '';
        else if (n === 2 && rnd() < 0.3) fin = pick(CODAS);
        // Une fin ouverte ne se fait que sur « a » : pas de mots en -e, -o, -i ni -ou.
        if (last && !fin) voyelle = 'a';
        nom += attaque + voyelle + fin;
        prev = attaque;
      }
      if (nom.length < 4 || nom.length > 9) continue;
      nom = nom[0].toUpperCase() + nom.slice(1);
      if (valide(nom)) return nom;
    }
    return 'Kaelith';
  }

  return { aleatoire, valide };
})();
