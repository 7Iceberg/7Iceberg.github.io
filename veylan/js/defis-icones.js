const DefisIcones = (() => {
  const s = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I = {
    racine: s('<path d="M12 3v10M12 13c-3 0-5 2-6 5M12 13c3 0 5 2 6 5M12 13v7"/><path d="M8 3h8"/>'),
    pas_compte: s('<path d="M9 4c2 0 3 2 3 5s-1 6-3 6-3-3-3-6 1-5 3-5z"/><path d="M8 18h2M16 9v10M14 11l2-2"/>'),
    main_nue: s('<path d="M14 3l7 7-3 3-7-7z"/><path d="M11 6l-7 11 3 3 11-7"/><path d="M5 19l-2 2"/>'),
    sans_repit: s('<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>'),
    designe: s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
    dans_l_ordre: s('<path d="M4 7h2v10M4 17h4"/><path d="M11 8a2 2 0 1 1 3 2l-3 4h4"/><path d="M18 7h3l-2 3a2 2 0 1 1-2 3"/>'),
    eclaireur: s('<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>'),
    au_contact: s('<path d="M3 12h7M7 9l3 3-3 3M21 12h-7M17 9l-3 3 3 3"/>'),
    un_seul_fil: s('<path d="M18 3l3 3-12 12-4 1 1-4z"/><path d="M15 6l3 3"/><path d="M5 19c-1 2 1 3 3 1"/>'),
    econome: s('<circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M3 18h18"/>'),
    vite: s('<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>'),
    intact: s('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M12 7.4V20"/>'),
    epargne: s('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><circle cx="12" cy="11" r="2.5"/>'),
    petit_a_petit: s('<path d="M3 19h5v-4h5v-4h5V7h3"/><path d="M17 4l3 3-3 3"/>'),
    la_tete: s('<path d="M4 9l3 4 5-7 5 7 3-4-2 9H6z"/>'),
    d_un_elan: s('<path d="M4 20L14 6M10 20L20 6"/><path d="M14 6h3M20 6v3"/>'),
    acharne: s('<rect x="3" y="9" width="8" height="6" rx="3"/><rect x="13" y="9" width="8" height="6" rx="3"/><path d="M9 12h6"/>'),
    oeilleres: s('<path d="M5 12s3-4 7-4 7 4 7 4-3 4-7 4-7-4-7-4z"/><circle cx="12" cy="12" r="1.8"/><path d="M3 6v12M21 6v12"/>'),
    girouette: s('<path d="M12 21V9M12 9l-6-3 6-3M12 3l6 3-6 3"/><path d="M8 21h8"/>'),
    au_plus_pres: s('<circle cx="15" cy="9" r="5"/><circle cx="15" cy="9" r="1.5"/><path d="M4 20l7-7"/>'),
    sans_lendemain: s('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/><path d="M5 5l14 14"/>'),
    gants_blancs: s('<path d="M7 21v-8l-2-3 1-1 3 2V5a1.5 1.5 0 0 1 3 0v5M12 9V4a1.5 1.5 0 0 1 3 0v6M15 9a1.5 1.5 0 0 1 3 0v5c0 4-2 7-5 7H7"/>'),
    sans_redite: s('<path d="M4 12a8 8 0 0 1 14-5l2-2v6h-6l2-2a5 5 0 1 0 1 6"/><path d="M4 4l16 16"/>'),
    varie: s('<path d="M12 3l2.5 5 5.5.8-4 3.9 1 5.5L12 15.6 7 18.2l1-5.5-4-3.9 5.5-.8z"/>'),
    sans_arme: s('<path d="M14 3l7 7-3 3-7-7z"/><path d="M11 6l-7 11 3 3 11-7"/><path d="M3 3l18 18"/>'),
    tout_donner: s('<path d="M12 3l7 8-7 10-7-10z"/><path d="M12 3v18M5 11h14"/>'),
    errant: s('<path d="M5 20c2-4 0-6 3-9s6-1 8-4 2-4 2-4"/><circle cx="5" cy="20" r="1.5"/><circle cx="18" cy="3.5" r="1.5"/>'),
    sans_entrave: s('<path d="M7 7a3 3 0 0 1 4 0l1 1M17 17a3 3 0 0 1-4 0l-1-1M9 15l-2 2a3 3 0 0 1-4-4l2-2M15 9l2-2a3 3 0 0 1 4 4l-2 2"/>'),
    indemne: s('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>'),
    sans_soin: s('<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/>'),
    insaisissable: s('<path d="M4 15c3-1 4-5 8-5s5 4 8 5"/><path d="M4 19c3-1 4-4 8-4s5 3 8 4"/><path d="M12 3v4"/>'),
    a_couvert: s('<path d="M3 21V9l5-4 5 4v12M13 13h8v8"/><path d="M17 9l4-3"/>'),
    a_decouvert: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>'),
    rase_murs: s('<path d="M3 3v18M3 7h4M3 12h4M3 17h4"/><circle cx="14" cy="12" r="3"/>'),
    contre_le_mur: s('<path d="M21 3v18M21 7h-4M21 12h-4M21 17h-4"/><path d="M3 12h9M9 9l3 3-3 3"/>'),
    sur_la_place: s('<path d="M12 21s-6-5.6-6-10.5A6 6 0 0 1 18 10.5C18 15.4 12 21 12 21z"/><path d="M9.5 10.5l2 2 3.5-3.5"/>'),
  };
  const defaut = s('<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z"/>');
  const coche = s('<path d="M5 12.5l4.2 4.2L19 7"/>'), croix = s('<path d="M6 6l12 12M18 6L6 18"/>');
  return { de: id => I[id] || defaut, coche, croix, ids: () => Object.keys(I) };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DefisIcones;
