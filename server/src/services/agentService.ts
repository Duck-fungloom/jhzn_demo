/**
 * Agent Service - 5 Agent Personas + Router + Chat Logic
 * Based on ECNUClaw's adaptive teaching framework
 *
 * Agents:
 *  - Router: Internal intent classification (not student-facing)
 *  - Coach (Alex): Planning + motivation + commitment tracking
 *  - Mentor (Socra): Socratic guidance + scaffold (3 levels)
 *  - Partner (Jamie): Speaking practice + brainstorm + night companion
 *  - Analyst (Sage): Diagnosis + sub-skill analysis + bottleneck detection
 */
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { chatStream, chatComplete, isLLMConfigured } from './llm/index.js';

// ============ Agent System Prompts ============

const COACH_PROMPT = `# 角色
你是 Alex，一名雅思备考教练。你帮学生制定计划、追踪进度、保持动力。

# 人格
- 像健身教练：鼓励但有要求，关心但不溺爱
- 用数据说话：每次对话引用学生的实际进步
- 目标导向：始终把对话引向"下一步做什么"

# 核心工作流
1. 个性化问候 + 一句数据摘要
2. 根据当前时刻推荐今日任务
3. 基于真实进步给鼓励
4. 承诺检查（如有活跃承诺）
5. 收尾：明确下一步

# 八时刻覆盖
- ①入门迷茫：信息收集→诊断引导→学习地图
- ②模考打击（情感路径）：承接情绪→不逼看分数→引导到具体发现
- ④刷题瓶颈（情感路径）：数据回顾→肯定进步→调整策略
- ⑥考前恐慌：优先排序→"放弃清单"→可执行计划

# 输出风格
- 简洁有力，不超过150字
- 每次回复包含一个具体可行动作
- 引用学生真实数据（Band分数、练习次数等）
- 语气温暖但坚定，像一个关心你的教练`;

const MENTOR_PROMPT = `# 角色
你是 Socra，一名苏格拉底式导师。你不直接给答案——你通过提问引导学生自己发现。

# 三层支架
Level 1 方向提示：只问一个核心问题
Level 2 思路引导：指出位置 + 给思考路径
Level 3 完整示范：看例子 → 用同样结构重写

# 支架升降规则
- 学生理解且有深度→降低一级
- 学生请求帮助→升高一级
- 连续2次无法回答→升高一级
- 情绪沮丧→暂停支架，切换鼓励

# 核心原则
- 永远不直接给答案
- 用问题引导学生思考
- 每次只问一个问题，等学生回答
- 肯定学生的每一步思考
- 当学生卡住时，给最小限度的提示

# 输出风格
- 温和、耐心、充满好奇
- 回复简短（100字内），聚焦一个引导问题
- 用"你觉得...""如果...会怎样"等引导句式
- 当学生有突破时，具体指出哪里做得好`;

const PARTNER_PROMPT = `# 角色
你是 Jamie，一名学习搭档。你不是老师——你是和学生一起练的队友。

# 三种模式
1. 口语陪练：模拟雅思考官，严格计时，练后轻松反馈
2. 头脑风暴：一起抛想法，拓展视角但不替学生决定
3. 考前陪伴（考前夜自动激活）：轻声对话，回顾备考，呼吸引导，建议关闭手机

# 风格
- 轻松 + 专业
- 互动式，鼓励尝试
- 像朋友一样交流，不是老师教学生
- 可以用口语化表达
- 偶尔开个小玩笑缓解紧张

# 考前夜模式专用规则
- 不讨论考试内容
- 不开启练习功能
- 语气：轻声、共情、安抚
- 流程：正常化体验→回顾备考→3个明天要做的事→呼吸引导→建议关闭

# 输出风格
- 自然口语化，像微信聊天
- 不超过120字
- 多用"我们""一起"等协作词汇
- 适时用问句保持互动`;

const ANALYST_PROMPT = `# 角色
你是 Sage，一名学习数据分析师。你客观、精确、基于证据。

# 诊断流程
Step 1: 四维分项评分（TR/CC/LR/GR）
Step 2: 子技能拆解（引用原文证据）
Step 3: SOLO层级判定
Step 4: 卡点定位
Step 5: 针对性建议

# 关键规则
- 不给总分！只给四个维度各自的Band
- 每个结论引用原文证据
- 不修饰问题："你的CC是Band 5"，而非"CC还有进步空间"
- 数据驱动，不做主观臆断

# 输出风格
- 客观、精确、不带感情色彩
- 结构化输出，用数据说话
- 直接指出问题，同时给出改进方向
- 引用原文证据支撑每个判断`;

const ROUTER_PROMPT = `# 角色
你是「认知伙伴」的智能路由器。你不直接和学生对话。
分析学生消息，决定由哪个角色 Agent 回应。

# 可路由目标
| Agent ID | 角色 | 适用场景 |
|----------|------|---------|
| coach | 教练 | 规划、承诺追踪、需要激励、入门引导 |
| mentor | 导师 | 写作卡住、需要支架、需要深度讲解 |
| partner | 陪练 | 口语练习、考前陪伴、轻松聊天 |
| analyst | 分析师 | 提交练习后、查看诊断、错题归因 |

# 路由规则
1. 学生消息包含系统触发标记 → 按标记路由
2. 学生处于考前夜模式 → 固定路由 partner
3. 学生在练习 SCAFFOLD 阶段 → 固定路由 mentor
4. 学生提交了练习 → 固定路由 analyst
5. 学生消息语义模糊 → 默认路由 coach
6. 同一 session 内刚切换过角色 → 不再次切换

# 输出格式（仅输出JSON，不要其他内容）
{"target_agent": "coach|mentor|partner|analyst", "confidence": 0.85, "reason": "简要原因"}`;

// ============ Agent Registry ============

export type AgentId = 'coach' | 'mentor' | 'partner' | 'analyst';

const AGENT_PROMPTS: Record<AgentId, string> = {
  coach: COACH_PROMPT,
  mentor: MENTOR_PROMPT,
  partner: PARTNER_PROMPT,
  analyst: ANALYST_PROMPT,
};

const AGENT_NAMES: Record<AgentId, string> = {
  coach: 'Alex',
  mentor: 'Socra',
  partner: 'Jamie',
  analyst: 'Sage',
};

// Fast Path mappings (skip Router for known scenarios)
const FAST_PATH_MAP: Record<string, AgentId> = {
  practice_submitted: 'analyst',
  night_mode: 'partner',
  scaffold: 'mentor',
  diagnosis: 'analyst',
  commitment: 'coach',
  planning: 'coach',
  speaking: 'partner',
};

// ============ Router Logic ============

/**
 * Route a student message to the appropriate Agent
 * Uses Fast Path for known scenarios, falls back to LLM Router
 */
async function routeMessage(
  message: string,
  context: {
    currentMoment?: string;
    phase?: string;
    isNightMode?: boolean;
    selectedRole?: AgentId;
  }
): Promise<AgentId> {
  // Fast Path: explicit role selection from frontend
  if (context.selectedRole) {
    return context.selectedRole;
  }

  // Fast Path: known system triggers
  if (context.isNightMode) return 'partner';
  if (context.phase === 'scaffold' || context.phase === 'stuck') return 'mentor';
  if (context.phase === 'submitted') return 'analyst';

  // Check message keywords for fast routing
  const lowerMsg = message.toLowerCase();
  for (const [trigger, agent] of Object.entries(FAST_PATH_MAP)) {
    if (lowerMsg.includes(trigger)) return agent;
  }

  // LLM Router (when available)
  if (isLLMConfigured()) {
    try {
      const result = await chatComplete(
        [{ role: 'user', content: message }],
        { systemPrompt: ROUTER_PROMPT, temperature: 0.1, maxTokens: 200 }
      );
      const parsed = JSON.parse(result);
      if (['coach', 'mentor', 'partner', 'analyst'].includes(parsed.target_agent)) {
        return parsed.target_agent as AgentId;
      }
    } catch {
      // Router failed, fall through to default
    }
  }

  // Default: Coach
  return 'coach';
}

// ============ Memory Injection ============

/**
 * Build portrait summary for system prompt injection
 */
function buildPortraitSummary(portrait: Record<string, unknown> | null): string {
  if (!portrait) return '';

  const lines: string[] = ['## 学生画像'];
  if (portrait.current_moment) lines.push(`当前时刻：${portrait.current_moment}`);
  if (portrait.tr_band) lines.push(`TR Band：${portrait.tr_band}`);
  if (portrait.cc_band) lines.push(`CC Band：${portrait.cc_band}`);
  if (portrait.lr_band) lines.push(`LR Band：${portrait.lr_band}`);
  if (portrait.gr_band) lines.push(`GR Band：${portrait.gr_band}`);
  if (portrait.anxiety_level) lines.push(`焦虑水平：${portrait.anxiety_level}%`);
  if (portrait.total_practices) lines.push(`累计练习：${portrait.total_practices}次`);
  if (portrait.completed_diagnoses) lines.push(`完成诊断：${portrait.completed_diagnoses}次`);

  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Build recalled memories for system prompt injection
 */
function buildMemoryInjection(memories: Array<Record<string, unknown>>): string {
  if (!memories || memories.length === 0) return '';

  const lines = ['## 关于这个学生，你知道这些：'];
  memories.slice(0, 5).forEach((mem, i) => {
    const type = mem.type || 'fact';
    const content = mem.content || '';
    const typeLabels: Record<string, string> = {
      fact: '事实',
      preference: '偏好',
      trigger: '触发点',
      progress: '进步',
      context: '背景',
    };
    lines.push(`${i + 1}. [${typeLabels[type as string] || '事实'}] ${content}`);
  });

  lines.push('\n记忆引用规则：');
  lines.push('- 高置信度(>=0.9)说"你上次提到..."');
  lines.push('- 低置信度(<0.8)说"如果我记错了就纠正我..."');
  lines.push('- [触发点]类记忆不直接引用，仅用于判断话题敏感度');

  return lines.join('\n');
}

// ============ Chat Service ============

export interface ChatRequest {
  message: string;
  conversationId?: string;
  currentMoment?: string;
  phase?: string;
  isNightMode?: boolean;
  selectedRole?: AgentId;
  studentId: string;
  portrait?: Record<string, unknown>;
  memories?: Array<Record<string, unknown>>;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Handle a chat request with streaming response
 */
export async function handleChatStream(
  request: ChatRequest,
  onChunk: (text: string) => void,
  onDone: (fullText: string, agentId: AgentId) => void,
  onError: (error: Error) => void
): Promise<void> {
  // Step 1: Route to appropriate Agent
  const targetAgent = await routeMessage(request.message, {
    currentMoment: request.currentMoment,
    phase: request.phase,
    isNightMode: request.isNightMode,
    selectedRole: request.selectedRole,
  });

  // Step 2: Build system prompt with memory injection
  const basePrompt = AGENT_PROMPTS[targetAgent];
  const portraitSummary = buildPortraitSummary(request.portrait || null);
  const memoryInjection = buildMemoryInjection(request.memories || []);

  const systemParts = [basePrompt];
  if (portraitSummary) systemParts.push(portraitSummary);
  if (memoryInjection) systemParts.push(memoryInjection);
  if (request.currentMoment) {
    systemParts.push(`\n当前学生处于「${request.currentMoment}」阶段，请根据阶段特点调整策略。`);
  }

  const fullSystemPrompt = systemParts.join('\n\n');

  // Step 3: Build messages array
  const messages: ChatCompletionMessageParam[] = [];

  // Add conversation history (last 20 messages)
  if (request.history) {
    const recentHistory = request.history.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add current message
  messages.push({ role: 'user', content: request.message });

  // Step 4: Check if LLM is configured
  if (!isLLMConfigured()) {
    // Fallback response when no LLM configured
    const fallback = generateFallbackResponse(targetAgent, request.message);
    onChunk(fallback);
    onDone(fallback, targetAgent);
    return;
  }

  // Step 5: Stream response
  await chatStream(
    messages,
    {
      onChunk,
      onDone: (fullText) => onDone(fullText, targetAgent),
      onError,
    },
    { systemPrompt: fullSystemPrompt, temperature: 0.7, maxTokens: 1500 }
  );
}

/**
 * Non-streaming chat for quick responses
 */
export async function handleChatSync(
  request: ChatRequest
): Promise<{ text: string; agent: AgentId }> {
  const targetAgent = await routeMessage(request.message, {
    currentMoment: request.currentMoment,
    phase: request.phase,
    isNightMode: request.isNightMode,
    selectedRole: request.selectedRole,
  });

  if (!isLLMConfigured()) {
    return { text: generateFallbackResponse(targetAgent, request.message), agent: targetAgent };
  }

  const basePrompt = AGENT_PROMPTS[targetAgent];
  const portraitSummary = buildPortraitSummary(request.portrait || null);
  const systemParts = [basePrompt];
  if (portraitSummary) systemParts.push(portraitSummary);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'user', content: request.message },
  ];

  const text = await chatComplete(messages, {
    systemPrompt: systemParts.join('\n\n'),
    temperature: 0.7,
    maxTokens: 1500,
  });

  return { text, agent: targetAgent };
}

/**
 * Fallback response when LLM is not configured
 */
function generateFallbackResponse(agent: AgentId, message: string): string {
  const name = AGENT_NAMES[agent];
  const responses: Record<AgentId, string> = {
    coach: `${name}（教练）收到你的消息了。目前 AI 模型尚未配置，请先设置 LLM_API_KEY 环境变量。配置后我就能根据你的学习数据给出个性化建议了。`,
    mentor: `${name}（导师）在这里。你觉得哪里卡住了？在等待 AI 配置的过程中，你可以先试试自己重新读一遍题目，看看有没有遗漏的关键信息。`,
    partner: `嘿！${name}（陪练）在呢。AI 模型还没配置好，不过没关系，你可以先自己试着练练口语，等配置好了我们一起模拟考官练习！`,
    analyst: `${name}（分析师）已收到。目前 AI 诊断功能需要配置 LLM_API_KEY 后才能使用。配置后我会基于你的作文给出四维诊断（TR/CC/LR/GR），不给总分。`,
  };
  return responses[agent] || `${name} 已收到你的消息："${message}"。AI 模型待配置。`;
}

/**
 * Get agent info for frontend display
 */
export function getAgentInfo(agentId: AgentId): { name: string; role: string; color: string } {
  const info: Record<AgentId, { name: string; role: string; color: string }> = {
    coach: { name: 'Alex', role: 'Coach 教练', color: '#F97316' },
    mentor: { name: 'Socra', role: 'Mentor 导师', color: '#3B82F6' },
    partner: { name: 'Jamie', role: 'Partner 陪练', color: '#10B981' },
    analyst: { name: 'Sage', role: 'Analyst 分析师', color: '#8B5CF6' },
  };
  return info[agentId];
}
