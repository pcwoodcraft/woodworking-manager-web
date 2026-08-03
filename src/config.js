// Konfigurácia prostredia — jediné miesto, kde sú pevné identifikátory.

// Web volá edge funkciu PRIAMO (3. 8. 2026). Predtým išiel cez Apps Script `/exec`, ktorý telo
// bez zmeny prepošle na edge — čistý passthrough, ktorý nič nekontroluje ani netransformuje,
// ale stojí ~3 sekundy na KAŽDOM volaní: štart Apps Scriptu, druhý TLS skok z Googlu na
// Supabase a napokon 302 na `script.googleusercontent.com`, odkiaľ si prehliadač ťahá telo.
// Merané na produkcii: cez proxy 2,8–3,5 s, priamo 0,27 s.
//
// Apps Script proxy ZOSTÁVA v prevádzke — mieri naň ešte foto-PWA. Dielenské tablety chodia
// priamo na edge od verzie 1.5.0.
export const API_URL =
  'https://jnsdxdpvkgohxmgykifj.supabase.co/functions/v1/api'

export const GOOGLE_CLIENT_ID =
  '972959482646-qebiecaai72qdcd4e5lfu5ft491vuaps.apps.googleusercontent.com'
