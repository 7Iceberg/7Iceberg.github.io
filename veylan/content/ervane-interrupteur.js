// L'interrupteur d'Ervane, l'île de l'Éveil (docs/ILE-TECHNIQUE.md, 1.4 et 1.5) : la seule ligne de
// l'île que toute page charge. Allumé depuis le basculement (active: true) : un nouveau personnage
// naît sur Ervane. js/ile.js, qui vient juste après, décide d'après cette valeur, l'adresse
// (?ile=0 l'éteint en développement) et les sauvegardes de l'appareil, puis charge le reste
// (js/data-ile.js, content/ervane*.js, content/tutoriel-ile.js, le moteur et le rendu de l'île).
// Éteint (active: false), le jeu ne voit rien de l'île et ne charge aucun de ses fichiers.
// modeleGlym: 'tous' : les monstres modelés par le code (les quatre Glyms, les Lampignons, le
// Lampignard, docs/ILE-TECHNIQUE.md 3.13 à 3.22) remplacent leurs panneaux peints ; ?glym=0 les éteint.
DATA.ile = { active: true, plateau: 'ervane', naissance: { map: 'ervane_mailles_place', lieu: 'eveil' }, modeleGlym: 'tous' };
