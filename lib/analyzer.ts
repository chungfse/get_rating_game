import { getOpenAIClient } from "@/lib/openai";
import type {
  AIClusterResponse,
  AIIncrementalResponse,
  AIIssueExtractionResponse,
  Review,
  TopicGroup,
  Issue,
} from "@/types";

const MODEL = "gpt-4o-mini";

// ─── Legacy: Topic Clustering (kept for backward compatibility) ─────

/**
 * Analyze reviews — initial clustering (first time, no existing groups)
 */
export async function analyzeReviews(
  reviews: Review[],
  gameName: string
): Promise<AIClusterResponse> {
  const client = getOpenAIClient();

  const reviewsData = reviews.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.text.length > 300 ? r.text.slice(0, 300) + "..." : r.text,
    ...(r.title ? { title: r.title } : {}),
  }));

  const systemPrompt = `Bạn là chuyên gia phân tích review app/game mobile. Trả lời bằng JSON.`;

  const userPrompt = `Dưới đây là ${reviews.length} review của game "${gameName}" với rating ≤4★.
Hãy phân loại chúng thành các nhóm vấn đề (topics) rõ ràng, **tối đa 20 nhóm**.

Yêu cầu:
- Mỗi nhóm có id (snake_case), label (tiếng Việt ngắn gọn)
- Mỗi review chỉ thuộc 1 nhóm duy nhất (nhóm phù hợp nhất)
- Không tạo nhóm "Khác" hay "Chung chung" — mọi review đều phải vào nhóm cụ thể
- Nhóm theo VẤN ĐỀ cụ thể (Lag, Payment, Bug UI, v.v.) — càng chi tiết càng tốt
- Số nhóm tối thiểu bằng số vấn đề độc lập trong review (có thể ít hơn 20 nếu review ít chủ đề)

Return JSON:
{
  "groups": [{"id": "...", "label": "...", "count": <number>}],
  "assignments": [{"reviewId": "...", "groupId": "..."}]
}

Reviews:
${JSON.stringify(reviewsData)}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 16384,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content) as AIClusterResponse;

  // Validate structure
  if (!parsed.groups || !parsed.assignments) {
    throw new Error("Invalid AI response format: missing groups or assignments");
  }

  return parsed;
}

/**
 * Analyze reviews — incremental (when existing groups exist)
 */
export async function analyzeReviewsIncremental(
  reviews: Review[],
  gameName: string,
  existingGroups: TopicGroup[]
): Promise<AIIncrementalResponse> {
  const client = getOpenAIClient();

  const reviewsData = reviews.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.text.length > 300 ? r.text.slice(0, 300) + "..." : r.text,
    ...(r.title ? { title: r.title } : {}),
  }));

  const existingGroupsData = existingGroups.map((g) => ({
    id: g.id,
    label: g.label,
  }));

  const systemPrompt = `Bạn là chuyên gia phân tích review app/game mobile. Trả lời bằng JSON.`;

  const userPrompt = `Dưới đây là ${reviews.length} review MỚI của game "${gameName}" cần được phân loại.
Các nhóm vấn đề hiện có (đã được tạo từ lần phân tích trước):

EXISTING_GROUPS:
${JSON.stringify(existingGroupsData)}

Yêu cầu:
- Ưu tiên gán review vào nhóm hiện có nếu phù hợp
- Chỉ tạo nhóm MỚI nếu review đề cập vấn đề hoàn toàn chưa có trong danh sách
- Tổng số nhóm (cũ + mới) không được vượt quá **20 nhóm**
- Nếu đã đủ 20 nhóm, gán review vào nhóm gần nhất thay vì tạo mới
- Không tạo nhóm "Khác" hay "Chung chung"

Return JSON:
{
  "newGroups": [{"id": "...", "label": "..."}],
  "assignments": [{"reviewId": "...", "groupId": "..."}]
}

New Reviews:
${JSON.stringify(reviewsData)}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 16384,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content) as AIIncrementalResponse;

  if (!parsed.assignments) {
    throw new Error("Invalid AI response format: missing assignments");
  }

  // Default newGroups to empty array if not present
  if (!parsed.newGroups) {
    parsed.newGroups = [];
  }

  return parsed;
}

// ─── New: Issue Extraction ──────────────────────────────────────────

const CATEGORIES_DESC = `Categories:
- crash_bug: App crash, freeze, lỗi nghiêm trọng khiến không chơi được
- performance: Lag, giật, tốn pin, quá nhiệt, load chậm
- monetization: P2W, IAP lừa đảo, ép trả tiền, giá quá đắt
- ads: Quảng cáo quá nhiều, quảng cáo intrusive, ads sau khi trả tiền
- game_design: Cân bằng gameplay, difficulty spikes, progression walls
- ux_ui: Giao diện tệ, UX khó dùng, nút bấm, layout
- content: Thiếu nội dung, lặp lại, nhàm chán, ít map/level
- multiplayer: Matchmaking, hack/cheat, lag PvP, toxic
- account: Mất dữ liệu, login, chuyển máy, đồng bộ
- update: Update mới phá game, thay đổi tệ, nerf`;

const SEVERITY_DESC = `Severity:
- critical: Crash, mất tiền, mất data → user uninstall ngay (cơ hội lớn nhất để exploit)
- high: Vấn đề nghiêm trọng ảnh hưởng gameplay chính (ưu tiên cao)
- medium: Phiền toái nhưng chưa đến mức bỏ game
- low: Minor annoyance, cosmetic, nice-to-have`;

/**
 * Extract issues from reviews — initial extraction (first time)
 */
export async function extractIssues(
  reviews: Review[],
  gameName: string
): Promise<AIIssueExtractionResponse> {
  const client = getOpenAIClient();

  const reviewsData = reviews.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.text.length > 300 ? r.text.slice(0, 300) + "..." : r.text,
    ...(r.title ? { title: r.title } : {}),
  }));

  const systemPrompt = `Bạn là chuyên gia phân tích competitive intelligence cho game mobile.
Nhiệm vụ: Trích xuất các VẤN ĐỀ CỤ THỂ từ review game đối thủ để tìm cơ hội cải thiện game của khách hàng.
Trả lời bằng JSON.`;

  const userPrompt = `Phân tích ${reviews.length} review của game "${gameName}".

NHIỆM VỤ: Trích xuất tất cả VẤN ĐỀ CỤ THỂ mà user đề cập. MỖI REVIEW CÓ THỂ ĐỀ CẬP NHIỀU VẤN ĐỀ.

${CATEGORIES_DESC}

${SEVERITY_DESC}

YÊU CẦU:
1. Label phải CỤ THỂ (❌ "Lỗi game" → ✅ "Crash liên tục khi vào chế độ PvP")
2. Mỗi review có thể liên quan đến NHIỀU issues (1:N)
3. Gộp các vấn đề tương tự thành 1 issue, nhưng KHÔNG giới hạn số lượng — tạo đủ issues để phân loại chính xác
4. sentiment: -1.0 (rất tiêu cực) đến 0 (trung tính)
5. sample_quotes: 2-3 trích dẫn ngắn gọn nhất, tiêu biểu nhất (tiếng gốc của user)
6. actionable_insight: Gợi ý HÀNH ĐỘNG cụ thể cho game developer (viết bằng tiếng Việt)
7. id: snake_case, ngắn gọn, mô tả vấn đề

Return JSON:
{
  "issues": [
    {
      "id": "crash_pvp_mode",
      "label": "Crash liên tục khi vào chế độ PvP",
      "category": "crash_bug",
      "severity": "critical",
      "sentiment": -0.95,
      "actionable_insight": "Chế độ PvP của đối thủ có bug crash nghiêm trọng. Game mình cần đảm bảo PvP ổn định và test kỹ trước release.",
      "sample_quotes": ["Vào PvP là crash, đã thử 10 lần", "Crash hoài không chơi được PvP"]
    }
  ],
  "review_issues": [
    {"reviewId": "abc123", "issueIds": ["crash_pvp_mode", "lag_gameplay"]}
  ]
}

Reviews:
${JSON.stringify(reviewsData)}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 16384,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content) as AIIssueExtractionResponse;

  if (!parsed.issues || !parsed.review_issues) {
    throw new Error("Invalid AI response: missing issues or review_issues");
  }

  return parsed;
}

/**
 * Extract issues — incremental (when existing issues exist)
 */
export async function extractIssuesIncremental(
  reviews: Review[],
  gameName: string,
  existingIssues: Issue[]
): Promise<AIIssueExtractionResponse> {
  const client = getOpenAIClient();

  const reviewsData = reviews.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.text.length > 300 ? r.text.slice(0, 300) + "..." : r.text,
    ...(r.title ? { title: r.title } : {}),
  }));

  const existingIssuesData = existingIssues.map((i) => ({
    id: i.id,
    label: i.label,
    category: i.category,
    severity: i.severity,
  }));

  const systemPrompt = `Bạn là chuyên gia phân tích competitive intelligence cho game mobile.
Nhiệm vụ: Trích xuất vấn đề từ review MỚI, kết hợp với issues đã phân tích trước đó.
Trả lời bằng JSON.`;

  const userPrompt = `Phân tích ${reviews.length} review MỚI của game "${gameName}".

ISSUES ĐÃ CÓ từ lần phân tích trước:
${JSON.stringify(existingIssuesData)}

${CATEGORIES_DESC}

${SEVERITY_DESC}

YÊU CẦU:
1. Ưu tiên gán review vào issue ĐÃ CÓ nếu phù hợp
2. Chỉ tạo issue MỚI nếu review đề cập vấn đề hoàn toàn chưa có
3. Không giới hạn số issues — tạo đủ để phân loại chính xác, nhưng gộp vấn đề tương tự
4. Mỗi review có thể liên quan nhiều issues
5. Issue mới cần có đầy đủ: id, label, category, severity, sentiment, actionable_insight, sample_quotes

Return JSON:
{
  "issues": [
    // Chỉ liệt kê issues MỚI (không lặp lại issues cũ)
    {"id": "new_issue_id", "label": "...", "category": "...", "severity": "...", "sentiment": -0.8, "actionable_insight": "...", "sample_quotes": ["..."]}
  ],
  "review_issues": [
    // Gán cho TẤT CẢ reviews (dùng cả issue cũ lẫn mới)
    {"reviewId": "...", "issueIds": ["existing_issue_id", "new_issue_id"]}
  ]
}

New Reviews:
${JSON.stringify(reviewsData)}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 16384,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content) as AIIssueExtractionResponse;

  if (!parsed.review_issues) {
    throw new Error("Invalid AI response: missing review_issues");
  }

  if (!parsed.issues) {
    parsed.issues = [];
  }

  return parsed;
}
