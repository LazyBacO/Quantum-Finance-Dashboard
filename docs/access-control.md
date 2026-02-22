# Access Gate - OpenNova Finance

OpenNova-Finance est public, mais l’usage applicatif est protégé par OpenNova-Access-Control (**repo privé**).

## Variables d’environnement

- `ACCESS_CONTROL_URL` : URL du service privé Access-Control (prod: `https://open-nova-access-control.vercel.app`)
- `ACCESS_CONTROL_CLIENT_SECRET` : secret partagé pour `/api/validate` *(alias accepté: `ACCESS_CLIENT_SECRET`)*
- `ACCESS_SESSION_SECRET` : secret de signature cookie session
- `ACCESS_SESSION_TTL_MINUTES` : durée max session (défaut `15`)
- `ACCESS_CONTROL_BYPASS=true` : mode local permissif (dev uniquement)

## Flux

1. Utilisateur ouvre `/access` et soumet une clé
2. `POST /api/access/exchange` appelle `OpenNova-Access-Control /api/validate`
3. Si valide, cookie `onf_access` signé + `HttpOnly` est émis (cookie de session, sans persistance disque)
4. `middleware.ts` bloque l’app si session absente/invalide/expirée
5. `POST /api/access/logout` détruit la session

## Fail-closed

En production, si Access-Control est indisponible ou non configuré:

- pas de création de session
- accès refusé (erreur 503 côté exchange)

## Sécurité

- Clés one-time consommées à la 1re validation
- Clés temporaires expirent strictement
- Clés permanentes révocables côté service privé
- Ne jamais exposer `ACCESS_CONTROL_CLIENT_SECRET` au navigateur
