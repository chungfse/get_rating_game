## Vibe Builder Project Reference

### ⛔ CONTEXT OVERFLOW RECOVERY
**When context gets full or you feel lost in a long session:**
1. Re-read the vibe-builder skill: `.agent/skills/vibe-builder/SKILL.md`
2. Re-read `IMPLEMENTATION_PLAN.md` to check current progress
3. Re-read `TEST_PLAN.md` (if exists) to check test status
4. Follow the workflow strictly - especially the checkpoints below!

### ⚠️ WORKFLOW CHECKPOINTS (MANDATORY - DO NOT SKIP!)
| After Phase | Action |
| --- | --- |
| Phase 3 (Coding) complete | → Create TEST_PLAN.md → **⛔ STOP for Human review** |
| Phase 4 (Test Plan) approved | → Execute tests autonomously |
| Phase 5 (Testing) complete | → Report results → Enter Phase 6 loop |

**CRITICAL:** After finishing ALL coding tasks, you MUST:
1. Create TEST_PLAN.md
2. **⛔ STOP and wait for Human approval**
3. DO NOT run any tests until Human reviews TEST_PLAN.md!

### Project Summary
- **App Type**: Web app — Game Review Extractor & AI Issue Analyzer
- **Tech Stack**: Next.js 14 (App Router) + TypeScript + SQLite (better-sqlite3) + OpenAI GPT-4o-mini + shadcn/ui + Tailwind dark
- **Core Features**:
  1. Add game by App ID (Google Play / App Store) → fetch preview
  2. Fetch reviews (max 500) với anti-rate-limit (batch + throttle + retry), **incremental fetch** (chỉ lấy reviews mới)
  3. Star filter (☑1★–4★ default) + Sort
  4. **AI Issue Extraction** — severity (critical/high/medium/low), category (10 loại), actionable insight, sample quotes. Multi-label: 1 review → nhiều issues. Không giới hạn số lượng issues
  5. Click issue → filter reviews, xem insight + sample quotes
  6. **Vector Semantic Search** — tìm reviews theo ngữ nghĩa bằng vector embeddings (text-embedding-3-small). Instant (<100ms), gần miễn phí. Fallback GPT search nếu chưa có embeddings
  7. **Auto-cleanup** reviews > 90 ngày khi server start
  8. **Manual clear** (🗑️) xóa toàn bộ reviews + analysis cho 1 game
  9. **AI Optimizations**: lọc review rác (<15 chars), dedup reviews trùng, compact prompts
  10. **Version-Based Fetch** — scan versions từ reviews → Version Picker Modal → fetch reviews lọc theo version đã chọn. Multi-version, dedup by ID
- **Docker Services**: Không cần — SQLite local tại `./data/app.db`

### Current Phase
- **Status**: Phase 6 (Iterative Refinement) ✅ Active
- **All coding done**: Phase 1-8 complete + Issue Extraction redesign + Vector Search + DB cleanup + Version Picker
- **Build**: Passes
- **Key changes (2026-04-17)**: Added Version-Based Review Fetch (scan versions → modal → multi-version fetch with dedup)

### Primary Documentation
- `PRD.md` - Full product requirements (lazy-read sections when needed)
- `IMPLEMENTATION_PLAN.md` - **Full feature list, architecture summary, all API routes, DB schema** ← READ THIS FIRST
- `TEST_PLAN.md` - Test cases and results (created in Phase 4)

### Coding Guidelines
- Follow `IMPLEMENTATION_PLAN.md` for tasks
- Use typed language as specified in PRD.md
- Mark completed tasks with `[x]`
- Keep code minimal and focused

### ⚠️ MANDATORY: Doc-Sync After Changes
**Sau MỌI thay đổi feature/system, BẮT BUỘC cập nhật docs NGAY (không cần user nhắc):**

| Thay đổi | Cập nhật |
| --- | --- |
| Thêm/sửa feature | → `PRD.md` (features) + `IMPLEMENTATION_PLAN.md` (tasks + architecture) |
| Thêm/sửa API route | → `IMPLEMENTATION_PLAN.md` (Phase 5) + `PRD.md` (§10 API Design) |
| Thay đổi DB schema | → `IMPLEMENTATION_PLAN.md` (Phase 2) + `PRD.md` (§7 Data Models) |
| Thay đổi AI pipeline | → `IMPLEMENTATION_PLAN.md` (Phase 4 + Architecture) |
| Thay đổi lớn | → `GEMINI.md` (Project Summary + Current Phase) |
| Hoàn thành task | → `IMPLEMENTATION_PLAN.md` (Progress Log: thêm 1 dòng mới) |

**Quy tắc:**
1. Cập nhật docs SAU KHI build thành công, TRƯỚC KHI báo kết quả cho user
2. Không gộp — mỗi thay đổi cập nhật ngay
3. Giữ docs ngắn gọn, chính xác — không giải thích dài dòng
