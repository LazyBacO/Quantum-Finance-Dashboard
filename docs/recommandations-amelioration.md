# Recommandations prioritaires pour améliorer OpenNova Finance

Ce plan reste **strictement dans le périmètre du repo** et de la stack actuelle (Next.js App Router + TypeScript + Tailwind + Vitest + providers Massive/TwelveData).

## Top 10 recommandations (ordre d'impact)

### 1) Durcir la résilience des providers marché (Massive/TwelveData)
- **Pourquoi**: l'app dépend des prix live pour Stock Intelligence + Trading Desk; une panne provider dégrade fortement l'expérience.
- **Action concrète**:
  - Ajouter un circuit breaker simple dans `lib/market-data-router.ts` (fenêtre d'échecs, cooldown).
  - Ajouter un cache TTL court (ex: 5–15s) pour les quotes fréquemment demandées.
  - Exposer la source effective (`massive`, `twelvedata`, `fallback`) de façon homogène côté API.
- **Validation**: tests Vitest dédiés sur fallback, timeout et retour de source.

### 2) Renforcer l'idempotence et l'audit du Trading Desk
- **Pourquoi**: la sécurité opérationnelle est critique pour la simulation et future montée en réel.
- **Action concrète**:
  - Rendre l'idempotence systématique pour les appels UI du desk (`Idempotency-Key` obligatoire côté client).
  - Ajouter un hash de payload dans l'audit pour détecter collisions de clé.
  - Ajouter un endpoint de lecture filtrée des événements d'audit (dernier 24h, par symbole, par statut).
- **Validation**: tests `tests/api-trading-orders.test.ts` + nouveaux tests de non-régression idempotence.

### 3) Standardiser les erreurs API (contrat unique)
- **Pourquoi**: aujourd'hui les routes API peuvent diverger en structure d'erreur, ce qui complique le front et les logs.
- **Action concrète**:
  - Introduire un schéma commun `{ code, message, details?, requestId }` dans `lib/`.
  - Appliquer ce contrat sur `/api/chat`, `/api/portfolio`, `/api/trading/*`, `/api/stock-analysis`.
- **Validation**: tests d'API sur erreurs attendues (clé manquante, timeout, validation Zod).

### 4) Observabilité orientée produit (pas seulement technique)
- **Pourquoi**: pour piloter le produit, il faut mesurer les usages et les échecs par feature.
- **Action concrète**:
  - Étendre `app/api/telemetry/route.ts` avec événements normalisés: `chat.request`, `chat.rate_limited`, `market.fallback_used`, `trading.order_rejected`, `analysis.completed`.
  - Ajouter métriques locales agrégées (sans PII ni secrets) affichables dans Settings.
- **Validation**: tests de schéma d'événements + vérification UI des compteurs.

### 5) Fiabiliser la synchro portfolio locale ↔ serveur
- **Pourquoi**: la sync par clé est un axe produit fort; perte de cohérence = perte de confiance.
- **Action concrète**:
  - Versionner le document portfolio (`version`, `updatedAt`, `clientId`).
  - Gérer explicitement conflits d'écriture (last-write-wins documenté ou merge déterministe).
  - Afficher l'état de sync (ok, en attente, conflit, erreur) dans l'UI.
- **Validation**: tests unitaires sur storage/client sync + e2e sur deux sessions simulées.

### 6) Mieux encadrer `/api/chat` (coût, latence, robustesse)
- **Pourquoi**: l'agent IA est central, mais doit rester prévisible en coût et stable.
- **Action concrète**:
  - Ajouter budget de tokens par requête + garde-fou de longueur de contexte.
  - Timeout dur + message de fallback structuré en cas d'upstream lent.
  - Ajouter mode dégradé: réponse concise basée uniquement sur données locales si modèle indisponible.
- **Validation**: tests sur rate-limit, timeout, requêtes volumineuses.

### 7) Consolidation type-safe des contrats front/back
- **Pourquoi**: réduire les divergences silencieuses entre UI et API.
- **Action concrète**:
  - Centraliser les schémas Zod partagés dans `lib/*-types.ts`.
  - Faire dériver les types TypeScript depuis Zod (`z.infer`) partout.
- **Validation**: typecheck + tests des parseurs.

### 8) Qualité de test: scénarios critiques en priorité
- **Pourquoi**: les incidents viennent souvent des flux multi-étapes.
- **Action concrète**:
  - Ajouter un lot e2e focalisé sur 4 journeys: onboarding settings provider, analyse action, ordre rejeté par risk, sync portefeuille.
  - Ajouter tests de charge légère sur endpoints critiques (chat + market-data).
- **Validation**: `pnpm test` + `pnpm e2e` sur CI.

### 9) UX de confiance pour Stock Intelligence
- **Pourquoi**: un signal IA doit être explicable pour être actionnable.
- **Action concrète**:
  - Afficher clairement la contribution technique vs fondamentale (pondération actuelle).
  - Ajouter une section "Pourquoi ce signal ?" avec 3 facteurs majeurs + 2 risques.
  - Ajouter un badge fraîcheur des données marché (timestamp + provider).
- **Validation**: snapshot/component tests UI + retours utilisateur.

### 10) Documentation opérable pour contribution rapide
- **Pourquoi**: accélère les futures PR et limite les régressions.
- **Action concrète**:
  - Ajouter dans `README.md` un runbook "incident provider" et "chat indisponible".
  - Documenter conventions d'erreur API, idempotence et stratégie de sync.
- **Validation**: checklist de doc dans PR template.

## Plan d'exécution proposé (4 sprints)

1. **Sprint 1 (fiabilité marché + chat)**: recommandations 1, 3, 6.
2. **Sprint 2 (trading safety)**: recommandation 2 + tests renforcés.
3. **Sprint 3 (sync & observabilité)**: recommandations 4, 5, 7.
4. **Sprint 4 (UX & docs)**: recommandations 8, 9, 10.

## KPI cibles
- Taux de fallback provider < 15% en heures de marché.
- 0 doublon d'ordre sur même clé d'idempotence.
- p95 `/api/chat` < 6s en charge nominale.
- Taux de succès sync portfolio > 99%.
- Couverture tests sur modules critiques (chat/market/trading/sync) en hausse continue.
