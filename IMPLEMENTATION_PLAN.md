# Implementation Plan — GetRatingGame

> **Stack:** Next.js 14 + TypeScript + SQLite (better-sqlite3) + OpenAI GPT-4o-mini
> **Core:** Review extraction → Star filter → AI Issue Extraction (severity + category + actionable insights) → Incremental refresh

## Phase 1: Project Setup
- [x] Init Next.js 14 TypeScript (thủ công do npm naming issue với thư mục có capital letters)
- [x] Cài next@14, react, react-dom, typescript, @types/*
- [x] Cài scrapers: `google-play-scraper`, `@perttu/app-store-scraper`
- [x] Cài DB: `better-sqlite3`, `@types/better-sqlite3`
- [x] Cài AI: `openai`
- [x] Cài Tailwind: `tailwindcss`, `postcss`, `autoprefixer`
- [x] Tạo `next.config.mjs` — image domains cho Play Store & App Store + better-sqlite3 external
- [x] Tạo `tsconfig.json` — strict mode
- [x] Tạo `tailwind.config.js` — dark mode CSS variables + tailwindcss-animate plugin
- [x] Tạo `postcss.config.js`
- [x] Tạo `.gitignore` — ẩn `data/`, `.env.local`, `*.db`
- [x] Tạo `.env.local` — `OPENAI_API_KEY` placeholder
- [x] Init shadcn/ui: `components.json` + `lib/utils.ts` (thủ công — chọn dark, zinc)
- [x] Add shadcn components: button, card, badge, checkbox, dialog, separator, skeleton, select, toast, toaster
- [x] Tạo `types/index.ts` — định nghĩa Game, Review, TopicGroup, Platform, Issue, IssueSeverity, IssueCategory, AI response types

## Phase 2: Database Layer
- [x] Tạo thư mục `data/` (auto-created khi app start)
- [x] Tạo `lib/db.ts` — khởi tạo SQLite connection (singleton), WAL mode, tạo tables nếu chưa có, **auto-cleanup reviews > 90 ngày khi server start**
  - Table `games`: id, app_id, platform, name, developer, icon_url, current_rating, total_reviews, added_at, last_fetched_at
  - Table `reviews`: id, game_id, score, user_name, title, text, date, version, device (nullable), thumbs_up, group_id (nullable), fetched_at, **embedding (BLOB, nullable)** — vector 1536 floats cho semantic search
  - Table `topic_groups`: id, game_id, label, count, created_at *(legacy — không dùng nữa)*
  - Table `issues`: id, game_id, label, category, severity, frequency, sentiment, actionable_insight, sample_quotes, created_at
  - Table `review_issues`: review_id, issue_id, game_id *(junction table: 1 review → nhiều issues)*
- [x] Tạo `lib/db/games.ts` — getAllGames(), getGame(id), insertGame(), updateLastFetchedAt(id, value?), deleteGame(id)
- [x] Tạo `lib/db/reviews.ts` — getReviews(filters incl. reviewIds), insertReviews(), getUnanalyzedReviews(), updateGroupIds(), getReviewCountByGroup(), getReviewCountByStar(), getReviewCountByGroupFiltered()
- [x] Tạo `lib/db/groups.ts` — getGroups(), upsertGroups(), deleteGroups() *(legacy)*
- [x] Tạo `lib/db/issues.ts` — getIssues(gameId, sorted by severity), upsertIssues(), deleteIssues(), setReviewIssues(), getIssueIdsByReview(), getIssueCountsFiltered(gameId, stars?), getIssueFrequencies(), clearReviewIssues()
- [x] Tạo `lib/db/cleanup.ts` — cleanupOldReviews(retentionDays=90), clearGameReviews(gameId), getDbStats()

## Phase 3: Scraper Layer
- [x] Tạo `lib/scrapers/types.ts` — ScrapedGame, ScrapedReview, FetchReviewsOptions interfaces
- [x] Tạo `lib/scrapers/utils.ts` — sleep, randomDelay, withRetry (exponential backoff)
- [x] Tạo `lib/scrapers/google-play.ts` — fetchGameInfo + fetchReviews (batch 199, throttle 10, delay 300-800ms)
- [x] Tạo `lib/scrapers/app-store.ts` — fetchGameInfo + fetchReviews (page 100, delay 500ms, cap 500)
- [x] Tạo `lib/scrapers/index.ts` — unified scrapeGameInfo() + scrapeReviews()

## Phase 4: AI Analyzer — Issue Extraction
- [x] Tạo `lib/openai.ts` — OpenAI client singleton từ env var
- [x] Tạo `lib/analyzer.ts`:
  - Legacy: `analyzeReviews()` + `analyzeReviewsIncremental()` (topic clustering — giữ lại nhưng không dùng)
  - **New: `extractIssues(reviews, gameName)`** — trích xuất issues cụ thể với severity, category, sentiment, actionable_insight, sample_quotes. Mỗi review có thể thuộc NHIỀU issues (multi-label)
  - **New: `extractIssuesIncremental(reviews, gameName, existingIssues)`** — incremental extraction, ưu tiên dùng issues hiện có
- [x] Tạo `lib/analyzer-incremental.ts` — Legacy: runIncrementalAnalysis orchestrator
- [x] Tạo `lib/issue-extractor.ts` — **runIssueExtraction(gameId)**: batch 100 reviews/call, initial vs incremental, lưu issues + review_issues, recalculate frequencies, mark reviews as analyzed, **auto-generate embeddings**
- [x] Tạo `lib/ai-search.ts` — **searchReviewsByAI(reviews, query)**: GPT-4o-mini semantic search (fallback khi chưa có embeddings). Dedup reviews trùng, compact format, batch 150
- [x] Tạo `lib/embeddings.ts` — **Vector search system**:
  - `generateEmbeddings(gameId)`: sinh embeddings bằng `text-embedding-3-small` ($0.001/500 reviews), lưu BLOB vào SQLite
  - `embedQuery(query)`: embed search query ($0.000001)
  - `vectorSearch(gameId, queryVector)`: cosine similarity local — instant, không gọi API

## Phase 5: API Routes
- [x] `app/api/preview/route.ts` — POST {appId, platform} → scraper → GamePreview
- [x] `app/api/games/route.ts` — GET → getAllGames(); POST → scrapeGameInfo() + insertGame()
- [x] `app/api/games/[id]/route.ts` — DELETE → deleteGame() (CASCADE)
- [x] `app/api/reviews/fetch/route.ts` — POST {gameId, limit, version?, versions?} → **incremental fetch** OR **multi-version fetch** (loop per version, dedup by id) → insertReviews(). Trả về existingBefore + totalAfter
- [x] `app/api/reviews/versions/route.ts` — **POST {gameId, sampleSize=500}** → scan 500 reviews mới nhất → group by app version → trả về [{version, count}] sorted by count desc
- [x] `app/api/reviews/route.ts` — GET ?gameId&stars&issueId&page&sort → getReviews() + starCounts + **issueCounts (filtered by star)**
- [x] `app/api/reviews/search/route.ts` — **POST {gameId, query}** → **hybrid search**: vector search (instant) nếu có embeddings, fallback GPT search. Trả về `source: 'vector' | 'ai'`
- [x] `app/api/reviews/clear/route.ts` — **POST {gameId}** → xóa tất cả reviews + issues + analysis cho 1 game
- [x] `app/api/analyze/route.ts` — POST {gameId} → **runIssueExtraction()** → issues
- [x] `app/api/issues/[gameId]/route.ts` — GET → getIssues(gameId)
- [x] `app/api/issues/[gameId]/review-map/route.ts` — POST {reviewIds} → map reviewId→issueId[]
- [x] `app/api/groups/[gameId]/route.ts` — GET → getGroups(gameId) *(legacy)*

## Phase 6: Frontend — Layout & Home
- [x] `app/layout.tsx` — Root layout: dark mode, Inter font (Vietnamese), Toaster
- [x] `app/globals.css` — CSS variables: zinc dark theme, star colors, animations, glassmorphism, dot-pattern, shimmer
- [x] `components/layout/Header.tsx` — Glassmorphism header, gradient logo, back button
- [x] `app/page.tsx` — Home: animated hero + AddGameForm + GamePreviewCard + GameList + footer
- [x] `components/home/AddGameForm.tsx` — Platform toggle + AppID input + glow-border + search button
- [x] `components/home/GamePreviewCard.tsx` — game preview with Confirm/Cancel, gradient overlay
- [x] `components/home/GameList.tsx` — List games with card-lift hover, accent bars, staggered animations, delete dialog
- [x] `components/ui/PlatformBadge.tsx` — Badge "Google Play" / "App Store"
- [x] `components/ui/StarRating.tsx` — Colored stars with optional number

## Phase 7: Frontend — Reviews Page (Core)
- [x] `app/games/[id]/page.tsx` — Server component: game info + dynamic metadata
- [x] `components/reviews/ReviewsPageClient.tsx` — Client wrapper: issues/search/star state management, handles issue filtering + AI search + clear reviews
- [x] `components/reviews/GameHeader.tsx` — Icon, name, rating, limit selector (100/200/500), Fetch/ByVersion/Clear🗑️/Analyze buttons
- [x] `components/reviews/VersionPickerModal.tsx` — **Version Picker Modal**: Scan versions → hiển thị list [{version, count, bar}] → user chọn version(s) → Fetch reviews theo version
- [x] `components/reviews/StarFilterPanel.tsx` — Checkbox 1★–5★ with counts + mini bar charts + "Chọn tất cả"
- [x] `components/reviews/IssuesPanel.tsx` — **Issues grouped by severity** (Critical🔴/High🟠/Medium🟡/Low🔵). Collapsible sections, progress bars, category tags. Click → filter reviews. "Xem insight" → actionable_insight + sample_quotes
- [x] `components/reviews/AISearchBar.tsx` — **AI semantic search input**: gõ query → AI tìm reviews liên quan theo ngữ nghĩa → hiện kết quả. Hỗ trợ Enter submit, clear
- [x] `components/reviews/ReviewList.tsx` — Container with ReviewCards, skeleton shimmer, empty state, load more
- [x] `components/reviews/ReviewCard.tsx` — Star-colored left border, **multi issue badges** (severity-colored), expandable text, memo-ized
- [x] `components/reviews/SortSelector.tsx` — Dropdown: Newest/Oldest/Rating↑/Rating↓ with icons
- [x] `components/reviews/ReviewStats.tsx` — "Hiển thị X/Y review" + active star/issue filter summary
- [x] `components/reviews/TopicGroupsPanel.tsx` — *(legacy, không dùng nữa)*

## Phase 8: Polish & UX
- [x] Skeleton loading cho GameList, ReviewList
- [x] Empty state: chưa có game / chưa có review / chưa phân tích
- [x] Error handling + toast notifications
- [x] Mobile responsive: grid layout adapts to screen size
- [x] Dynamic meta title: "GameName Reviews — GetRatingGame"
- [x] Animations: stagger slide-up, shimmer loading, card-lift hover, floating glow
- [x] Glassmorphism headers, dot-pattern backgrounds, noise textures
- [x] Star-colored review borders (1★=Red → 5★=Green)
- [x] Custom favicon (gamepad icon)
- [x] Auto-cleanup reviews > 90 ngày khi server start
- [x] Smart incremental fetch (chỉ lấy reviews mới)
- [x] Nút xóa reviews thủ công (🗑️) với confirmation dialog

---

## Architecture Summary

### Data Flow
```
Google Play / App Store
        ↓ (scrape)
   SQLite DB (reviews)
        ↓ (AI analyze)
   Issues table + review_issues junction
        ↓ (API)
   Frontend (IssuesPanel + ReviewCards)
```

### AI Analysis Pipeline
1. **Fetch**: Scrape reviews from store (incremental — only new reviews)
2. **Extract**: GPT-4o-mini extracts specific issues from reviews (batch 100)
   - Each issue: label, category, severity, sentiment, actionable_insight, sample_quotes
   - Each review can belong to MULTIPLE issues (multi-label via junction table)
   - Lọc review rác (<15 chars, emoji-only) trước khi gửi AI
3. **Embed**: text-embedding-3-small sinh vector 1536D cho mỗi review → lưu SQLite BLOB
4. **Display**: Issues grouped by severity → Click to filter → See insight + quotes

### Semantic Search (Hybrid)
- **Primary: Vector search** (nếu có embeddings)
  - Embed query → cosine similarity local → kết quả < 100ms
  - Cost: ~$0.000001/search (chỉ embed query)
- **Fallback: GPT search** (nếu chưa có embeddings)
  - GPT-4o-mini phân tích reviews → $0.01/search
  - Dedup reviews trùng (80 chars đầu), compact format 200 chars, batch 150

### AI Cost Summary
| Action | Cost | Frequency |
|---|---|---|
| Issue Extraction | ~$0.015/500 reviews | 1 lần per game |
| Generate Embeddings | ~$0.001/500 reviews | 1 lần per game |
| Vector Search | ~$0.000001/query | Mỗi lần search |
| GPT Search (fallback) | ~$0.01/query | Chỉ khi chưa có embeddings |

### Database Auto-Cleanup
- On server startup: automatically delete reviews older than 90 days
- Manual: 🗑️ button to clear all reviews + analysis for a specific game

### Issue Categories
crash_bug, performance, monetization, ads, game_design, ux_ui, content, multiplayer, account, update

### Issue Severity Levels
- **Critical**: Crash, mất tiền, mất data → user uninstall ngay
- **High**: Vấn đề nghiêm trọng ảnh hưởng gameplay chính
- **Medium**: Phiền toái nhưng chưa đến mức bỏ game
- **Low**: Minor annoyance, cosmetic

---

## Progress Log
| Date | Phase | Status | Notes |
|---|---|---|---|
| 2026-04-06 | Planning | ✅ Done | PRD + Plan final — AI GPT-4o-mini, SQLite, incremental |
| 2026-04-07 | Phase 1 | 🔄 In Progress | Installed all deps, created config files |
| 2026-04-11 | Phase 1-8 | ✅ Done | All phases complete. shadcn/ui, types, DB, scrapers, AI analyzer, API routes, frontend — all built and build-passing |
| 2026-04-12 | Phase 6 | ✅ Done | Visual refinement: animated hero, dot patterns, glassmorphism, card-lift effects, stagger animations, star-colored review borders, mini bar charts in star filter, animated progress bars, shimmer loading, favicon, footer, memoized ReviewCard |
| 2026-04-12 | Redesign | ✅ Done | **Issue Extraction**: Replaced topic clustering with AI issue extraction (severity/category/actionable insights). New tables: issues + review_issues. New IssuesPanel grouped by severity. Multi-label: 1 review → nhiều issues. Dynamic issue counts filtered by star selection. |
| 2026-04-12 | AI Search | ✅ Done | **AI Semantic Search**: natural language query → GPT-4o-mini finds relevant reviews by meaning (not just keywords). New AISearchBar component in sidebar. |
| 2026-04-12 | DB Ops | ✅ Done | **Smart fetch** (incremental, only new reviews), **auto-cleanup** (90-day retention on startup), **manual clear** (🗑️ button), max 500 reviews limit |
| 2026-04-12 | Vector Search | ✅ Done | **Vector embeddings**: text-embedding-3-small → BLOB in SQLite → cosine similarity local. Hybrid search: vector (instant) + GPT fallback. Lọc review rác, dedup, compact prompts |
| 2026-04-17 | Version Picker | ✅ Done | **Fetch by Version**: API scan versions từ 500 reviews mới nhất → Modal hiện danh sách version + review count + bar chart + **release date (~Tháng MM/YYYY)** → User chọn version(s) → Fetch reviews lọc theo version. Multi-version fetch dedup by ID. Sort by version desc (newest first) |
