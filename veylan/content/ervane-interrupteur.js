// L'interrupteur d'Ervane, l'île de l'Éveil (docs/ILE-TECHNIQUE.md, 1.4 et 1.5) : la seule ligne de
// l'île que toute page charge. Allumé depuis le basculement (active: true) : un nouveau personnage
// naît sur Ervane. js/ile.js, qui vient juste après, décide d'après cette valeur, l'adresse
// (?ile=0 l'éteint en développement) et les sauvegardes de l'appareil, puis charge le reste
// (js/data-ile.js, content/ervane*.js, content/tutoriel-ile.js, le moteur et le rendu de l'île).
// Éteint (active: false), le jeu ne voit rien de l'île et ne charge aucun de ses fichiers.
// modeleGlym: 'tous' : les monstres modelés par le code (les quatre Glyms, les Lampignons, le
// Lampignard, docs/ILE-TECHNIQUE.md 3.13 à 3.22) remplacent leurs panneaux peints ; ?glym=0 les éteint.
// monde: 'glb' : le monde modelé dans Blender (3.26, assets/monde/ervane.glb) à la place du sol et du
// décor dessinés par le code ; ?monde=0 rend le monde du code. style: 'lisiere' : le style Lisière
// (3.25 : la caméra basse, le ciel, l'heure qui tourne (heure: 'cycle', une journée en douze minutes
// depuis heureDepart), le temps qu'il fait (meteo)) ; ?style=0 l'éteint, ?heure= et ?meteo= le
// règlent. Les deux s'effacent sur un appareil faible (IleCharge.faible : ?quality=basse, deux
// coeurs ou 2 Go au plus), qui garde le jeu dessiné par le code (3.28). Le héros modelé suit le
// monde modelé pour la classe qui a son modèle (3.27, Lyssar) ; ?heros=0 l'éteint.
DATA.ile = { active: true, plateau: 'ervane', naissance: { map: 'ervane_mailles_place', lieu: 'eveil' }, modeleGlym: 'tous', monde: 'glb', style: 'lisiere', heure: 'cycle', heureDepart: 9.5, meteo: 'clair' };
