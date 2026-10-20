// Noms, descriptions et niveaux de déblocage définitifs des cent sorts (docs/SORTS.md ; les kits du
// Sarkan, du Lyssar et de la Nerith suivent docs/CLASSES-PRINCIPALES.md).
// Les identifiants ne changent jamais ; ce fichier se charge juste après data.js.
(() => {
const RENAMES = {
  // Vaelith
  eclat: { name: 'Trame Ardente', desc: 'Un fil de feu tiré droit sur la cible, simple et sûr : le premier geste qu\'on apprend à Orsane.', unlock: 1 },
  givre: { name: 'Maille Givrée', desc: 'Une maille de givre tissée autour des jambes : la cible perd 1 PM à son prochain tour.', unlock: 1 },
  bourrasque: { name: 'Rabat de Voile', desc: 'Un pan de Voile rabattu d\'un coup sec repousse la cible de deux cases ; contre un mur, ça fait mal.', unlock: 1 },
  secousse: { name: 'Trame Secouée', desc: 'Une secousse dans la trame du sol, en croix, qui n\'a pas besoin de voir pour frapper.', unlock: 9 },
  pas_de_voile: { name: 'Pas de Voile', desc: 'Le Vaelith plie le Voile et le traverse : il réapparaît sur une case libre en vue. Sur une créature, il prend sa place et la jette à la sienne : ce téléfrag lui rend 2 PA, une fois par tour.', unlock: 6 },
  lame_orage: { name: 'Fuseau d\'Orage', desc: 'Un fuseau d\'orage et de feu filé en ligne droite : trois cases à la suite, à partir de la case visée.', unlock: 21 },
  retour_de_voile: { name: 'Retour de Voile', desc: 'Le Vaelith laisse un fil du Voile là où il se tient : à la fin de son tour, il y revient.', unlock: 13 },
  manteau: { name: 'Voile Cousu', desc: 'Un pan de Voile cousu autour de soi : bouclier de 20 pendant deux tours.', unlock: 13 },
  siphon: { name: 'Fil Dénoué', desc: 'Le Vaelith dénoue le fil de la cible, qui perd 2 PA pour son prochain tour.', unlock: 17 },
  nova: { name: 'Voile Embrasé', desc: 'Le Voile s\'embrase à deux cases autour du Vaelith ; il est épargné, ses alliés non.', unlock: 26 },
  attraction: { name: 'Nœud Coulant', desc: 'Un nœud coulant passé autour de la cible, et on tire : elle vient de deux cases.', unlock: 3 },
  // Sarkan, Lame-Serment (docs/CLASSES-PRINCIPALES.md)
  taille_franche: { name: 'Taille Franche', desc: 'Le coup droit de la lame de scorie, sans détour. Chaque coup qui porte attise la Fureur.', unlock: 1 },
  saut_delan: { name: 'Saut d\'Élan', desc: 'Le Sarkan prend son élan et retombe au milieu d\'eux : la lame frappe en croix à l\'arrivée.', unlock: 1 },
  serment_jure: { name: 'Serment', desc: 'Le Sarkan grave un nom sur sa lame. Contre le juré, +20 % de dégâts ; s\'il touche un autre allié, la lame le brûle de loin ; l\'achever, c\'est la parole tenue : 2 PA, 10 % des PV et 2 de Fureur.', unlock: 1 },
  garde_de_scorie: { name: 'Garde de Scorie', desc: 'La lame en travers, la scorie en bouclier : bouclier de 30 et −20 % de dégâts au contact jusqu\'au prochain tour.', unlock: 3 },
  lame_tournoyante: { name: 'Lame Tournoyante', desc: 'Un tour complet de la grande lame : chaque ennemi au contact y passe, et chacun en plus la rend plus forte (+20 %).', unlock: 6 },
  defi: { name: 'Défi', desc: 'Un défi lancé à voix haute : la cible est tirée de deux cases et doit frapper le Sarkan à son prochain tour.', unlock: 9 },
  poigne_juree: { name: 'Poigne', desc: 'La main libre serre et la lame suit : −2 PM ; contre le juré, il est rejeté de deux cases, contre un rocher si possible.', unlock: 13 },
  lame_de_braise: { name: 'Lame de Braise', desc: 'La gravure s\'embrase et la lame trace une traînée de feu sur trois cases. La voie de l\'Ignis.', unlock: 17 },
  ferveur: { name: 'Ferveur', desc: 'La parole brûle plus fort que la fatigue : +30 % de dégâts ce tour et le suivant, et un pas de plus tout de suite.', unlock: 21 },
  verdict: { name: 'Verdict', desc: 'Toute la Fureur dans un seul coup : +20 % par point dépensé. Contre le juré, rien ne l\'arrête, ni esquive ni armure.', unlock: 26 },
  // Lyssar, Traqueur (docs/CLASSES-PRINCIPALES.md)
  trait_tisse: { name: 'Flèche Tissée', desc: 'Le tir de base, sur la corde de Voile : précis, long, et deux fois par tour.', unlock: 1 },
  fil_tendu: { name: 'Fil Tendu', desc: 'Une flèche qui tire son fil, deux fois par tour : la cible recule de deux cases, et paie chaque case qu\'un rocher lui refuse.', unlock: 1 },
  collet: { name: 'Collet', desc: 'Un fil de Voile noué au sol, invisible pour l\'ennemi : qui marche dedans est blessé et enraciné un tour. Trois au plus ; le quatrième remplace le plus ancien.', unlock: 1 },
  repli_traqueur: { name: 'Repli', desc: 'Deux pas en arrière, loin de l\'ennemi le plus proche, sans quitter l\'affût.', unlock: 3 },
  balise_de_fil: { name: 'Balise de Fil', desc: 'Un piquet planté loin du danger, relié au Traqueur par un fil : la première fois qu\'il est blessé, il file s\'y mettre à l\'abri.', unlock: 6 },
  corde_longue: { name: 'Corde Longue', desc: 'Le Traqueur détend son fil : +3 de portée ce tour et le suivant, pour 1 PA.', unlock: 9 },
  marque_traqueur: { name: 'Marque du Traqueur', desc: 'Le gibier est marqué : +25 % de dégâts subis pendant deux tours, et il ne peut plus se cacher. Une nouvelle marque remplace l\'ancienne.', unlock: 13 },
  pluie_de_fil: { name: 'Pluie de Fil', desc: 'Une volée tirée en cloche, sans ligne de vue, qui retombe sur une case et ses voisines.', unlock: 17 },
  fleche_ancre: { name: 'Flèche Ancre', desc: 'Une flèche qui reste plantée et retient : −2 PM pendant deux tours.', unlock: 21 },
  trait_du_veilleur: { name: 'Trait du Veilleur', desc: 'La flèche d\'Ysvane : elle traverse tout ce qui est dans la ligne, jusqu\'au bord ou au premier rocher. +30 % à l\'affût, et une cible marquée se voit à travers les obstacles.', unlock: 26 },
  // Oriel
  lueur: { name: 'Lueur Douce', desc: 'Une lueur qui sait à qui elle parle : sur un allié elle rend 22 à 28 PV, sur un ennemi elle brûle. Une fois par tour.', unlock: 1 },
  eclair_solaire: { name: 'Flammèche', desc: 'Une petite flamme vive jetée sur l\'ennemi, fiable et sans relance.', unlock: 1 },
  manteau_partage: { name: 'Halo de Veille', desc: 'Un halo qui couvre les alliés d\'une croix d\'un bouclier de 12, deux tours durant.', unlock: 13 },
  rappel: { name: 'Mèche Ravivée', desc: 'L\'Oriel ravive la mèche d\'un allié : tous ses malus s\'éteignent.', unlock: 6 },
  flamme_vive: { name: 'Flamme Partagée', desc: 'La flamme brûle l\'ennemi, et la moitié de ce qu\'elle prend revient en PV à l\'Oriel.', unlock: 3 },
  benediction: { name: 'Étincelle Offerte', desc: 'Une étincelle offerte à un allié : +1 PA pour son prochain tour.', unlock: 17 },
  renaissance: { name: 'Renaissance', desc: 'La flamme se rallume d\'un coup : un allié retrouve tous ses PV, mais plus aucun soin ne prend sur lui pendant trois tours.', unlock: 17 },
  aube: { name: 'Aube', desc: 'L\'aube se lève autour de l\'Oriel et soigne tous les alliés à deux cases.', unlock: 26 },
  lumiere_aveuglante: { name: 'Lanterne Brandie', desc: 'La lanterne brandie en plein visage : la cible y perd 1 PA, et un peu de dignité.', unlock: 21 },
  veille: { name: 'Veille', desc: 'L\'Oriel monte la veille sur lui-même : un bouclier de 20 pendant deux tours.', unlock: 1 },
  lanterne_de_veille: { name: 'Lanterne de Veille', desc: 'Une lanterne posée au sol, taillée dans sa propre lumière (25 % de ses PV) : elle soigne les alliés blessés, et en tombant laisse un halo qui soigne encore deux tours.', unlock: 1 },
  ardeur: { name: 'Revers de Flamme', desc: 'Un revers de flamme qui brûle et repousse la cible d\'une case.', unlock: 9 },
  // Nerith, Lame d'Ombre (docs/CLASSES-PRINCIPALES.md)
  double_entaille: { name: 'Double Entaille', desc: 'Les deux lames de pénombre, l\'une après l\'autre.', unlock: 1 },
  voile_penombre: { name: 'Voile d\'Ombre', desc: 'La Nerith se replie dans le pli entre deux Voiles : invisible jusqu\'à la fin de son prochain tour. Frapper ne la révèle qu\'à la fin du tour où elle a frappé.', unlock: 1 },
  piege_penombre: { name: 'Piège de Pénombre', desc: 'Un peu de pénombre posée au sol, invisible : l\'ennemi qui y met le pied est blessé et perd 1 PA.', unlock: 1 },
  larcin: { name: 'Larcin', desc: 'La main qui frappe prend aussi : la Nerith vole 1 PA. Une victime achevée ainsi remplit la bourse (+25 % de Fils et de butin).', unlock: 3 },
  pas_ombre: { name: 'Pas de l\'Ombre', desc: 'Un pas dans le pli, un autre dehors : elle réapparaît sur une case libre en vue, sans se révéler.', unlock: 6 },
  coup_penombre: { name: 'Coup de Pénombre', desc: 'La lame sort de nulle part : dégâts × 1,8 si la Nerith est invisible.', unlock: 9 },
  main_leste: { name: 'Main Leste', desc: 'Elle vole le bouclier de la cible, ou son meilleur bonus si elle n\'en a pas, et le garde pour elle.', unlock: 13 },
  piege_de_reflux: { name: 'Piège de Reflux', desc: 'Un piège qui rejette sa victime loin d\'elle, deux cases, droit sur un autre piège si elle en a posé un, et lui laisse un poison pour deux tours.', unlock: 17 },
  leurre_penombre: { name: 'Leurre de Pénombre', desc: 'Une silhouette d\'ombre, taillée dans ses propres PV (30 %), qui provoque les ennemis à son contact et éclate en tombant.', unlock: 21 },
  dernier_souffle_ombre: { name: 'Dernier Souffle', desc: 'Le coup qui finit : doublé sur une cible sous 30 % de PV. Si elle tombe, la Nerith disparaît de nouveau et récupère 2 PA.', unlock: 26 },
  // Kaldrin
  tourelle_de_kaldum: { name: 'Tourelle de Kaldum', desc: 'Le Kaldrin pose une tourelle rivetée qui tire chaque tour et ne bouge jamais.', unlock: 1 },
  mur_articule: { name: 'Cloison Rivetée', desc: 'Une cloison rivetée se déplie sur une case et bloque tout pendant deux tours.', unlock: 17 },
  mine_a_fil: { name: 'Charge à Cran', desc: 'Une charge armée d\'un cran, enterrée sur une case : elle saute au passage d\'un ennemi.', unlock: 6 },
  marteau: { name: 'Marteau Pilon', desc: 'Le marteau pilon des forges de Kaldum, au contact : lourd et sans surprise.', unlock: 3 },
  surchauffe: { name: 'Soupape Ouverte', desc: 'Une soupape ouverte au visage : la vapeur brûle sur le coup, puis encore deux tours.', unlock: 1 },
  reparation: { name: 'Tour de Clé', desc: 'Un tour de clé bien placé : la tourelle repart, l\'allié aussi.', unlock: 9 },
  propulseur: { name: 'Coup de Piston', desc: 'Un piston qui se détend d\'un coup et projette la cible à trois cases.', unlock: 1 },
  grappin: { name: 'Crochet Tiré', desc: 'Un crochet lancé puis tiré au treuil : la cible vient de deux cases.', unlock: 13 },
  detonation: { name: 'Chaudière Éclatée', desc: 'La tourelle lâche sa chaudière, qui éclate à une case autour d\'elle : où qu\'elle soit, sans besoin de ligne de vue.', unlock: 26 },
  forge: { name: 'Pleine Vapeur', desc: 'Toutes les chaudières à fond : +25 % de dégâts jusqu\'à la fin du prochain tour.', unlock: 21 },
  // Karsh
  serment_de_sang: { name: 'Prix du Sang', desc: 'Le Karsh paie en sang : il perd 15 % de ses PV et gagne 2 PA tout de suite.', unlock: 1 },
  charge: { name: 'Ruée de Braise', desc: 'Une ruée en ligne droite, qui laisse des braises derrière elle, jusqu\'à une case libre.', unlock: 3 },
  taillade: { name: 'Lame Rougie', desc: 'Une lame chauffée à rouge, au contact : le coup de base du Karsh.', unlock: 1 },
  dernier_souffle: { name: 'Dernière Braise', desc: 'Plus le feu est près de s\'éteindre, plus il brûle : dégâts doublés sous 30 % de vie.', unlock: 21 },
  hurlement: { name: 'Cri de Sang', desc: 'Un cri rauque qui secoue les ennemis adjacents : ils perdent 1 PA.', unlock: 13 },
  sang_pour_sang: { name: 'Sang pour Sang', desc: 'Ce que la lame prend, le Karsh le reprend : la moitié des dégâts revient en PV.', unlock: 1 },
  lien_de_sang: { name: 'Lien de Sang', desc: 'Un fil de sang jeté en ligne qui ramène la cible de trois cases, au contact de la lame du Karsh.', unlock: 9 },
  brulure: { name: 'Braise Semée', desc: 'Une braise semée sous la peau, qui brûle encore deux tours.', unlock: 9 },
  colosse: { name: 'Peau de Cendre', desc: 'La peau durcit en cendre : bouclier de 25 pour un tour.', unlock: 6 },
  frappe_lourde: { name: 'Lame Abattue', desc: 'La lame abattue de tout son poids, une fois par tour, qui repousse d\'une case.', unlock: 17 },
  rage: { name: 'Fièvre de Sang', desc: 'Le sang bout : +35 % de dégâts, contre 15 % de ses PV.', unlock: 26 },
  // Mirel
  cadence: { name: 'Temps Fort', desc: 'Un temps fort donné à un allié : +1 PA pour son prochain tour ; chanté pour soi, +2 PA tout de suite. Une fois par tour.', unlock: 1 },
  refrain: { name: 'Refrain de Marche', desc: 'Un refrain qui donne le pas : +1 PM aux alliés d\'une zone.', unlock: 9 },
  dissonance: { name: 'Fausse Note', desc: 'Une fausse note en plein visage : la cible perd 2 PA.', unlock: 6 },
  note_vive: { name: 'Note Piquée', desc: 'Une note piquée, courte et sèche, qui fait mal à cinq cases.', unlock: 1 },
  berceuse: { name: 'Berceuse Lente', desc: 'Une berceuse qui endort les jambes : la cible ne bouge plus pendant un tour.', unlock: 13 },
  envolee: { name: 'Note d\'Envol', desc: 'Une note qui porte : +2 PM à un allié, ou à soi, pour le prochain tour.', unlock: 1 },
  choeur: { name: 'Plein Chœur', desc: 'Tout le monde chante : les alliés à deux cases sont soignés et reçoivent un bouclier de 10.', unlock: 26 },
  cri: { name: 'Éclat de Voix', desc: 'Un éclat de voix qui blesse et repousse d\'une case tous les ennemis d\'une croix, sans relance.', unlock: 17 },
  tempo: { name: 'Mesure Vive', desc: 'La Mirel presse la mesure : +20 % de dégâts et +1 PM au prochain tour.', unlock: 21 },
  silence: { name: 'Accord Grave', desc: 'Un accord grave qui blesse et alourdit les jambes : -1 PM. Il résonne encore deux tours : chaque PM que la cible perd le fait vibrer (5 à 7 air), trois fois au plus.', unlock: 3 },
  // Thalor
  transposition: { name: 'Passe d\'Épaule', desc: 'Une passe d\'épaule : le Thalor échange sa place avec la cible, alliée ou ennemie.', unlock: 3 },
  lancer: { name: 'Grand Jeté', desc: 'Le Thalor empoigne la cible et la jette à trois cases.', unlock: 1 },
  projection: { name: 'Prise Longue', desc: 'Le Porteur attrape à distance et ramène la cible de trois cases.', unlock: 1 },
  // « Poigne » est au Sarkan (Poigne, docs/CLASSES-PRINCIPALES.md) : le coup du Porteur devient Poing Fermé.
  poigne: { name: 'Poing Fermé', desc: 'Un coup de poing fermé, au contact : le coup de base du Porteur.', unlock: 1 },
  ancre: { name: 'Prise au Sol', desc: 'Une prise qui plaque au sol : la cible ne bouge plus pendant un tour.', unlock: 13 },
  bascule: { name: 'Croc en Jambe', desc: 'Un croc en jambe : la cible recule d\'une case et perd 1 PM.', unlock: 9 },
  gorgee_de_cime: { name: 'Gorgée de Cime', desc: 'Une rasade de cidre de Cime : le Porteur titube d\'un pas (−1 PM), encaisse mieux (−15 % de dégâts subis) et ses prises au contact lui rendent des forces (30 % des dégâts en PV), deux tours.', unlock: 9 },
  glyphe_de_garde: { name: 'Glyphe de Garde', desc: 'Un cercle tracé au sol : qui commence son tour dedans reçoit un bouclier pris sur la carrure du lanceur (8 % de ses PV), deux tours durant. Un glyphe par tour.', unlock: 3 },
  glyphe_pesant: { name: 'Glyphe Pesant', desc: 'Un cercle qui alourdit tout ce qui s\'y tient : chaque ennemi qui y commence son tour encaisse 6 à 8 terre et perd 2 PM, deux tours durant. Un glyphe par tour.', unlock: 17 },
  mur_de_chair: { name: 'Dos Rond', desc: 'Le Thalor fait le dos rond et encaisse : bouclier de 20 pendant deux tours.', unlock: 17 },
  vague: { name: 'Rouleau', desc: 'Un rouleau de terre et de pierres lancé en ligne, qui frappe trois cases et repousse d\'une.', unlock: 26 },
  etreinte: { name: 'Prise d\'Ours', desc: 'L\'étreinte de l\'ours : de gros dégâts, et la cible perd 1 PA.', unlock: 21 },
  elan: { name: 'Pas d\'Appui', desc: 'Un pas d\'appui pour la suite : +1 PM tout de suite.', unlock: 3 },
  // Fennal
  appel_du_grouk: { name: 'Appel du Grouk', desc: 'Le Meneur appelle un Grouk apprivoisé, un cogneur qui charge.', unlock: 1 },
  appel_du_pilou: { name: 'Appel du Glym', desc: 'Le Meneur appelle un Glym apprivoisé, un harceleur qui vole des PM.', unlock: 6 },
  rappel_sacrificiel: { name: 'Dernier Appel', desc: 'Le dernier appel : la bête se sacrifie et blesse tous les ennemis autour d\'elle, et le Meneur prend sa force (+25 % de dégâts ce tour et le suivant).', unlock: 13 },
  morsure: { name: 'Crocs du Meneur', desc: 'Le Meneur mord lui-même, à deux cases : il a appris de ses bêtes.', unlock: 1 },
  soin_de_meute: { name: 'Chaleur de Meute', desc: 'La chaleur de la meute referme les plaies d\'un allié ou d\'une bête.', unlock: 1 },
  cri_de_ralliement: { name: 'Meute Lâchée', desc: 'La meute entière répond : +30 % de dégâts pour les alliés à deux cases.', unlock: 21 },
  fleche_de_fil: { name: 'Pierre de Fronde', desc: 'Une pierre de fronde à cinq cases, pour ne pas laisser toute la besogne aux bêtes.', unlock: 3 },
  filet: { name: 'Laisse Jetée', desc: 'Une laisse jetée autour des pattes : la cible ne bouge plus pendant un tour.', unlock: 9 },
  eperon: { name: 'Coup de Sifflet', desc: 'Un coup de sifflet : la bête se réveille et gagne 3 PA pour son prochain tour, de quoi frapper une fois de plus.', unlock: 17 },
  traque: { name: 'Curée', desc: 'La curée : le tir lourd du Meneur, à distance, une fois par tour.', unlock: 26 },
  appel_du_molh: { name: 'Appel du Molh', desc: 'Le Meneur appelle la plus lourde de ses bêtes : un Molh lent et solide, que les ennemis à son contact ne peuvent pas ignorer. Il prend 3 de la jauge de meute.', unlock: 17 },
};

// Les pièges portent leur propre nom dans leur effet (c'est lui que le journal affiche).
const TRAP_RENAMES = { mine_a_fil: 'Charge à Cran' };


for (const id in RENAMES) if (DATA.spells[id]) Object.assign(DATA.spells[id], RENAMES[id]);
for (const id in TRAP_RENAMES) {
  const trap = DATA.spells[id] && DATA.spells[id].effects.find(e => e.type === 'trap');
  if (trap) trap.name = TRAP_RENAMES[id];
}
})();
