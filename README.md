# OpenNova Finance

[![Next.js](https://img.shields.io/badge/Next.js-15.2.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org/)
[![AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-6.x-black)](https://sdk.vercel.ai/)
[![License](https://img.shields.io/badge/License-Private-red)](#)

[![CI](https://img.shields.io/github/actions/workflow/status/LazyBacO/OpenNova-Finance/ci.yml?branch=main&label=CI)](https://github.com/LazyBacO/OpenNova-Finance/actions/workflows/ci.yml)
[![E2E](https://img.shields.io/github/actions/workflow/status/LazyBacO/OpenNova-Finance/e2e.yml?branch=main&label=E2E)](https://github.com/LazyBacO/OpenNova-Finance/actions/workflows/e2e.yml)
[![AC PASS/FAIL](https://img.shields.io/github/actions/workflow/status/LazyBacO/OpenNova-Finance/e2e.yml?branch=main&label=AC%20PASS%2FFAIL)](https://github.com/LazyBacO/OpenNova-Finance/actions/workflows/e2e.yml)

OpenNova Finance est une application de pilotage financier augmentee par IA (GPT-5.3-Codex):
- vision globale du portefeuille (comptes, transactions, objectifs, actions),
- trading paper avec garde-fous de risque institutionnels,
- intelligence boursiere autonome (RSI, MACD, fondamentaux, alertes),
- mode marche reel via Massive API (Polygon) avec fallback intelligent,
- assistance conversationnelle contextuelle en continu.

## Apercu visuel

![Screenshot OpenNova Finance Dashboard](public/opennova-dashboard-screenshot.png)

_Capture reelle du dashboard OpenNova Finance (vue desktop)._

## Presentation

OpenNova combine 3 couches dans une seule interface:

1. `Finance Core`
   Comptes, cashflow, objectifs, budget mensuel, planification.
2. `AI Intelligence`
   Agent IA GPT-5.3-Codex, priorites automatiques, recommandations proactives.
3. `Execution & Risk`
   Trading desk simule, idempotence des ordres, audit trail, kill-switch, drawdown controls.

Le tout est pense pour une experience produit complete: analyser, decider, executer, puis mesurer.

## Fonctionnalites principales

- AI Advisor branche sur GPT-5.3-Codex via `/api/chat`
- Growth Studio: allocation cible, simulation Monte Carlo, guardrails
- Trading Desk IA:
  - execution paper (`market`/`limit`),
  - policy de risque editable,
  - statut de risque dynamique (`ok/watch/restrict/halt`),
  - idempotency des ordres via header `Idempotency-Key`,
  - audit trail dans `data/trading-audit.ndjson`
- Stock Intelligence:
  - analyse technique (RSI, MACD, SMA, Bollinger, ATR, ADX),
  - analyse fondamentale (PE, ROE, growth, FCF...),
  - registre des positions et performance,
  - alertes intelligentes et signaux proactifs,
  - test de connexion API Massive/TwelveData depuis `Settings`
- Persistance locale (`localStorage`) + sync serveur par cle (`/api/portfolio`)
- Qualite logicielle: typecheck + lint + tests + build

## Installation rapide

### Prerequis

- Node.js 20 LTS recommande
- pnpm

### 1) Installer les dependances

```bash
pnpm install
```

### 2) Configurer les variables d'environnement

Cree un fichier `.env.local` a la racine:

```bash
# Obligatoire pour l'agent IA
OPENAI_API_KEY=your_openai_api_key

# Optionnel (defaut: gpt-5.3-codex)
OPENAI_MODEL=gpt-5.3-codex

# Optionnel (label affiche dans l'UI)
NEXT_PUBLIC_OPENAI_MODEL_LABEL=GPT-5.3-Codex

# Optionnel (SEO canonical)
NEXT_PUBLIC_SITE_URL=https://your-domain.example

# Optionnel (securise /api/notification-cron)
NOTIFICATION_CRON_SECRET=your_cron_secret

# Optionnel (rate limit /api/chat)
AI_RATE_LIMIT_WINDOW_MS=60000
AI_RATE_LIMIT_MAX_REQUESTS=20
AI_RATE_LIMIT_TRUST_PROXY_HEADERS=true
AI_RATE_LIMIT_USER_AGENT_SALT=change_me

# Optionnel (active les donnees de marche reelles Massive/Polygon)
MASSIVE_API_KEY=your_massive_api_key
MASSIVE_LIVE_DATA=true
MASSIVE_API_BASE_URL=https://api.massive.com
MASSIVE_HTTP_TIMEOUT_MS=8000

# Optionnel (active les cotations temps reel via TwelveData)
TWELVEDATA_API_KEY=your_twelvedata_api_key
TWELVEDATA_LIVE_DATA=true
TWELVEDATA_API_BASE_URL=https://api.twelvedata.com
TWELVEDATA_HTTP_TIMEOUT_MS=8000
```

Astuce: depuis `Settings > Donnees de marche`, l'utilisateur peut remplacer les cles Massive et TwelveData a tout moment sans modifier le code.

### 3) Lancer l'application

```bash
pnpm dev
```

Application accessible sur `http://localhost:3000` (redirection vers `/dashboard`).

## Integrations API de marche (Massive + TwelveData)

Cette section decrit clairement ce qui est integre dans OpenNova pour les donnees boursieres en temps reel.

### Ce qui est deja integre

| Integration | Role dans l'application | Configuration | Remplacement par utilisateur |
|---|---|---|---|
| `Massive (Polygon)` | Cotations/actions + contexte analyse | `.env.local` (`MASSIVE_*`) | Oui, depuis `Settings > Donnees de marche` |
| `TwelveData` | Cotations temps reel + contexte analyse | `.env.local` (`TWELVEDATA_*`) | Oui, depuis `Settings > Donnees de marche` |
| `Routage multi-provider` | Fallback automatique (`auto`) entre providers | `provider: auto/massive/twelvedata` | Oui, via select dans `Settings` |

### Interface Settings (visible pour l'utilisateur)

Dans `Settings > Donnees de marche`, l'utilisateur peut:
- choisir le provider prioritaire (`auto`, `massive`, `twelvedata`),
- remplacer la cle Massive,
- remplacer la cle TwelveData,
- cliquer sur `Tester la connexion API` pour Massive,
- cliquer sur `Tester la connexion API` pour TwelveData.

Le test de connexion affiche un statut explicite:
- `Test en cours...`
- `Connexion OK (...)`
- message d'erreur detaille (cle manquante, provider desactive, erreur upstream).

### Headers API supportes pour les donnees de marche

OpenNova accepte des overrides par requete via headers:
- `x-market-provider: auto|massive|twelvedata`
- `x-massive-api-key: <cle_massive>`
- `x-twelvedata-api-key: <cle_twelvedata>`

Ces headers sont utilises automatiquement par le client interne quand l'utilisateur configure ses cles dans `Settings`.

## Manuel d'utilisation

### Etape 1 - Verifier l'agent IA

1. Ouvre le dashboard.
2. Va dans la section `Agent IA`.
3. Envoie une question simple:
   `Analyse ma situation actuelle`.
4. Verifie que la reponse mentionne le modele configure (ex: GPT-5.3-Codex).

### Etape 2 - Configurer le Trading Desk

1. Ouvre `Trading Desk IA`.
2. Regle la policy de risque:
   - `Max position (%)`
   - `Max ordre (USD)`
   - `Max positions ouvertes`
   - `Perte max journaliere (USD)`
   - `Drawdown max (%)`
   - `Kill-switch global`
3. Sauvegarde la policy.
4. Verifie l'etat de risque (`ok/watch/restrict/halt`) et les signaux actifs.

### Etape 3 - Executer un ordre paper

1. Saisis `symbol`, `quantite`, `side`, `type`.
2. Lance l'ordre.
3. Controle:
   - resultat (`filled` ou `rejected`),
   - message de rejet explicite en cas de guardrail,
   - impact sur cash/equity/positions.

### Etape 4 - Valider les integrations API de marche

1. Ouvre `Settings`.
2. Va dans `Donnees de marche`.
3. Colle tes cles API:
   - `TwelveData`
   - `Massive (Polygon)`
4. Clique `Tester la connexion API` pour chaque provider.
5. Verifie le retour:
   - succes avec source et prix,
   - ou erreur explicite a corriger.

### Etape 5 - Exploiter Stock Intelligence

1. Ouvre `Stock Intelligence IA`.
2. Lance une analyse manuelle sur un ticker (ex: `AAPL`).
3. Observe:
   - signal (`buy/sell/hold...`),
   - confiance,
   - risk score,
   - target / stop,
   - recommandations proactives.
4. Consulte `Alertes intelligentes actions`.

## Variables d'environnement

| Variable | Requise | Description |
|---|---|---|
| `OPENAI_API_KEY` | Oui | Cle serveur pour `/api/chat` |
| `OPENAI_MODEL` | Non | Modele IA (defaut: `gpt-5.3-codex`) |
| `NEXT_PUBLIC_OPENAI_MODEL_LABEL` | Non | Label UI du modele |
| `NEXT_PUBLIC_SITE_URL` | Non | URL canonique SEO |
| `NOTIFICATION_CRON_SECRET` | Non | Secret de protection `/api/notification-cron` |
| `AI_RATE_LIMIT_WINDOW_MS` | Non | Fenetre de rate limiting du chat |
| `AI_RATE_LIMIT_MAX_REQUESTS` | Non | Max de requetes IA par fenetre |
| `AI_RATE_LIMIT_TRUST_PROXY_HEADERS` | Non | Active/desactive l'usage des headers proxy (`Forwarded`, `x-forwarded-for`) |
| `AI_RATE_LIMIT_USER_AGENT_SALT` | Non | Salt serveur pour hachage du fallback user-agent |
| `MASSIVE_API_KEY` | Non | Cle Massive (Polygon) pour donnees de marche reelles |
| `MASSIVE_LIVE_DATA` | Non | Active/desactive le mode live (`true` par defaut si cle presente) |
| `MASSIVE_API_BASE_URL` | Non | URL API Massive (defaut: `https://api.massive.com`) |
| `MASSIVE_HTTP_TIMEOUT_MS` | Non | Timeout HTTP pour appels Massive |
| `TWELVEDATA_API_KEY` | Non | Cle TwelveData pour cotations temps reel |
| `TWELVEDATA_LIVE_DATA` | Non | Active/desactive la source TwelveData |
| `TWELVEDATA_API_BASE_URL` | Non | URL API TwelveData (defaut: `https://api.twelvedata.com`) |
| `TWELVEDATA_HTTP_TIMEOUT_MS` | Non | Timeout HTTP pour appels TwelveData |

## API utiles

### Chat IA
- `POST /api/chat`
- Validation Zod + rate limit + key serveur uniquement

### Trading
- `GET /api/trading/overview`
- `GET /api/trading/orders`
- `POST /api/trading/orders`
- `GET /api/trading/policy`
- `PUT /api/trading/policy`
- `GET /api/trading/quotes?symbols=AAPL,MSFT`

Headers recommandes pour la creation d'ordre:
- `Idempotency-Key: <unique_key>`
- `X-Order-Source: ui|api|ai`

### Stock Analysis
- `POST /api/stock-analysis`
- `GET /api/stock-analysis?action=health`
- `GET /api/stock-analysis?action=sample&symbol=AAPL`

Headers marche supportes sur `POST /api/stock-analysis`:
- `x-market-provider: auto|massive|twelvedata`
- `x-massive-api-key: <cle_massive>`
- `x-twelvedata-api-key: <cle_twelvedata>`

### Market Data Connectivity (nouveau)
- `POST /api/market-data/test-connection`

Permet de verifier rapidement qu'une cle API provider fonctionne.

Exemple requete Massive:

```http
POST /api/market-data/test-connection
content-type: application/json
x-market-provider: massive
x-massive-api-key: your_massive_api_key

{
  "provider": "massive",
  "symbol": "AAPL"
}
```

Exemple requete TwelveData:

```http
POST /api/market-data/test-connection
content-type: application/json
x-market-provider: twelvedata
x-twelvedata-api-key: your_twelvedata_api_key

{
  "provider": "twelvedata",
  "symbol": "MSFT"
}
```

Reponse de succes (exemple):

```json
{
  "success": true,
  "data": {
    "provider": "twelvedata",
    "source": "twelvedata-live",
    "symbol": "MSFT",
    "currentPrice": 421.55,
    "lastUpdatedIso": "2026-02-10T21:00:00.000Z"
  }
}
```

Reponse d'erreur (exemple):

```json
{
  "success": false,
  "error": "Cle Massive manquante.",
  "provider": "massive",
  "symbol": "AAPL"
}
```

### Sync portefeuille
- `GET /api/portfolio`
- `PUT /api/portfolio`

Authentification par cle de sync:
- header `x-sync-key`
- ou `Authorization: Bearer <sync_key>`

## Donnees et persistance

- Persistance client: `localStorage` (portfolio + stock registry + alertes)
- Persistance serveur trading: `data/trading-paper.json`
- Journal d'audit trading: `data/trading-audit.ndjson`

## Qualite et verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Architecture (fichiers cles)

- `app/api/chat/route.ts` - orchestration GPT-5.3-Codex
- `lib/ai-finance-intelligence.ts` - scoring global finance + priorites
- `lib/trading-risk.ts` - moteur de risque (kill-switch, drawdown, regime)
- `lib/trading-engine.ts` - execution paper + validation guardrails
- `lib/trading-storage.ts` - persistance trading + audit
- `lib/stock-analysis-engine.ts` - analyse technique/fondamentale
- `lib/stock-alerts.ts` - alertes et signaux proactifs
- `components/kokonutui/ai-advisor.tsx` - UI agent IA
- `components/kokonutui/ai-trading-desk.tsx` - UI execution + policy risque
- `components/kokonutui/stock-analysis-panel.tsx` - UI analyse boursiere

## Securite

- `OPENAI_API_KEY` n'est jamais lue depuis le client.
- `/api/chat` refuse les payloads invalides (Zod) et applique un rate limit avec identification client robuste (IP proxy/CDN puis fallback user-agent hache).
- `/api/trading/orders` supporte l'idempotence pour eviter les doubles executions.
- Si `NOTIFICATION_CRON_SECRET` est defini, `/api/notification-cron` exige:
  - `x-cron-secret: <secret>` ou
  - `Authorization: Bearer <secret>`

## Liens documentation interne

- `OPENNOVA_SYSTEM.md` - vue systeme complete
- `OPENNOVA_ARCHITECTURE.md` - schema architecture
- `OPENNOVA_QUICKSTART.md` - guide rapide
- `AI_SETUP.md` - setup IA minimal

## QA

- Dashboard QA (GitHub Pages): `https://lazybaco.github.io/OpenNova-Finance/qa-dashboard/`
- Historique des runs QA: `docs/history/history.json`
