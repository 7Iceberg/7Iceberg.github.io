(() => {
DATA.knots = [
  { id: 'noeud_lourd', name: 'Nœud Lourd', level: 11, desc: 'Tu as 1 PM de moins pendant tout le combat.',
    recipe: [{ id: 'cuir_de_grouk', count: 6 }, { id: 'bois_noueux', count: 3 }] },
  { id: 'noeud_de_garde', name: 'Nœud de Garde', level: 15, desc: 'Les monstres commencent avec un bouclier d\'un cinquième de leurs PV.',
    recipe: [{ id: 'cire_de_veilloche', count: 6 }, { id: 'lueur_de_veilloche', count: 1 }] },
  { id: 'noeud_de_meute', name: 'Nœud de Meute', level: 19, desc: 'Un monstre de plus dans chaque groupe.',
    recipe: [{ id: 'plume_de_pilou', count: 10 }, { id: 'cuir_de_grouk', count: 6 }] },
  { id: 'noeud_d_ombre', name: 'Nœud d\'Ombre', level: 23, desc: 'Un monstre au hasard est invisible un tour sur deux.',
    recipe: [{ id: 'soie_de_tissefil', count: 8 }, { id: 'venin_de_tissefil', count: 1 }] },
  { id: 'noeud_de_fer', name: 'Nœud de Fer', level: 31, desc: 'Les monstres ne peuvent plus être poussés, attirés ni déplacés.',
    recipe: [{ id: 'galet_de_brimbe', count: 8 }, { id: 'herbe_de_veille', count: 4 }] },
  { id: 'noeud_serre', name: 'Nœud Serré', level: 35, desc: 'Tu commences le combat avec 2 PA de moins à ton premier tour.',
    recipe: [{ id: 'soie_de_tissefil', count: 6 }, { id: 'galet_de_brimbe', count: 6 }] },
  { id: 'noeud_de_braise', name: 'Nœud de Braise', level: 43, desc: 'Chaque coup d\'un monstre te brûle : 4 dégâts de feu par tour pendant deux tours.',
    recipe: [{ id: 'braise_de_kaldrik', count: 3 }, { id: 'scorie_de_kaldrik', count: 8 }] },
  { id: 'noeud_de_sang', name: 'Nœud de Sang', level: 51, desc: 'Les monstres récupèrent 10 % des dégâts qu\'ils t\'infligent.',
    recipe: [{ id: 'cendre_de_cendrou', count: 8 }, { id: 'suie_de_fumerolle', count: 4 }] },
];
DATA.rules.maxKnots = 4;
DATA.rules.knotBonus = 15;

for (const k of DATA.knots) {
  DATA.content.recipes.push({ result: k.id, count: 1, workshop: 'tailleur', ingredients: k.recipe });
}

const regions = { orsane: 'Orsane', kaldum: 'Kaldum' };
for (const r in regions) {
  const n = Object.values(DATA.monsters).filter(m => m.region === r && !m.summon).length;
  DATA.content.achievements.push(
    { id: `carnet_${r}_tiers`, name: `Carnet : ${regions[r]}, premières pages`, desc: `Inscrire ${Math.ceil(n / 3)} bêtes de ${regions[r]} au Carnet.`, cond: { type: 'carnet', region: r, count: Math.ceil(n / 3) }, rewards: { xp: 300, fils: 60 } },
    { id: `carnet_${r}_complet`, name: `Carnet : ${regions[r]} complet`, desc: `Inscrire les ${n} bêtes de ${regions[r]} au Carnet, boss et rares compris.`, cond: { type: 'carnet', region: r, count: n }, rewards: { xp: 3000, fils: 500, title: `Mémoire de ${regions[r]}` } },
  );
}
DATA.content.achievements.push(
  { id: 'noeud_premier', name: 'Premier nœud', desc: 'Gagner un combat avec au moins un Nœud noué.', cond: { type: 'feat', key: 'noeuds_1', count: 1 }, rewards: { xp: 200, fils: 40 } },
  { id: 'noeud_quatre', name: 'Quatre nœuds', desc: 'Gagner un combat avec quatre Nœuds noués.', cond: { type: 'feat', key: 'noeuds_4', count: 1 }, rewards: { xp: 1500, fils: 300, title: 'Nœud gordien' } },
);
})();
