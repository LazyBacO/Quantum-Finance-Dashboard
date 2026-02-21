# Sécurité d’accès - OpenNova Finance

## Menaces couvertes

- **Clé leak**: validation server-to-server uniquement, pas de stockage client.
- **Replay**: clé one-time consommée par Access-Control.
- **Brute-force basique**: rate limit côté Access-Control + fail fermé.

## Rotation des secrets

- `ACCESS_CONTROL_CLIENT_SECRET`: rotation coordonnée avec Access-Control.
- `ACCESS_SESSION_SECRET`: rotation régulière (invalide sessions anciennes).

## Bonnes pratiques

- Restreindre CORS/origines de confiance au service privé.
- Ajouter rate limit côté edge/reverse proxy.
- Journaliser tentatives invalides/anormales.
- Garder OpenNova-Access-Control en **repo privé**.
