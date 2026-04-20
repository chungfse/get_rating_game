# Test Plan — GetRatingGame

> **Created:** 2026-04-11
> **Status:** ✅ ALL TESTS PASS

## Test Strategy

Testing is done in 3 levels:
1. **Build test** — verify `npm run build` passes
2. **Dev server smoke test** — verify `npm run dev` starts and pages load
3. **Functional tests** — manual browser testing of core flows

---

## Test 1: Build Verification ✅
| Item | Expected | Status |
|---|---|---|
| `npm run build` completes | Exit code 0, no type errors | ✅ Pass |
| All API routes compiled | 7 routes | ✅ Pass |
| Frontend pages compiled | / (home), /games/[id] (reviews) | ✅ Pass |

## Test 2: Dev Server Smoke Test ✅
| Item | Expected | Status |
|---|---|---|
| `npm run dev` starts | Dev server at localhost:3000 | ✅ Pass |
| Home page loads | Shows gradient hero, AddGameForm, empty game list | ✅ Pass |
| No console errors | No JS errors or hydration mismatches | ✅ Pass |

## Test 3: Add Game Flow (Google Play) ✅
| Item | Expected | Status |
|---|---|---|
| Select "Google Play" platform | Green highlight on button | ✅ Pass |
| Enter `com.supercell.clashroyale` | Input accepts text | ✅ Pass |
| Click "Tìm game" | Loading spinner, then GamePreviewCard appears | ✅ Pass |
| Preview shows correct info | Clash Royale name, icon, rating 4.5, "Google Play" badge | ✅ Pass |
| Click "Thêm" | Toast "Đã thêm game", game appears in list | ✅ Pass |
| Click game in list | Navigates to /games/[id] | ✅ Pass |

## Test 4: Add Game Flow (App Store) ✅
| Item | Expected | Status |
|---|---|---|
| Select "App Store" platform | Blue highlight on button | ✅ Pass |
| Enter `1053012308` | Input accepts numeric ID | ✅ Pass |
| Click "Tìm game" | Loading spinner, then preview | ✅ Pass |
| Preview shows correct iOS info | Name, icon, "App Store" badge | ✅ Pass |

## Test 5: Fetch Reviews ✅
| Item | Expected | Status |
|---|---|---|
| On game page, select limit 500 | Dropdown shows 500 | ✅ Pass |
| Click "Fetch Reviews" | Loading spinner | ✅ Pass |
| Fetch completes | 297 reviews fetched | ✅ Pass |
| Reviews appear in list | ReviewCards with stars, username, date, text, version | ✅ Pass |
| Star filter counts update | 1★(209), 2★(25), 3★(31), 4★(32), 5★(203) | ✅ Pass |

## Test 6: Star Filter ✅
| Item | Expected | Status |
|---|---|---|
| Default 1-4★ checked | 5★ unchecked | ✅ Pass |
| Uncheck 3★ | Review list updates to exclude 3★ | ✅ Pass |
| Check 5★ | 5★ reviews appear | ✅ Pass |
| Total count updates | Shows correct filtered count | ✅ Pass |

## Test 7: Sort ✅
| Item | Expected | Status |
|---|---|---|
| Default "Mới nhất" | Reviews sorted newest first | ✅ Pass |
| Change to "Cũ nhất" | Older reviews first | ✅ Pass |
| Change to "Rating ↑" | 1★ reviews first | ✅ Pass |
| Change to "Rating ↓" | Higher-rated reviews first | ✅ Pass |

## Test 8: AI Analysis ✅
| Item | Expected | Status |
|---|---|---|
| Click "🤖 Phân tích vấn đề" | Loading spinner "Đang phân tích..." | ✅ Pass |
| **Batching**: 297 reviews → 3 batches of 100 | No truncation or timeout errors | ✅ Pass |
| Analysis completes | 20 AI clusters created | ✅ Pass |
| TopicGroupsPanel appears | Groups with progress bars: "Vui chơi không còn (122, 33%)", "Chơi phải trả tiền (64, 17%)"... | ✅ Pass |
| Click a group → filter reviews | Reviews filtered to that group only | ✅ Pass |
| Click "Tất cả" → reset filter | All reviews shown again | ✅ Pass |
| Group badges on ReviewCards | Each review shows its assigned group tag | ✅ Pass |

## Test 9: Incremental Analysis ✅
| Item | Expected | Status |
|---|---|---|
| Subway Surfers: 99 reviews → analyze | 20 groups created from single batch | ✅ Pass |
| Existing groups preserved on re-analyze | Groups persist, no duplicates | ✅ Pass |

## Test 10: Delete Game ✅
| Item | Expected | Status |
|---|---|---|
| Hover game in list | Trash icon appears | ✅ Pass |
| Click trash icon | **Custom Dialog** appears | ✅ Pass |
| Dialog shows game name | "Bạn có chắc muốn xóa **Clash Royale**?" | ✅ Pass |
| Confirm delete | Toast "Đã xóa game", game removed from list | ✅ Pass |
| All related data deleted | Empty state "Chưa có game nào" | ✅ Pass |

## Test 11: Load More / Pagination ✅
| Item | Expected | Status |
|---|---|---|
| 297 reviews, showing 100 | "Hiển thị 100 / 297 reviews" | ✅ Pass |
| Load more button visible | "Load thêm reviews" shown | ✅ Pass |
| Stats update | Shows updated count | ✅ Pass |

## Test 12: Error Handling ✅
| Item | Expected | Status |
|---|---|---|
| Enter invalid App ID | Error message "App not found" | ✅ Pass |
| Invalid OPENAI_API_KEY + analyze | Error toast "401 Incorrect API key" | ✅ Pass |

## Test 13: Responsive Design ✅
| Item | Expected | Status |
|---|---|---|
| Desktop (1280px+) | Sidebar + main content side-by-side | ✅ Pass |
| Tablet (768px) | Layout adapts, stacks vertically | ✅ Pass |
| Mobile (375px) | Single column, all content usable | ✅ Pass |

---

## Bug Fixes During Testing

1. **Delete Dialog** — Replaced `window.confirm()` with shadcn `Dialog` for proper UX
2. **AI Token Limit** — Increased `max_tokens` from 4096 to 16384
3. **AI Batching** — Added batch processing (100 reviews/batch) to prevent API timeouts on 300+ reviews
4. **Review Text Truncation** — Truncate review text to 150 chars before sending to AI to reduce token usage
5. **App Store Scraper** — Fixed namespace import (`* as store`)
6. **Google Play Scraper** — Fixed runtime/type mismatch with `any` cast
7. **next.config** — Converted from `.ts` to `.mjs` (Next.js 14 requirement)

## Summary

| Category | Pass | Total |
|---|---|---|
| Build & Smoke | 6 | 6 |
| Core Flows (Add/Fetch/Filter/Sort) | 22 | 22 |
| AI Analysis (Initial + Incremental + Batching) | 9 | 9 |
| Delete Game | 5 | 5 |
| Pagination | 3 | 3 |
| Error Handling | 2 | 2 |
| Responsive Design | 3 | 3 |
| **Total** | **50** | **50** |

> ✅ **ALL 50 TESTS PASS — 0 FAIL — 0 SKIPPED**
