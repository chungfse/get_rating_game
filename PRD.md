# Product Requirements Document — GetRatingGame

## 1. Product Overview

**GetRatingGame** là web app để **trích xuất, phân tích review game đối thủ** từ Google Play Store và Apple App Store, sử dụng AI để **trích xuất vấn đề cụ thể** với severity, category, và actionable insights.

**Problem Solved:** Developer/publisher game muốn hiểu nhanh người chơi đối thủ đang phàn nàn về vấn đề gì — nhưng đọc từng review thủ công rất tốn thời gian, và các tool chuyên nghiệp rất đắt ($50–300/tháng).

**Core Value:**
- Fetch review ≤4★ của bất kỳ game nào (tối đa 500 reviews)
- AI **trích xuất vấn đề cụ thể** (tối đa 20 issues) — mỗi issue có severity, category, actionable insight, sample quotes
- **Multi-label**: 1 review có thể thuộc nhiều issues (khác với topic clustering cũ)
- **AI Semantic Search**: tìm review theo ngữ nghĩa (VD: "gameplay" match "chơi rất khó")
- Lưu lịch sử — lần sau chỉ phân tích **review mới** (giảm chi phí AI)
- Click issue → xem toàn bộ review liên quan + actionable insight
- **Auto-cleanup** reviews > 90 ngày khi server start

---

## 2. Goals & Objectives

- **Primary Goal:** AI đọc review → trích xuất vấn đề cụ thể với severity + actionable insight → developer biết ngay cơ hội lớn nhất
- **Core Use Cases:**
  1. **Game của mình:** Hiểu người chơi đang phàn nàn gì nhiều nhất → ưu tiên fix
  2. **Game đối thủ:** Tìm điểm yếu cụ thể của đối thủ → tận dụng cơ hội competitive
- **Success Metrics:**
  - Fetch + phân tích 500 review trong < 60 giây
  - AI trích xuất 5–20 issues cụ thể, actionable, không trùng lặp
  - Mỗi issue có severity (critical/high/medium/low) giúp prioritize
  - Lần refresh thứ 2 chỉ gọi AI cho review mới
  - Chi phí AI: ~$0.015/500 reviews (GPT-4o-mini)

---

## 3. Target Users

### User Persona 1: Indie Game Developer
- **Needs:** Biết ngay sau update mới người chơi phàn nàn về bug gì nhiều nhất
- **Pain Points:** 500 review — không thể đọc hết; store không có grouping

### User Persona 2: Competitive Analyst / Publisher
- **Needs:** Phân tích điểm yếu của đối thủ — nhóm vấn đề nào bị đề cập nhiều nhất
- **Pain Points:** Không có tool miễn phí làm việc này tự động

---

## 4. Features & Requirements

### Core Features (MVP)

- [ ] **F1 - Add Game:**
  - Nhập App ID (Google Play: `com.xxx` / App Store: numeric `123456789`)
  - Chọn platform (Android / iOS)
  - Preview tên game, icon, tổng rating trước khi confirm
  - Lưu danh sách game đã thêm vào SQLite

- [x] **F2 - Fetch Reviews:**
  - **Số lượng fetch có thể điều chỉnh:** 100 / 200 / 500 (tối đa 500)
  - **Smart incremental fetch**: dùng `lastFetchedAt` để chỉ lấy reviews MỚI hơn lần fetch cuối
  - Lưu toàn bộ vào SQLite (INSERT OR IGNORE — không trùng lặp)
  - Mỗi review gồm: `id`, `score` (1–5), `date`, `userName`, `title`, `text`, `version`, `device` (nullable), `thumbsUp`
  - **Anti-rate-limit:** fetch theo batch, có delay giữa các batch (xem §9)
  - Toast hiển thị: "X review mới (tổng: Y)" hoặc "Không có review mới"

- [x] **F3 - Star Filter:**
  - Checkbox multi-select: ☑1★ ☑2★ ☑3★ ☑4★ ☐5★ (default ≤4★)
  - Filter real-time, không reload trang
  - Hiển thị số lượng review + mini bar chart cho mỗi mức sao
  - Issue counts cũng update dynamic theo star filter

- [x] **F4 - AI Issue Extraction (tính năng trung tâm):**
  - Nút **"🤖 Phân tích vấn đề"** — gọi AI trích xuất issues từ review
  - AI model: **OpenAI GPT-4o-mini** (cần OPENAI_API_KEY trong `.env.local`)
  - **Multi-label**: 1 review có thể thuộc NHIỀU issues (junction table `review_issues`)
  - Mỗi issue có:
    - `label`: mô tả cụ thể (VD: "Crash liên tục khi vào chế độ PvP")
    - `severity`: critical / high / medium / low
    - `category`: crash_bug, performance, monetization, ads, game_design, ux_ui, content, multiplayer, account, update
    - `sentiment`: -1.0 (rất tiêu cực) đến 0 (trung tính)
    - `actionable_insight`: gợi ý hành động cụ thể cho developer
    - `sample_quotes`: 2-3 trích dẫn tiêu biểu từ user
  - Tối đa 20 issues, batch 100 reviews/API call
  - **Incremental:** Lần analyze tiếp theo → chỉ gửi review chưa phân tích
  - Hiển thị issues **grouped by severity** (Critical🔴 → High🟠 → Medium🟡 → Low🔵)
  - Click issue → filter reviews liên quan + xem insight + sample quotes
  - Mỗi issue có progress bar + frequency count + category badge

- [x] **F5 - Review List:**
  - Hiển thị toàn bộ review (filter theo sao + theo issue nếu chọn)
  - Mỗi card review: số sao (star-colored left border), tên người dùng, ngày, version, **nhiều issue badges** (severity-colored)
  - Sort: Newest first (default) / Oldest / Rating ↑ / Rating ↓
  - Expandable text cho review dài (> 200 chars)
  - Pagination / Load More

- [x] **F6 - Game Switching:**
  - Trang chủ chứa danh sách game đã lưu
  - Click game → vào trang reviews
  - Remove game (+ CASCADE xóa reviews, issues, associations)

- [x] **F7 - Vector Semantic Search:**
  - Input search ở sidebar: gõ query bằng ngôn ngữ tự nhiên
  - **Hybrid search**:
    - **Primary**: Vector search — embed query bằng `text-embedding-3-small` → cosine similarity local → kết quả < 100ms, gần miễn phí
    - **Fallback**: GPT-4o-mini semantic search (khi chưa có embeddings)
  - Embeddings được sinh tự động khi chạy "Phân tích vấn đề"
  - VD: query "gameplay" → match "chơi rất khó", "level design tệ"
  - Chi phí: ~$0.000001/search (vector) hoặc ~$0.01/search (GPT fallback)

- [x] **F8 - Database Cleanup:**
  - **Auto-cleanup**: xóa reviews > 90 ngày khi server start
  - **Manual clear**: nút 🗑️ xóa toàn bộ reviews + issues + analysis cho 1 game

- [x] **F9 - Version-Based Review Fetch:**
  - Nút **"📦 By Version"** → scan 500 reviews mới nhất → group by app version
  - **Version Picker Modal**: hiển thị danh sách version với review count + bar chart + release date (~Tháng MM/YYYY)
  - User chọn 1 hoặc nhiều version → Fetch reviews lọc theo version đã chọn
  - **Multi-version fetch**: loop per version, dedup by review ID
  - Sort version by newest first (version desc)

---

## 5. User Flows

### Main Flow: Phân tích review lần đầu

```
[Trang chủ]
     ↓
[Nhập App ID + chọn platform] → [Fetch Preview: tên/icon/rating]
     ↓
[Confirm Add Game]
     ↓
[Trang Reviews: fetch 500 review ≤4★, lưu SQLite]
     ↓
[Click "🤖 Phân tích vấn đề"]
     ↓
[Gửi toàn bộ 500 review lên GPT-4o-mini]
     ↓
[AI trả về 20-30 nhóm + assignment mỗi review → nhóm]
     ↓
[Lưu assignments vào SQLite, cập nhật group_id]
     ↓
[Hiển thị topic clusters: sorted by count]

  ● Lag / Giật lag          ████████████████ 89
  ● Pay-to-win              █████████████    61
  ● Update broke game       ████████         47
  ...

[Click nhóm "Lag/Giật lag"]
     ↓
[Review list filter: chỉ hiện 89 review thuộc nhóm này]
     ↓
[Đọc detail → hiểu vấn đề cụ thể]
```

### Refresh Flow: Phân tích incremental (lần 2+)

```
[Click ↺ Refresh]
     ↓
[Fetch reviews mới từ store]
     ↓
[Check DB: lọc ra review chưa có trong DB → INSERT mới]
     ↓
[Lấy review có group_id = NULL (chưa phân nhóm)]
     ↓
[Gửi chỉ N review mới lên GPT-4o-mini] ← Chi phí rất nhỏ
     ↓
[Merge nhóm mới vào nhóm cũ, cập nhật count]
     ↓
[Update UI: nhóm được refresh, review mới xuất hiện]
```

---

## 6. Wireframes

### Screen 1: Trang chủ

```
┌──────────────────────────────────────────────────────────┐
│  🎮 GetRatingGame                                        │
│  Phân tích review game bằng AI                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Platform:  [● Google Play]  [○ App Store]              │
│                                                          │
│  App ID:  ┌────────────────────────────┐  [🔍 Fetch]   │
│           │ com.supercell.clashroyale  │               │
│           └────────────────────────────┘               │
│                                                          │
│  ─── Game đang theo dõi ───                             │
│  🎮 Clash Royale  ★4.1  Android    [→]  [🗑]           │
│  🎮 Free Fire     ★4.8  iOS        [→]  [🗑]           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Screen 2: Trang Reviews + AI Clusters

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back  🎮 Clash Royale  ★4.1 · 1.2M reviews  [↺ Refresh]    │
├───────────────────┬──────────────────────────────────────────────┤
│  FILTER ⭐        │  [🤖 Phân tích vấn đề]  ← nút chính        │
│                   │                                              │
│  ☑ 1★  (38)      │  ── AI Clusters (sorted by count) ──        │
│  ☑ 2★  (52)      │  ┌────────────────────────────────────────┐  │
│  ☑ 3★  (61)      │  │ [All] [Lag/Giật 89] [P2W 61] [Bug 47] │  │
│  ☑ 4★  (89)      │  └────────────────────────────────────────┘  │
│  ☐ 5★            │                                              │
│                   │  Lag / Giật lag             89  ██████████  │
│  Total: 240       │  Pay-to-win / Mất cân bằng  61  ███████     │
│                   │  Update làm hỏng game        47  █████       │
│  Sort:            │  Matchmaking không công bằng 38  ████        │
│  [Newest ▼]       │  Tốn pin / Quá nhiệt         22  ██          │
│                   │  ...20 nhóm khác...                          │
│                   │  ─────────────────────────────────────────   │
│                   │  ┌────────────────────────────────────────┐  │
│                   │  │ ★★☆☆☆  nguyen_a · Jan 15            │  │
│                   │  │ 📌 Lag / Giật lag                     │  │
│                   │  │ Game bị lag sau update mới. Vào trận  │  │
│                   │  │ là giật liên tục, fix đi nha!         │  │
│                   │  └────────────────────────────────────────┘  │
│                   │  ┌────────────────────────────────────────┐  │
│                   │  │ ★★★☆☆  player_b · Jan 14             │  │
│                   │  │ 📌 Tốn pin / Quá nhiệt               │  │
│                   │  │ Chơi 30 phút hao hết 20% pin...       │  │
│                   │  └────────────────────────────────────────┘  │
│                   │                    [Load More]               │
└───────────────────┴──────────────────────────────────────────────┘
```

---

## 7. Data Models

### SQLite Schema

```
┌───────────────────┐         ┌───────────────────────────┐
│   games           │  1───N  │   reviews                  │
├───────────────────┤         ├───────────────────────────┤
│ id (TEXT PK)      │         │ id (TEXT PK)               │
│ app_id (TEXT)     │         │ game_id (TEXT FK)          │
│ platform (TEXT)   │         │ score (INTEGER)            │
│ name (TEXT)       │         │ user_name (TEXT)           │
│ developer (TEXT)  │         │ title (TEXT)               │
│ icon_url (TEXT)   │         │ text (TEXT)                │
│ current_rating    │         │ date (TEXT)                │
│ total_reviews     │         │ version (TEXT)             │
│ added_at (TEXT)   │         │ device (TEXT)              │
│ last_fetched_at   │         │ thumbs_up (INTEGER)        │
└───────────────────┘         │ group_id (TEXT) ← sentinel │
                              │ fetched_at (TEXT)          │
                              └───────────────────────────┘
                                     │
                              ┌──────────────────────────┐
                              │   issues                  │
                              ├──────────────────────────┤
                              │ id (TEXT PK)              │
                              │ game_id (TEXT FK)         │
                              │ label (TEXT)              │
                              │ category (TEXT)           │
                              │ severity (TEXT)           │
                              │ frequency (INTEGER)       │
                              │ sentiment (REAL)          │
                              │ actionable_insight (TEXT)  │
                              │ sample_quotes (TEXT/JSON)  │
                              │ created_at (TEXT)         │
                              └──────────────────────────┘
                                     │
                              ┌──────────────────────────┐
                              │   review_issues (M:N)     │
                              ├──────────────────────────┤
                              │ review_id (TEXT FK)        │
                              │ issue_id (TEXT FK)         │
                              │ game_id (TEXT FK)          │
                              │ PK(review_id, issue_id)    │
                              └──────────────────────────┘

  + topic_groups (legacy, không dùng nữa)
```

### TypeScript Types

```typescript
type Platform = 'android' | 'ios';
type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';
type IssueCategory = 'crash_bug' | 'performance' | 'monetization' | 'ads'
  | 'game_design' | 'ux_ui' | 'content' | 'multiplayer' | 'account' | 'update';

interface Game {
  id: string;
  appId: string;
  platform: Platform;
  name: string;
  developer: string;
  iconUrl: string;
  currentRating: number;
  totalReviews: number;
  addedAt: string;
  lastFetchedAt: string | null;
}

interface Review {
  id: string;
  gameId: string;
  score: number;           // 1–5
  userName: string;
  title?: string;
  text: string;
  date: string;
  version?: string;
  device?: string;
  thumbsUp?: number;
  groupId: string | null;  // '__analyzed__' sentinel = đã phân tích
  fetchedAt: string;
}

interface Issue {
  id: string;
  gameId: string;
  label: string;
  category: IssueCategory;
  severity: IssueSeverity;
  frequency: number;
  sentiment: number;        // -1.0 to 0
  actionableInsight: string;
  sampleQuotes: string[];
  createdAt: string;
}

// AI Issue Extraction Response
interface AIIssueExtractionResponse {
  issues: {
    id: string; label: string; category: string;
    severity: string; sentiment: number;
    actionable_insight: string; sample_quotes: string[];
  }[];
  review_issues: { reviewId: string; issueIds: string[] }[];
}
```

---

## 8. Technical Architecture

### System Diagram

```
[Browser - Next.js App]
         │
         ├── [Frontend: React + shadcn/ui + Tailwind dark]
         │    ├── Game List (SQLite via API)
         │    ├── Review Feed + Star Filter (client-side)
         │    └── AI Topic Clusters (call API → display)
         │         ↕ fetch()
         └── [Next.js API Routes]
              ├── /api/preview         → Scraper → game info
              ├── /api/games           → SQLite CRUD
              ├── /api/reviews         → Scraper + SQLite
              ├── /api/analyze         → OpenAI GPT-4o-mini
              └── /api/groups/[gameId] → SQLite topic groups
                        ↕
              ┌─────────────────────────┐
              │ Scrapers                │
              │ google-play-scraper     │
              │ @perttu/app-store-scraper│
              └─────────────────────────┘
                        ↕
              ┌─────────────────────────┐
              │ SQLite (better-sqlite3) │
              │ ./data/app.db           │
              └─────────────────────────┘
                        ↕
              ┌─────────────────────────┐
              │ OpenAI API              │
              │ Model: gpt-4o-mini      │
              │ ~$0.01 / 500 reviews    │
              └─────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 14** (App Router + API Routes) |
| Language | **TypeScript** strict |
| Database | **better-sqlite3** — SQLite local |
| Scrapers | `google-play-scraper` + `@perttu/app-store-scraper` |
| AI | **OpenAI GPT-4o-mini** via `openai` SDK |
| UI | **shadcn/ui** + Tailwind CSS dark mode |
| Charts | **Recharts** (minimal — chỉ dùng cho progress bar nhóm) |
| Icons | **Lucide React** |

---

## 9. Scraping Strategy & Anti-Rate-Limit

### Giới hạn của từng Store

| Store | Hard Limit | Rate Limit | Rủi ro |
|---|---|---|---|
| **Google Play** | Không cố định | Có — IP ban tạm thời nếu request quá nhanh | Trung bình |
| **App Store** | **500 review** (Apple RSS API) | Ít strict hơn | Thấp |

### Chiến lược xử lý

**Google Play (max 1000 review):**
```
- Fetch theo batch: 199 review/lần (giới hạn của thư viện)
- Throttle: dùng tham số throttle: 10 của google-play-scraper
- Random delay: 300–800ms giữa mỗi batch
- Retry logic: exponential backoff nếu nhận 503
  - Lần 1: chờ 2s → thử lại
  - Lần 2: chờ 5s → thử lại  
  - Lần 3: báo lỗi cho user
- Thời gian fetch 1000 review: ~3–5 phút
- Hiển thị progress bar khi đang fetch
```

**App Store (max 500 review):**
```
- Hard cap: 500 review (giới hạn Apple, không thể bypass)
- Fetch theo page (100 review/page)
- Delay 500ms giữa các page
- Ít bị chặn hơn Google Play
```

### UX khi fetch lâu
- Hiển thị progress: "Đang tải... 200/1000 review"
- Có thể cancel giữa chừng
- Tự động lưu review đã fetch nếu bị gián đoạn

---

## 10. API Design

| Endpoint | Method | Description | Body / Params |
|---|---|---|---|
| `/api/preview` | POST | Fetch game info | `{appId, platform}` |
| `/api/games` | GET | List all games | — |
| `/api/games` | POST | Add game | `{appId, platform}` |
| `/api/games/[id]` | DELETE | Remove game + data | — |
| `/api/reviews` | GET | Get stored reviews | `?gameId=&stars=1,2,3,4&issueId=&page=1&sort=newest` |
| `/api/reviews/fetch` | POST | Smart incremental fetch | `{gameId, limit, version?, versions?}` |
| `/api/reviews/versions` | POST | Scan versions + review counts | `{gameId, sampleSize?}` |
| `/api/reviews/search` | POST | AI semantic search | `{gameId, query}` |
| `/api/reviews/clear` | POST | Clear all reviews for game | `{gameId}` |
| `/api/analyze` | POST | AI issue extraction | `{gameId}` → returns `{issues}` |
| `/api/issues/[gameId]` | GET | Get issues for game | — |
| `/api/issues/[gameId]/review-map` | POST | Get review→issue mapping | `{reviewIds}` |
| `/api/groups/[gameId]` | GET | Get topic groups (legacy) | — |

---

## 11. AI Prompt Design

### Issue Extraction — lần đầu (initial)

```
System: Bạn là chuyên gia phân tích competitive intelligence cho game mobile.
Nhiệm vụ: Trích xuất VẤN ĐỀ CỤ THỂ từ review game đối thủ.

User:
Phân tích {N} review của game "{gameName}".

MỖI REVIEW CÓ THỂ ĐỀ CẬP NHIỀU VẤN ĐỀ.

Categories: crash_bug, performance, monetization, ads, game_design,
           ux_ui, content, multiplayer, account, update

Severity: critical (crash/mất tiền), high (gameplay chính),
         medium (phiền toái), low (minor)

Yêu cầu:
1. Label CỤ THỂ (❌ "Lỗi game" → ✅ "Crash liên tục khi vào PvP")
2. Mỗi review → NHIỀU issues (1:N multi-label)
3. Tối đa 20 issues
4. actionable_insight: gợi ý HÀNH ĐỘNG cho developer
5. sample_quotes: 2-3 trích dẫn tiêu biểu

Return JSON:
{
  "issues": [{"id": "...", "label": "...", "category": "...",
              "severity": "...", "sentiment": -0.9,
              "actionable_insight": "...", "sample_quotes": ["..."]}],
  "review_issues": [{"reviewId": "...", "issueIds": ["...", "..."]}]
}
```

### Issue Extraction — incremental (khi đã có issues cũ)

```
- Ưu tiên gán review vào issue ĐÃ CÓ
- Chỉ tạo issue MỚI nếu vấn đề hoàn toàn chưa có
- Tổng issues (cũ + mới) ≤ 20
- Chỉ trả về issues MỚI trong response, review_issues cho TẤT CẢ reviews
```

### AI Semantic Search

```
System: Bạn là công cụ tìm kiếm review game thông minh.
Bạn hiểu NGỮ NGHĨA, không chỉ từ khóa.
VD: query "gameplay" phải match "chơi rất khó", "cơ chế game hay".

User: Tìm reviews liên quan đến: "{query}"
Return JSON:
{"results": [{"reviewId": "...", "relevance": 0.9, "reason": "..."}]}
```

---

## 12. UI/UX Guidelines

- **Color Scheme:** Dark — Background `#09090b`, Card `#18181b`, Border `#27272a`
- **Accent:** Purple `#a855f7` cho primary actions
- **Star Colors:** 1★=`#ef4444` 2★=`#f97316` 3★=`#eab308` 4★=`#84cc16`
- **Group Colors:** Top 5 nhóm highlight màu đỏ (vấn đề nghiêm trọng nhất)
- **Typography:** Geist font (Next.js default)
- **Badge nhóm:** Mỗi review card có badge nhỏ hiển thị tên nhóm AI assign

---

## 13. Environment Variables

```env
OPENAI_API_KEY=sk-...
```

---

## 14. Research Sources

- [npmjs - google-play-scraper](https://www.npmjs.com/package/google-play-scraper): `.reviews()` với sort, num, paginate
- [npmjs - @perttu/app-store-scraper](https://www.npmjs.com/package/@perttu/app-store-scraper): TypeScript rewrite
- [OpenAI Pricing](https://openai.com/pricing): GPT-4o-mini $0.15/1M input, $0.60/1M output
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3): Sync SQLite for Node.js
- [AppBot](https://appbot.co) / [Unstar.app](https://unstar.app): UX inspiration
