# Safe Sandbox Profile (OpenNova-Finance)

Objectif: tester l'autonomie IA avec des données réalistes mais non sensibles.

## Principes

- Aucune donnée personnelle réelle.
- Comptes de démonstration uniquement.
- Clés API séparées de la prod.
- Alertes critiques activées, actions risquées bloquées.

## Environnement recommandé

- `APP_ENV=sandbox`
- `READ_ONLY_MARKET_MODE=false`
- `ALLOW_REAL_TRADING=false`
- `ALLOW_EXTERNAL_ORDERS=false`
- `ENABLE_PROACTIVE_ALERTS=true`
- `MAX_AUTONOMOUS_ACTIONS_PER_HOUR=3`

## Jeux de données

- Portefeuille démo multi-comptes (cash/enregistré/marge/retraite)
- Données marché avec cas dégradés (stale/missing/provider-fallback)
- Scénarios volatilité élevée et drawdown

## Validation minimale

- CI passing
- E2E passing
- AC PASS/FAIL passing
- Alerte critique testée (ex: feed market indisponible)
