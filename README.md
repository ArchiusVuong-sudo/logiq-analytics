# LogIQ — AI Logistics Analytics

An AI-orchestrated analytics dashboard for a logistics dataset. Two complementary interfaces:

- **Dashboard** — KPIs, charts, filters (descriptive analytics)
- **Workspace** — agentic chat that calls structured tools and populates a canvas with charts, tables, forecasts, mermaid diagrams, and trained ML models

The AI layer **never fabricates numbers**. Every figure on screen comes from a real tool call against Supabase (read-only) or a deterministic ML routine.

---

## Live demo & reviewer access

**🌐 Deployed app:** _populated after `vercel --prod` — see deployment section below._

**How to test it:**
1. Open the deployed URL — the **Dashboard** loads immediately against the pre-seeded Supabase dataset (no setup required).
2. Click **Workspace** in the top nav. The first time you send a message, a Settings modal opens asking for an **Anthropic API key**.
3. Paste any `sk-ant-…` key (yours or a sandbox key). Keys live in `localStorage` only; they are sent server-side per request and **never persisted** on the server. To use the image-import / image-generation flows, also paste a **Gemini API key** (`AIza…`).
4. Try the sample prompts on the landing page, e.g.
   - "Which carrier has the highest delay rate?"
   - "Predict demand for CRAYON for the next 4 months"
   - "Train a logistic regression to predict delay risk"

> 📌 **Why BYO-key?** The deployed instance does not bundle the author's Anthropic key, so reviewers exercise the same code path real users would. The Supabase backend is shared and read-only.

---

## Setup

### 1. Environment
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
SUPABASE_SECRET_KEY=sb_secret_…
ANTHROPIC_API_KEY=sk-ant-…   # optional (can also be set per-user via Settings)
GEMINI_API_KEY=AIza…         # optional (only needed for image-import tool)
```

### 2. Install + run
```
npm install
npm run dev          # http://localhost:3010
npm test             # run vitest suite (regression + analytics helpers)
```

### 3. One-time DB schema
The Supabase secret key can do data ops but **not DDL**. Visit `/setup`, copy the SQL, paste it into your Supabase SQL Editor, then click **Seed mock dataset**.
Alternatively, with a Personal Access Token (sbp_*) you can run:
```
curl -X POST https://api.supabase.com/v1/projects/<ref>/database/query \
  -H "Authorization: Bearer sbp_…" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(cat lib/db/schema.sql | jq -Rs .)}"
```

---

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│  Dashboard   │ ←→ │  /api/dash…  │ ←→ │   analytics.ts │ ←→ │  Supabase   │
│  Workspace   │    │  /api/chat   │    │   forecast.ts  │    │  (orders)   │
│  Canvas      │ ←→ │  (SSE loop)  │ ←→ │   regression.ts│    └─────────────┘
└──────────────┘    └──────┬───────┘    └────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Anthropic  │  ← tool definitions (structured, JSON-Schema)
                    │  Claude SDK │  ← stop_reason='tool_use' loop
                    └──────┬──────┘
                           │ image_id
                    ┌──────▼──────┐
                    │   Gemini    │  ← analyze_image_with_gemini tool
                    └─────────────┘
```

### Key design decisions
| Decision | Why |
|---|---|
| **Structured tools, no raw SQL from AI** | Spec rule: "Avoid executing raw AI-generated SQL without validation." Every tool takes a typed JSON Schema and runs deterministic JS over filtered Supabase rows. AI selects the tool; humans audit the input. |
| **Canvas blocks via tool calls** | Instead of asking the model to emit JSX, every visual is a `create_*_block` tool call. The agent's reasoning becomes visible *and* the rendering is deterministic. |
| **SSE streaming** | The frontend sees `tool_call` → `tool_result` → `block` → `text_delta` → `done` events as they happen. Reasoning steps render live. |
| **Read-only by design** | All write paths go through `/api/import` (CSV upsert) and `/api/setup` (schema + seed). No AI tool can write. |
| **In-process ML** | Forecasting (moving avg, linear regression, exponential smoothing, Holt-linear) and logistic regression are pure JS — no Python service. The "self-create model" pattern is a generic `train_custom_model` tool that takes target + features at runtime. |
| **Per-user API keys** | Anthropic/Gemini keys live in browser `localStorage` and are sent server-side per request. Never persisted on the server. |

### Data flow (a single question)
```
User → POST /api/chat {thread_id, text, anthropic_key}
  → loop:
      Claude.messages.create({model, tools, messages})
      stop_reason === 'tool_use'?
        execute tool   → SSE: tool_call, tool_result
        if create_*_block: persist to canvas_blocks → SSE: block
        append tool_result to messages
        continue loop
      stop_reason === 'end_turn'?
        persist assistant message → SSE: message_complete, done
```

---

## AI Approach

### How questions are interpreted
The system prompt frames Claude as a routing agent. It **never** answers numerically without calling a tool. The first thing it usually does on an unfamiliar question is `list_dimensions` to discover what values exist (carriers, regions, date range, categories), then chooses a path.

### How tools are selected
Each tool has a strict JSON Schema. The available tools fall into three groups:

**Analytics (structured query):**
- `list_dimensions` — what carriers/regions/dates exist
- `compute_kpis(filters)` — total/delivered/delayed, on-time rate, avg delivery days, revenue
- `aggregate(group_by, metric, filters)` — bucketed counts/values/rates
- `time_series(metric, granularity, series_by, filters)` — multi-series time bucketing
- `top_n(dimension, metric, n, order)` — leaderboards
- `list_samples(filters, limit)` — raw rows for explainability

**Forecasting / ML:**
- `forecast_demand({sku|category, granularity, horizon, method})` — moving average, linear trend, exponential smoothing, Holt linear (default), with 90% confidence band + inventory recommendation
- `train_delay_classifier(features, filters)` — binary logistic regression, gradient descent, returns weights + accuracy + loss curve
- `train_custom_model(name, kind, target, features)` — user-driven self-trained model

**Canvas (visual emission):**
- `create_chart_block`, `create_table_block`, `create_metric_block`, `create_forecast_block`, `create_mermaid_block`, `create_markdown_block`, `create_model_training_block`

**Multimodal:**
- `analyze_image_with_gemini(image_id, instruction)` — Claude is the orchestrator; Gemini is the vision tool. Returns extracted rows the user can review and import.

### Self-correcting behavior
Observed live in tests: when the user asked about "last 3 months" (interpreted as 2026 by absolute clock), the agent's first `time_series` call returned no data. It then called `list_dimensions`, saw the dataset ends at 2025-12-30, and re-issued the query with the correct range. The Mermaid flowchart it generated for that same query plan documented this branching.

---

## Features

### Dashboard
- 5 KPI tiles (clickable → drops a question into the chat: "Why is X this value?")
- Filter bar: region, carrier, category, date range
- 6 chart cards: time-series by status, status doughnut, carrier counts, carrier delay rates, category breakdown, forecast launcher
- Every chart has a "💬 Ask the agent" overlay on hover

### Workspace
- 2-pane: persistent canvas (left) + chat (right)
- Reasoning steps render inline (expandable: input + result JSON)
- Charts: pin, download PNG, download PDF
- Canvas: export the whole thing to a multi-page PDF
- Hover any block → "Ask about this" floating button — clicking pre-fills the chat prompt

### Data import
- **CSV**: drop a CSV → upserts on `order_id`. Required columns are validated server-side.
- **Image (Gemini Vision)**: drop a screenshot of a shipping doc / order table → Gemini extracts structured rows → user reviews → imports.

### ML / Forecasting
- 4 forecasting methods with auto-selected default (Holt-linear)
- Forecast block = history line + dashed forecast line + 90% confidence band + inventory recommendation (avg × 1.2 safety factor) + methodology explanation
- Logistic regression: gradient descent in JS, standardized features, returns full weight vector and loss history. Visualized as a step-by-step training process card.

### Persistence
- Threads (conversations) and canvas blocks live in Supabase
- Reload the page → previous canvas + chat are still there
- Multi-thread sidebar with rename + delete

---

## Assumptions / Simplifications
- The dataset is treated as the source of truth. Today's date is the system clock (2026-05); when the user says "last 3 months" the agent correctly handles the case where the dataset is 2025 historical-only.
- ML training is in-sample only — no held-out test set. Accuracy figures are training accuracy. Acceptable per the brief which calls for "basic forecasting methods".
- Logistic regression handles boolean / numeric features only (carriers/regions are encoded by the agent if it asks for them by name; otherwise it only uses numeric columns directly).
- Confidence band on forecasts is a simple ±1.645σ from in-sample residuals (90% CI assuming normal residuals). Not a true forecast prediction interval, but useful for visualizing uncertainty.

## Limitations / Unsupported
- No raw-SQL escape hatch for the agent. Anything that can't be expressed in the structured tools above isn't available.
- Image upload bypasses Claude's vision and goes directly to Gemini for the import flow. Claude *can* see images attached to chat messages too, but the import wizard uses Gemini for structured extraction only.
- The Settings modal stores keys in `localStorage`. No multi-user / RBAC / Supabase Auth.
- Schema DDL must be applied once per Supabase project (PostgREST + service-role key cannot run DDL). The `/setup` page copy-pastes the SQL.

---

## Future Improvements
- Held-out validation + cross-validation for the model trainer
- ARIMA / Prophet for seasonal forecasting
- Embedding-based retrieval for "find similar orders / outlier anomalies"
- Supabase Auth + per-user thread isolation + row-level security
- Streaming `thinking` (extended thinking) for premium models — already wired but defaulted off
- Ability to rerun a thread with a different model from the gear icon
- Click-to-drill-down on any chart datapoint → opens a filtered table

---

## Deployment

The app is deployed on **Vercel**. The Supabase project is pre-seeded with the mock dataset — reviewers don't need to provision a database.

Required Vercel environment variables:

| Variable | Scope | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All | ✅ |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | All | ✅ |
| `SUPABASE_SECRET_KEY` | All (server-only) | ✅ |
| `ANTHROPIC_API_KEY` | — | ❌ (intentionally omitted; users bring their own via Settings UI) |
| `GEMINI_API_KEY` | — | ❌ (only needed if you want server-side fallback for image flows) |

To redeploy from a fork:
```
vercel link
vercel env pull         # syncs the above into .env.local
vercel --prod
```

`vercel.json` pins `app/api/chat/route.ts` to `maxDuration: 300` (5-minute SSE budget for long agent loops).

---

## File map
```
app/
  layout.tsx, page.tsx (→ /workspace)
  globals.css                       — Tailwind v4 + cinematic theme
  workspace/page.tsx                — main 3-pane app
  setup/page.tsx                    — one-time DB setup wizard
  api/
    chat/route.ts                   — agentic SSE loop (POST)
    setup/route.ts                  — schema-status + seed-mock
    import/route.ts                 — CSV upsert
    image/route.ts                  — Gemini vision endpoint
    dashboard/route.ts              — KPI + breakdowns
    dataset/route.ts                — dimensions
    forecast/route.ts               — direct forecasting endpoint
    threads/route.ts, [id]/route.ts — CRUD + load
    canvas/route.ts                 — block CRUD
lib/
  agent/
    loop.ts                         — Anthropic SDK while-loop, SSE generator
    tools.ts                        — Tool[] + runTool() + canvas dispatch
    system.ts                       — system prompt
  tools/
    analytics.ts                    — KPIs / aggregate / time_series / top_n
    forecast.ts                     — forecastDemand + trainDelayClassifier + trainCustomModel
    image.ts                        — analyzeWithGemini
  ml/regression.ts                  — linear / logistic / Holt / exp smoothing
  db/
    supabase.ts                     — admin + public clients
    schema.sql                      — full DDL
components/
  canvas/                           — ChartBlock, MermaidBlock, TableBlock,
                                      MetricBlock, ForecastBlock, ModelTrainingBlock,
                                      MarkdownBlock, ImageAnalysisBlock + Canvas
  chat/                             — ChatPanel, MessageBubble, ToolBlock, ChatInput
  dashboard/                        — Dashboard, ImportModal, SettingsModal
  SidebarNav.tsx
types/index.ts
```

---

## Tests

`npm test` runs the Vitest suite (19 tests, ~170ms):

- **`tests/regression.test.ts`** — covers every public function in `lib/ml/regression.ts`: `linearRegression` (perfect fit + noisy fit), `movingAverage`, `exponentialSmoothing`, `holtLinear`, the three forecast wrappers, and `logisticRegression` end-to-end on a synthetic linearly-separable problem (asserts ≥95% accuracy + monotonically decreasing loss).
- **`tests/analytics-helpers.test.ts`** — pure helpers from `lib/tools/analytics.ts`: `deliveryDays` (valid / null / invalid), `isoWeek` stability across the same week, and `bucketKey` for every `GroupBy` variant including `Unknown` fallbacks.

The DB-touching paths (`fetchAll`, `computeKPIs`, etc.) are not unit-tested here — they are exercised end-to-end by the Verified Flows table below.

---

## Verified flows (Chrome E2E)

| Question | Tools called | Canvas output |
|---|---|---|
| "Which carrier has the highest delay rate?" | `top_n`, `aggregate` → `create_chart_block`, `create_metric_block` | Bar chart (delay rate by carrier) + KPI tile (28.57% — GLS) |
| "Predict demand for CRAYON for the next 4 months" | `forecast_demand` → `create_forecast_block`, `create_chart_block` | Forecast plot (history + 4-month projection + 90% band) + inventory rec (67 units) |
| "Train a logistic regression to predict delay risk" | `train_delay_classifier` → `create_model_training_block` | Animated training stepper + 84.7% accuracy on 359 samples |
| "Show delayed orders by week, then a flowchart of the analytics flow" | `time_series` (initial), `list_dimensions`, `compute_kpis`, `time_series` (corrected), `create_chart_block`, `create_mermaid_block` | Weekly delay line chart + Mermaid flowchart of the *actual* query plan |

The agent self-corrected on question 4 when the initial date range returned no data — surfaced via `list_dimensions`.
