# Copilot Instructions for Financial Dashboard

## Project Overview
This is a **Next.js 15 financial dashboard** with AI-powered advisory features. The architecture separates concerns into:
- **UI Components**: Radix UI primitives in `components/ui/` (auto-generated, avoid modifying directly)
- **KokonutUI Dashboard**: Custom financial dashboard in `components/kokonutui/`
- **State Management**: React Context (`PortfolioProvider`) in `lib/portfolio-context.tsx`
- **Data Layer**: Centralized portfolio data in `lib/portfolio-data.ts`
- **AI Backend**: Streaming chat API in `app/api/chat/route.ts`

## Key Architecture Patterns

### Portfolio Context (Client State)
The `PortfolioProvider` in [lib/portfolio-context.tsx](lib/portfolio-context.tsx) manages all financial data with these operations:
- **Accounts**: Add, update, delete, adjust balance, transfer between accounts
- **Transactions**: Track income/expenses
- **Goals**: Financial targets with progress tracking
- **Stock Actions**: Buy/sell order history

Use `usePortfolio()` hook in client components to access and mutate this state. Example:
```tsx
const { accounts, addAccount, updateAccount, totalBalance, lastSaved } = usePortfolio()
```

### Auto-Save to LocalStorage
All portfolio data is automatically persisted to browser localStorage whenever changes occur. No manual save needed.
- **Hook**: `useSaveStatus()` from [hooks/use-save-status.ts](hooks/use-save-status.ts) provides formatted save timestamps
- **Storage Keys**: `portfolio_accounts`, `portfolio_transactions`, `portfolio_goals`, `portfolio_stock_actions`, `portfolio_last_saved`
- **Data Recovery**: On app load, saved data is restored from localStorage; falls back to mock data if nothing saved
- **See**: [AUTO_SAVE_FEATURE.md](AUTO_SAVE_FEATURE.md) for implementation details and usage examples

### AI Advisor Integration
- **Client Side** ([components/kokonutui/ai-advisor.tsx](components/kokonutui/ai-advisor.tsx)): Uses `@ai-sdk/react` with `useChat()` hook
- **Server Side** ([app/api/chat/route.ts](app/api/chat/route.ts)): Receives portfolio data, creates system prompt with financial summary, streams responses
- **Data Flow**: Component passes entire portfolio snapshot with each message → API calculates summary → AI provides contextualized advice

## Development Workflows

### Run Development Server
```bash
pnpm dev
# Runs on http://localhost:3000 (auto-redirects to /dashboard)
```

### Build & Production
```bash
pnpm build
pnpm start  # Start production server
```

### Linting
```bash
pnpm lint  # ESLint configured but build ignores errors (see next.config.mjs)
```

**Note**: TypeScript and build errors are intentionally ignored in `next.config.mjs` for rapid development.

## Code Conventions & Patterns

### Component Organization
- **Page Components** (`app/*/page.tsx`): Minimal, just compose dashboard
- **KokonutUI Components** (`components/kokonutui/`): Stateful dashboard components (sidebar, nav, advisor, modals)
- **UI Components** (`components/ui/`): Headless Radix UI wrappers (read-only, v0-generated)

### Styling
- **Tailwind + CSS Variables**: Theme colors use HSL variables (see `tailwind.config.js`)
- **Dark Mode**: Managed via `ThemeProvider` with class-based strategy
- **Responsive**: Use Tailwind breakpoints; mobile hook available in `use-mobile.ts`

### Type Definitions
Financial data types are centralized in [lib/portfolio-data.ts](lib/portfolio-data.ts):
```typescript
AccountItem, Transaction, FinancialGoal, StockAction
```
Import from `@/lib/portfolio-data` and use throughout to ensure consistency.

### Data Formatting
Currency values are stored as **strings** (e.g., `"$8,459.45"`). Parsing happens in:
- API route: `parseFloat(balance.replace(/[$,]/g, ""))`
- Context mutations: `formatCurrency()` callback

## Integration Points

### Adding Features That Interact with AI
1. Update portfolio data type/mock data in [lib/portfolio-data.ts](lib/portfolio-data.ts)
2. Extend `PortfolioContextType` and provider logic in [lib/portfolio-context.tsx](lib/portfolio-context.tsx)
3. Pass new data via `portfolioData` object in `useChat()` transport
4. Update API system prompt in [app/api/chat/route.ts](app/api/chat/route.ts)

### API Key Handling
OpenAI API key is sourced from `window.localStorage.getItem("openai_api_key")` in the transport layer. This is passed to the backend and can be overridden per request.

## External Dependencies
- **UI Framework**: Radix UI v1.x primitives + Tailwind CSS
- **AI/Chat**: Vercel's `ai` SDK v6 + `@ai-sdk/react`
- **Form Handling**: `react-hook-form` + `zod` validation
- **Date Handling**: `date-fns` for parsing/formatting
- **Analytics**: `@vercel/analytics` for usage tracking

## File Structure Guide
```
app/                           # Next.js App Router
├── api/chat/route.ts         # AI advisor backend (POST /api/chat)
├── dashboard/page.tsx        # Dashboard entry (minimal wrapper)
└── layout.tsx                # Root layout with ThemeProvider

components/
├── kokonutui/                # Dashboard feature components
│   ├── ai-advisor.tsx        # Chat interface (useChat hook)
│   ├── dashboard.tsx         # Main layout orchestrator
│   └── *.tsx                 # Sidebar, nav, modals, content panels
├── ui/                       # Radix UI component library (v0-generated)
└── theme-*.tsx               # Theme provider & toggle

lib/
├── portfolio-context.tsx     # React Context for state management
├── portfolio-data.ts         # Type definitions + mock data
└── utils.ts                  # Utility functions (cn, etc.)
```

## Common Tasks

**Adding a new account type**: Update `AccountItem.type` union in [lib/portfolio-data.ts](lib/portfolio-data.ts), add mock account, ensure API prompt handles it.

**Modifying dashboard layout**: Edit [components/kokonutui/dashboard.tsx](components/kokonutui/dashboard.tsx) - orchestrates sidebar, nav, and content area.

**Changing AI advisor behavior**: Update system prompt in [app/api/chat/route.ts](app/api/chat/route.ts) and/or `calculateSummary()` function for financial analytics.

**Styling updates**: Use Tailwind classes; theme colors via CSS variables (defined in `globals.css`).
