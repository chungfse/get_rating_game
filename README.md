# 🎮 GetRatingGame

**AI-powered Game Review Analyzer** — Extract, analyze, and understand game reviews from Google Play & App Store using AI.

> Stop reading 500+ reviews manually. Let AI extract the exact issues players are complaining about, ranked by severity with actionable insights.

---

## ✨ Features

### 🔍 Multi-Platform Review Fetching
- Fetch reviews from **Google Play** and **App Store** by App ID
- Smart **incremental fetch** — only pulls new reviews since last fetch
- Anti-rate-limit: batch processing with throttle, delay, and exponential backoff
- Up to **500 reviews** per game

### 🤖 AI Issue Extraction
- Powered by **GPT-4o-mini** — extracts specific issues, not vague summaries
- **Multi-label**: one review can map to multiple issues
- Each issue includes:
  - 🏷️ **Specific label** (e.g., "PvP mode crashes on loading")
  - 🔴🟠🟡🔵 **Severity** — Critical / High / Medium / Low
  - 📂 **Category** — crash_bug, performance, monetization, ads, game_design, ux_ui, content, multiplayer, account, update
  - 💡 **Actionable insight** — concrete suggestion for developers
  - 💬 **Sample quotes** — 2-3 real user quotes
- **Incremental analysis** — only sends unanalyzed reviews to AI on refresh

### 🔎 Vector Semantic Search
- **Hybrid search** pipeline:
  - **Primary**: Vector embeddings (`text-embedding-3-small`) → cosine similarity → results in <100ms
  - **Fallback**: GPT-4o-mini semantic search when embeddings are unavailable
- Understands meaning, not just keywords (e.g., "gameplay" matches "level design is terrible")
- Cost: ~$0.000001/search (vector) or ~$0.01/search (GPT fallback)

### ⭐ Smart Filtering & Sorting
- **Star filter**: multi-select ☑1★–4★ (default ≤4★)
- **Sort**: Newest / Oldest / Rating ↑ / Rating ↓
- Click any issue → filter reviews linked to that issue
- Issue counts update dynamically with star filter

### 🗑️ Data Management
- **Auto-cleanup**: removes reviews older than 90 days on server start
- **Manual clear**: delete all reviews + analysis for a specific game
- Local SQLite database — no external DB required

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** (strict mode) |
| Database | **better-sqlite3** (SQLite, local file) |
| AI | **OpenAI GPT-4o-mini** + **text-embedding-3-small** |
| Scrapers | `google-play-scraper` + `@perttu/app-store-scraper` |
| UI | **shadcn/ui** + **Tailwind CSS** (dark mode) |
| Icons | **Lucide React** |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **OpenAI API Key** — [Get one here](https://platform.openai.com/api-keys)

### Installation

```bash
# Clone the repo
git clone https://github.com/chungfse/get_rating_game.git
cd get_rating_game

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local and add your OpenAI API key
```

### Configuration

Edit `.env.local`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How to Use

### 1. Add a Game
- Enter the **App ID**:
  - Google Play: package name (e.g., `com.supercell.clashroyale`)
  - App Store: numeric ID (e.g., `529479190`)
- Select platform → Preview game info → Confirm

### 2. Fetch Reviews
- Click **↺ Refresh** to fetch reviews (up to 500)
- Default filter: ≤4★ reviews
- Subsequent fetches only pull **new reviews** (incremental)

### 3. AI Analysis
- Click **🤖 Phân tích vấn đề** to run AI issue extraction
- Issues appear grouped by severity: 🔴 Critical → 🟠 High → 🟡 Medium → 🔵 Low
- Click any issue to see related reviews + actionable insight

### 4. Semantic Search
- Type a natural language query in the search bar
- AI finds semantically related reviews (not just keyword matching)

---

## 📁 Project Structure

```
├── app/
│   ├── api/                    # API Routes
│   │   ├── analyze/            # AI issue extraction
│   │   ├── games/              # Game CRUD
│   │   ├── issues/             # Issue queries
│   │   ├── preview/            # Game info preview
│   │   └── reviews/            # Review fetch, search, clear
│   ├── games/[id]/             # Game detail page
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/
│   ├── home/                   # Home page components
│   ├── reviews/                # Review page components
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── db/                     # Database operations
│   ├── scrapers/               # Store scrapers
│   ├── analyzer.ts             # AI analysis
│   ├── embeddings.ts           # Vector embeddings
│   ├── issue-extractor.ts      # Issue extraction logic
│   └── openai.ts               # OpenAI client
├── types/                      # TypeScript types
├── data/                       # SQLite database (gitignored)
└── .env.local                  # API keys (gitignored)
```

---

## 💰 Cost Estimation

| Operation | Cost | Notes |
|-----------|------|-------|
| Analyze 500 reviews | ~$0.015 | GPT-4o-mini |
| Incremental analysis | ~$0.003 | Only new reviews |
| Vector search | ~$0.000001 | Local cosine similarity |
| GPT search (fallback) | ~$0.01 | When no embeddings |
| Generate embeddings | ~$0.001 | text-embedding-3-small |

**Typical monthly cost**: $0.05–$0.50 for regular use.

---

## 📄 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/preview` | POST | Fetch game info preview |
| `/api/games` | GET/POST | List or add games |
| `/api/games/[id]` | DELETE | Remove game + all data |
| `/api/reviews` | GET | Get stored reviews (with filters) |
| `/api/reviews/fetch` | POST | Smart incremental fetch |
| `/api/reviews/search` | POST | AI semantic search |
| `/api/reviews/clear` | POST | Clear reviews for a game |
| `/api/analyze` | POST | AI issue extraction |
| `/api/issues/[gameId]` | GET | Get issues for a game |

---

## 🔒 Security

- API keys stored in `.env.local` (gitignored)
- No hardcoded secrets in source code
- SQLite database stored locally (gitignored)
- All AI calls use server-side API routes

---

## 📜 License

This project is for personal/educational use.

---

## 🙏 Acknowledgments

- [google-play-scraper](https://www.npmjs.com/package/google-play-scraper) — Google Play review extraction
- [@perttu/app-store-scraper](https://www.npmjs.com/package/@perttu/app-store-scraper) — App Store review extraction
- [OpenAI](https://openai.com) — GPT-4o-mini & text-embedding-3-small
- [shadcn/ui](https://ui.shadcn.com) — Beautiful UI components
- [AppBot](https://appbot.co) & [Unstar.app](https://unstar.app) — UX inspiration
