# 📊 OpenNova - Système d'Analyse Boursière Autonome

## Vue d'Ensemble

OpenNova est un système d'analyse boursière autonome **intégré dans le dashboard financier**, conçu pour l'IA `GPT-5.3-Codex`. Le système combine:

- **Analyse Technique Avancée**: RSI, MACD, Bandes de Bollinger, ATR, ADX
- **Analyse Fondamentale**: P/E, ROE, Flux de Trésorerie, Croissance
- **Recommandations IA**: Signaux buy/sell avec confiance et targets
- **Registre de Positions**: Historique complet des trades et performances
- **Alertes Autonomes**: Notifications en temps réel basées sur conditions
- **Risk Guardrails Institutionnels**: Kill-switch, drawdown max, perte journalière max, cap positions

---

## Architecture Système

### 1. **Stock Analysis Engine** (`lib/stock-analysis-engine.ts`)
Moteur central d'analyse avec indicateurs techniques et scoring IA.

```typescript
// Indicateurs techniques
interface TechnicalIndicators {
  sma20, sma50, sma200          // Moyennes mobiles
  rsi14                          // Relative Strength Index
  macd                           // MACD + signal + histogram
  bollinger                      // Bandes de Bollinger
  atr, adx                       // Volatilité + force de tendance
}

// Scoring IA automatique
const recommendation = analyzeStock(symbol, prices, technical, fundamental)
// Signal: strong-buy | buy | hold | sell | strong-sell
// Confidence: 0-100
// Price Target, Stop Loss, Take Profit
```

**Flux d'Analyse:**
1. Récupère/génère historique des prix (200 jours)
2. Calcule indicateurs techniques → Score technique (0-100)
3. Évalue métriques fondamentales → Score fondamental (0-100)
4. Combine scores (40% technique, 60% fondamental) → Signal IA
5. Génère targets et stop losses basés sur risque

### 2. **Stock Analysis Registry** (`lib/stock-analysis-registry.ts`)
Registre persistant pour historic des analyses et positions.

```typescript
interface StockAnalysisEntry {
  id: string
  action: StockAction              // Buy/Sell avec prix d'entrée
  analysis: StockAnalysisReport    // Snapshot de l'analyse
  recommendation: StockAIRecommendation
  createdAt: string
  status: "active" | "closed" | "archived"
  exitPrice?: number               // Prix de sortie
  realizedGainLoss?: number        // Gains/pertes réalisés
}

// Storage: localStorage (persistance automatique)
loadStockAnalysisRegistry()        // Charge depuis localStorage
saveStockAnalysisRegistry(registry) // Sauvegarde
addAnalysisEntry(action, analysis) // Ajoute une nouvelle analyse
closePosition(entryId, exitPrice)  // Ferme une position
calculatePortfolioStats()          // Stats globales
```

**Métriques Calculées:**
- Total investi, Gains/Pertes réalisés
- Rendement moyen, Taux de gain
- Win/Loss ratio
- Meilleure/pire trade

### 3. **Stock Alerts System** (`lib/stock-alerts.ts`)
Système autonome d'alertes avec notifications.

```typescript
interface StockAlert {
  symbol: string
  type: "price-target" | "rsi-signal" | "volatility" | "trend" | "news"
  severity: "info" | "warning" | "critical"
  message: string
  condition: string
  isActive: boolean
}

// Créer une alerte
createAlert(symbol, type, condition, message, severity)

// Évaluer si condition est satisfaite
evaluateAlertCondition(alert, currentPrice, rsi, volume, previousClose)

// Envoyer notification
sendNotification(alert, currentPrice, method)

// Alertes automatiques basées sur analyses
createAutomaticAlert(symbol, signal, priceTarget, riskScore)
```

### 4. **API Endpoint** (`app/api/stock-analysis/route.ts`)

#### POST /api/stock-analysis
Analyse une action et enregistre le résultat.

```bash
curl -X POST http://localhost:3000/api/stock-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "currentPrice": 185.50,
    "high52week": 199.62,
    "low52week": 164.04,
    "pe": 28.5,
    "roe": 85.3,
    "growthRate": 12.5,
    "action": "buy",
    "shares": 100,
    "notes": "Breakout position"
  }'
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "report": { /* full analysis report */ },
    "recommendation": {
      "symbol": "AAPL",
      "signal": "buy",
      "confidence": 78,
      "priceTarget": 195.50,
      "stopLoss": 170.67,
      "riskScore": 42,
      "potentialReturn": 5.4
    },
    "summary": "📊 AAPL Analysis...",
    "entryId": "analysis-xxx"
  }
}
```

#### GET /api/stock-analysis?action=portfolio
Récupère analyse du portefeuille entier.

```json
{
  "stats": {
    "totalInvested": 50000,
    "totalRealizedGainLoss": 2500,
    "winRate": 65.5,
    "activePositions": 5,
    "closedPositions": 8
  }
}
```

---

## Risk Guardrails Institutionnels (v1.1)

Le paper trading intègre désormais un moteur de risque dynamique pour éviter les dérives d'exécution:

- **Kill-switch manuel**: arrêt immédiat de tout nouvel ordre.
- **Max Drawdown %**: passage en `HALT` si le drawdown portefeuille dépasse le seuil.
- **Perte journalière max**: blocage automatique après dépassement du seuil de perte réalisée.
- **Max positions ouvertes**: limite de complexité/exposition.
- **Idempotency-Key**: anti-doublons API pour éviter les ordres répétés.
- **Audit trail**: journal `data/trading-audit.ndjson` pour traçabilité complète.

États de risque:
- `OK`: exécution normale.
- `WATCH`: surveillance renforcée.
- `RESTRICT`: pas de nouvelle prise de risque.
- `HALT`: exécution stoppée.

Ces signaux sont exposés dans:
- `GET /api/trading/overview` (`risk` snapshot complet)
- UI `AI Trading Desk` (niveau, drawdown, signaux actifs)
- Contexte GPT-5.3 dans `/api/chat` (guidance alignée sur garde-fous)

---

## Intégration avec l'IA Chat (Codex)

### Stock Context Automatique

L'IA reçoit automatiquement le contexte du registre d'analyses:

```typescript
// Dans le chat, l'IA a accès à:
📈 Registre des Analyses Boursières
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Capital Investi: $50,000
Gain/Perte Réalisé: $2,500 (5%)
Rendement Moyen: 6.2%
Positions Actives: 5
Positions Fermées: 8
Taux de Gain: 65.5%
```

### Commandes Intelligentes

L'utilisateur peut demander à l'IA:

```
"Analyse TSLA pour moi"
→ IA: Récupère données via API, analyse, affiche résumé

"Quelle est ma meilleure position?"
→ IA: Consulte registre, donne réponse basée sur gains réalisés

"Devrai-je vendre MSFT maintenant?"
→ IA: Analyse signal actuel, compare avec prix d'entrée, recommande

"Crée une alerte pour GOOGL si elle passe $150"
→ IA: Crée alerte avec condition de prix
```

---

## Composants UI

### 1. **Stock Analysis Panel** (`components/kokonutui/stock-analysis-panel.tsx`)
Interface complète pour analyses.

**Fonctionnalités:**
- Formulaire d'analyse rapide
- Vue d'ensemble des stats
- Liste des positions actives
- Historique des positions fermées
- Registre d'analyses complet

**Tabs:**
- **Vue d'Ensemble**: Stats globales + meilleure/pire trade
- **Positions Actives**: Bouton pour fermer les positions
- **Positions Fermées**: Gains/pertes réalisés
- **Registre Complet**: Histoire d'analyses avec statut

### 2. **Stock Alerts Widget** (`components/kokonutui/stock-alerts-widget.tsx`)
Widget d'affichage des alertes en temps réel.

```tsx
<StockAlertsWidget maxAlerts={5} />
```

**Affiche:**
- 🔔 Compteur d'alertes non lues
- Liste des alertes avec sévérité (🔴 critical, 🟡 warning, ℹ️ info)
- Détails au clic
- Bouton dismiss

### 3. **Stock Analysis Client** (`lib/stock-analysis-client.ts`)
Helper pour le frontend.

```typescript
// Analyser une action
analyzeStock({ symbol: "AAPL", currentPrice: 185.50, ... })

// Récupérer stats du portefeuille
getPortfolioAnalysis()

// Récupérer analyses d'un symbole
getSymbolAnalyses("AAPL")

// Extraire symboles d'un message
extractSymbols("What about AAPL and MSFT?")
// → ["AAPL", "MSFT"]
```

---

## Flux Hôte Complet: Utilisateur → IA → Système

```
1. UTILISATEUR DEMANDE
   "Analyse AMD maintenant à $165"

2. IA REÇOIT +CONTEXTE
   - Portfolio snapshot actuel
   - Registre des 5 dernières analyses
   - Positions ouvertes


3. L'IA DÉCIDE D'AGIR
   - Reconnaît le symbole AMD
   - Reconnaît prix 165
   - Appelle `/api/stock-analysis`


4. SYSTÈME ANALYSE
   - Calcule indicateurs techniques
   - Évalue fondamentaux
   - Génère signal IA
   - Enregistre dans registre


5. IA REÇOIT RÉSULTAT
   {
     "signal": "buy",
     "confidence": 81,
     "priceTarget": 172,
     "stopLoss": 161,
     ...
   }


6. IA RÉPOND À L'UTILISATEUR
   "📊 AMD Analysis
    Signal: Buy ⬆️ (81% confidence)
    Target: $172
    Stop Loss: $161
    Risk Score: 38/100
    
    Raison: RSI haussier + MACD positif
   "


7. OPTIONNEL: CRÉER ALERTE
   - IA crée alerte "Price > $172"
   - Widget affichera "🔔 1 nouvelle alerte AMD"
```

---

## Métriques & Scoring

### Score Technique (0-100)
```
RSI Analysis:
  - RSI < 30 → +20 (survendu)
  - RSI > 70 → -20 (suracheté)
  - Sinon  → ±(50 - RSI) × 0.4

MACD:
  - Positif → +15
  - Négatif → -15

Moving Averages:
  - Prix > SMA200 → +10
  - Prix > SMA50  → +5

ADX (Force de tendance):
  - Ajoute ADX × 0.2
```

### Score Fondamental (0-100)
```
P/E Valuation:
  - P/E < 20 → +20
  - P/E > 30 → -20

ROE (Rentabilité):
  - ROE > 15% → +15
  - ROE < 8%  → -15

Growth:
  - Growth > 15% → +20
  - Growth < 0%  → -20

Free Cash Flow:
  - FCF > 0  → +10
  - FCF ≤ 0  → -10
```

### Signal Final
```
aiScore = (technicalScore × 0.4) + (fundamentalScore × 0.6)

Signal:
  - aiScore ≥ 75 → Strong Buy 🚀
  - aiScore ≥ 60 → Buy ⬆️
  - aiScore ≥ 40 → Hold 📌
  - aiScore ≥ 25 → Sell ⬇️
  - aiScore < 25  → Strong Sell ⚠️
```

---

## Persévérance & Autonomie

L'IA Codex maintient **l'autonomie max** en:

1. **Initiant les analyses** sans attendre l'utilisateur
   → "Je remarque que NVDA a un RSI survendu"

2. **Créant des alertes proactives**
   → "J'ai créé une alerte pour vous avertir si TSLA franchit $250"

3. **Gérant automatiquement les positions**
   → "Votre position QQQ a atteint le target, devrions-nous la fermer?"

4. **Fournissant des insights continus**
   → "Vos 5 dernières trades: +2.5% avg | Win rate: 60% | Best: +8.3%"

5. **Recommandant des actions basées sur patterns**
   → "AMD montre le même pattern haussier que la semaine dernière"

---

## Configuration & Variables d'Environnement

```env
# .env.local
NEXT_PUBLIC_OPENAI_MODEL_LABEL=GPT-5.3-Codex
OPENAI_MODEL=gpt-4-turbo              # Model pour API

# Rate limiting
AI_RATE_LIMIT_WINDOW_MS=60000         # 60 secondes
AI_RATE_LIMIT_MAX_REQUESTS=20         # Max 20 requêtes par window
```

---

## Cas d'Usage

### 1. Day Trader
```
Demande: "Signal sur mes 3 holdings"
Répond: Affiche RSI/MACD pour chaque, give buy/sell signals
```

### 2. Long-term Investor
```
Demande: "Actions solides pour 5 ans?"
Répond: Filtre par croissance >10% annuel, ROE >15%, P/E < 25
```

### 3. Risk Management
```
Demande: "Quelles positions ont un risque > 50?"
Répond: Liste positions + risk scores + recommandations de hedging
```

### 4. Performance Tracking
```
Demande: "Résumé de mes trades ce mois"
Répond: Total investi, gains réalisés, win rate, meilleure/pire trade
```

---

## Prochaines Améliorations

- ⏳ **Real-time Data**: Intégration avec APIs (AlphaVantage, Finnhub)
- 📱 **Mobile Alerts**: Push notifications natives
- 📈 **Backtesting**: Tester stratégies sur données historiques
- 🤖 **ML Predictions**: Prédictions avec ML (LSTM, XGBoost)
- 📊 **Advanced Charts**: TradingView embeds
- 💬 **Voice Commands**: "Alexa, buy 100 AAPL"
- 🔄 **Auto Rebalancing**: Recommander quand rééquilibrer

---

## Support & Documentation

- **API Docs**: [OpenAPI Spec]
- **UI Components**: [Storybook]
- **Client Methods**: [TypeScript Generics]
- **Storage**: [LocalStorage Persistence]

---

**OpenNova v1.0** | Powered by GPT-5.3-Codex | 📊 Advanced Trading Intelligence
