/**
 * OpenNova Index - Exports centralisés
 * Import: import { ... } from '@/lib/opennova'
 */

// Stock Analysis Engine
export {
  calculateTechnicalIndicators,
  analyzeStock,
  analyzeStockPortfolio,
  generateAnalysisSummary,
  type StockPrice,
  type TechnicalIndicators,
  type FundamentalMetrics,
  type StockAIRecommendation,
  type StockAnalysisReport,
  type StockPortfolioAnalysis,
  type StockActionRecord,
} from "@/lib/stock-analysis-engine"

// Stock Analysis Registry
export {
  loadStockAnalysisRegistry,
  saveStockAnalysisRegistry,
  addAnalysisEntry,
  updateAnalysisEntry,
  closePosition,
  getAnalysesBySymbol,
  getActivePositions,
  getClosedPositions,
  calculatePortfolioStats,
  generatePortfolioSummary,
  exportRegistry,
  importRegistry,
  deleteAnalysisEntry,
  archiveAnalysisEntry,
  getRegistrySnapshot,
  type StockAnalysisEntry,
  type StockAnalysisRegistry,
} from "@/lib/stock-analysis-registry"

// Stock Alerts
export {
  loadAlerts,
  saveAlerts,
  loadAlertPreferences,
  saveAlertPreferences,
  getDefaultPreferences,
  createAlert,
  updateAlert,
  deleteAlert,
  getActiveAlertsForSymbol,
  triggerAlert,
  getRecentTriggeredAlerts,
  evaluateAlertCondition,
  formatAlertNotification,
  sendNotification,
  requestNotificationPermission,
  createAutomaticAlert,
  type StockAlert,
  type AlertPreferences,
} from "@/lib/stock-alerts"

// Trading Risk
export {
  buildTradingRiskSnapshot,
  isRiskIncreasingOrder,
} from "@/lib/trading-risk"

// Client Helpers
export {
  analyzeStock as clientAnalyzeStock,
  getPortfolioAnalysis,
  getSymbolAnalyses,
  getAnalysisContextForChat,
  extractSymbols,
  formatAnalysisSummary,
  type StockAnalysisRequest,
  type StockAnalysisResponse,
} from "@/lib/stock-analysis-client"

// UI Components
export { StockAnalysisPanel } from "@/components/kokonutui/stock-analysis-panel"
export { StockAlertsWidget, useStockAlerts } from "@/components/kokonutui/stock-alerts-widget"

// Test Data
export {
  testScenarios,
  createMockStockPrice,
  createMockFundamental,
  createMockTechnical,
  alertTestScenarios,
  performanceTests,
  debugCommands,
} from "@/lib/opennova-tests"
