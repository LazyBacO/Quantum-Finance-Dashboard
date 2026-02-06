# Auto-Save Feature Documentation

## Overview
The financial dashboard now includes automatic saving of all user modifications to browser localStorage. This ensures that user data persists across page refreshes and browser sessions.

## How It Works

### Data Persistence
All portfolio data is automatically saved whenever changes are made:
- **Accounts** - Add, update, delete, adjust balance, transfer
- **Transactions** - Track income/expenses
- **Financial Goals** - Create and update goals
- **Stock Actions** - Buy/sell orders

### Storage
- **Location**: Browser's localStorage
- **Primary key**: `portfolio_state_v1` (single, versioned payload)
- **Backup key**: `portfolio_state_backup_v1` (last known good payload)
- **Legacy keys**: `portfolio_accounts`, `portfolio_transactions`, `portfolio_goals`, `portfolio_stock_actions` (auto-migrated)
- **Timestamp**: `portfolio_last_saved` stores the ISO timestamp of the last save

### Auto-Save Mechanism
The `PortfolioProvider` in [lib/portfolio-context.tsx](../lib/portfolio-context.tsx) uses a single `useEffect` hook to atomically save all data whenever any state changes:

```tsx
useEffect(() => {
  const state = {
    version: 1,
    accounts,
    transactions,
    goals,
    stockActions,
    lastSaved: new Date().toISOString(),
  }
  savePortfolioState(state)
}, [accounts, transactions, goals, stockActions])
```

## Using the Save Status Hook

To display save status in components, use the `useSaveStatus()` hook:

```tsx
import { useSaveStatus } from "@/hooks/use-save-status"

export function MyComponent() {
  const saveStatus = useSaveStatus()

  return (
    <div>
      <p>Status: {saveStatus.isSaved ? "Saved" : "Not saved"}</p>
      <p>Last saved: {saveStatus.formattedTime}</p>
    </div>
  )
}
```

### Hook Return Value
```typescript
{
  isSaved: boolean,           // true if data has been saved
  formattedTime: string,      // Human-readable time (e.g., "5m ago")
  timestamp: string | null    // ISO timestamp of last save
}
```

## Data Recovery

If data is corrupted or you want to reset to defaults:

1. **Clear localStorage** (in browser console):
   ```javascript
   localStorage.removeItem('portfolio_state_v1')
   localStorage.removeItem('portfolio_state_backup_v1')
   localStorage.removeItem('portfolio_last_saved')
   ```

2. **Refresh the page** - App will load default mock data

## Browser Compatibility
- Works in all modern browsers that support localStorage
- Storage limit: ~5-10MB per domain (varies by browser)
- Data persists until manually cleared

## Error Handling
If localStorage is unavailable (private browsing, storage full, etc.):
- Errors are logged to console but don't break the app
- Data remains in memory during the session
- Falls back to using mock data on next app load

## Future Enhancements
- Backend API integration for cloud persistence
- Export/import functionality for data backup
- Cross-device sync via cloud storage
- Undo/redo history tracking
