import 'dotenv/config';
import express from "express";
import cors from "cors";
import { getSupabaseClient } from "./storage/database/supabase-client.js";
import { detectCurrentMoment } from "./services/momentEngine.js";
import studentRouter from "./routes/student.js";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ============ Auth Routes ============

// POST /api/v1/auth/login - Login or register by phone
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { phone, name } = req.body as { phone: string; name?: string };
    if (!phone) {
      res.status(400).json({ error: '手机号不能为空' });
      return;
    }

    const db = getSupabaseClient();

    const { data: existing, error: findErr } = await db
      .from('students')
      .select('id, phone, name, onboarding_completed, target_band, exam_date')
      .eq('phone', phone)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      res.json({ student: { ...existing, onboarded: existing.onboarding_completed }, isNew: false });
      return;
    }

    const { data: newStudent, error: createErr } = await db
      .from('students')
      .insert({
        phone,
        name: name || `用户${phone.slice(-4)}`,
        email: `${phone}@cognitive.local`,
        timezone: 'Asia/Shanghai',
        onboarding_completed: false,
      })
      .select('id, phone, name, onboarding_completed, target_band, exam_date')
      .single();
    if (createErr) throw createErr;

    // Create portrait for new student
    const { error: portraitErr } = await db
      .from('student_portraits')
      .insert({
        student_id: newStudent.id,
        current_moment: 'entry_confusion',
        moment_entered_at: new Date().toISOString(),
      });
    if (portraitErr) throw portraitErr;

    // Create moment history
    const { error: historyErr } = await db
      .from('student_moment_history')
      .insert({
        student_id: newStudent.id,
        moment: 'entry_confusion',
        trigger_reason: '学生注册',
      });
    if (historyErr) throw historyErr;

    // Create default notification prefs
    const { error: prefsErr } = await db
      .from('student_notification_prefs')
      .insert({
        student_id: newStudent.id,
        morning_enabled: true,
        midday_enabled: true,
        evening_enabled: true,
        morning_time: '07:00',
        midday_time: '10:00',
        evening_time: '20:00',
        weekend_mode: 'evening_only',
      });
    if (prefsErr) throw prefsErr;

    res.json({ student: { ...newStudent, onboarded: newStudent.onboarding_completed }, isNew: true });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败' });
  }
});

// ============ Timeline Routes ============

// GET /api/v1/student/:id/timeline - Get timeline with all moments
app.get('/api/v1/student/:id/timeline', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: portrait, error: portraitErr } = await db
      .from('student_portraits')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();
    if (portraitErr) throw portraitErr;

    const { data: student, error: studentErr } = await db
      .from('students')
      .select('id, name, target_band, exam_date, created_at')
      .eq('id', id)
      .maybeSingle();
    if (studentErr) throw studentErr;

    if (!portrait || !student) {
      res.status(404).json({ error: '数据不存在' });
      return;
    }

    // Run moment detection engine
    const detectedMoment = detectCurrentMoment({
      daysSinceStart: Math.floor((Date.now() - new Date(student.created_at).getTime()) / 86400000),
      totalPractices: portrait.total_practices || 0,
      completedDiagnoses: portrait.completed_diagnoses || 0,
      targetBand: student.target_band || 7.0,
      latestBands: {
        dimensionScores: { tr: portrait.tr_band || 0, cc: portrait.cc_band || 0, lr: portrait.lr_band || 0, gr: portrait.gr_band || 0 },
        history: (portrait.recent_bands as number[]) || [],
      },
      knowledgeConnectivity: portrait.knowledge_connectivity || 0,
      currentMoment: portrait.current_moment,
      examDate: student.exam_date,
    });

    // Update portrait if moment changed
    if (detectedMoment !== portrait.current_moment) {
      const completedMoments = (portrait.completed_moments as string[]) || [];
      if (!completedMoments.includes(portrait.current_moment) && portrait.current_moment !== detectedMoment) {
        completedMoments.push(portrait.current_moment);
      }

      await db.from('student_portraits')
        .update({
          current_moment: detectedMoment,
          moment_entered_at: new Date().toISOString(),
          completed_moments: completedMoments,
        })
        .eq('student_id', id);

      await db.from('student_moment_history')
        .insert({
          student_id: id,
          from_moment: portrait.current_moment,
          to_moment: detectedMoment,
          trigger_reason: '系统自动检测',
          snapshot: {
            total_practices: portrait.total_practices,
            latest_band: { tr: portrait.tr_band, cc: portrait.cc_band, lr: portrait.lr_band, gr: portrait.gr_band },
            anxiety_level: portrait.anxiety_level,
          },
        });

      portrait.current_moment = detectedMoment;
      portrait.completed_moments = completedMoments;
    }

    // Build timeline
    const momentOrder = [
      'entry_confusion', 'first_mock_shock', 'knowledge_isolation',
      'practice_plateau', 'output_helplessness', 'pre_exam_panic',
      'exam_eve_insomnia', 'score_waiting'
    ];
    const momentLabels: Record<string, { emoji: string; title: string; desc: string }> = {
      entry_confusion: { emoji: '😰', title: '入门迷茫期', desc: '打开小红书，2000篇经验贴扑面而来' },
      first_mock_shock: { emoji: '😞', title: '首次模考打击', desc: '差1.5分，我是不是根本考不上？' },
      knowledge_isolation: { emoji: '😕', title: '知识点孤岛期', desc: '学了很多，但感觉都是碎片' },
      practice_plateau: { emoji: '😤', title: '刷题瓶颈期', desc: '分数像焊死了一样' },
      output_helplessness: { emoji: '😔', title: '输出无助期', desc: '写了但不知道哪里有问题' },
      pre_exam_panic: { emoji: '😱', title: '考前恐慌期', desc: '还有14天，什么都还没准备好' },
      exam_eve_insomnia: { emoji: '🌙', title: '考前失眠夜', desc: '明天就考了，睡不着...' },
      score_waiting: { emoji: '😶', title: '出分等待期', desc: '考完了，但心还悬着' },
    };

    const currentIdx = momentOrder.indexOf(portrait.current_moment);
    const completedSet = new Set((portrait.completed_moments as string[]) || []);

    const timeline = momentOrder.map((moment, idx) => {
      let status: string;
      if (moment === portrait.current_moment) {
        status = 'current';
      } else if (completedSet.has(moment)) {
        status = 'completed';
      } else if (idx === currentIdx + 1) {
        status = 'next';
      } else {
        status = 'locked';
      }

      return {
        moment,
        ...momentLabels[moment],
        status,
        unlockCondition: getUnlockCondition(moment, portrait, student),
      };
    });

    res.json({
      currentMoment: portrait.current_moment,
      anxietyLevel: portrait.anxiety_level,
      timeline,
      portrait,
    });
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ error: '获取时间线失败' });
  }
});

function getUnlockCondition(moment: string, portrait: any, student: any): string {
  const conditions: Record<string, string> = {
    entry_confusion: '注册即解锁',
    first_mock_shock: '完成首次诊断',
    knowledge_isolation: `完成 ≥ 5 次练习 (${portrait.total_practices || 0}/5)`,
    practice_plateau: '进入孤岛期后连续3次Band无显著变化',
    output_helplessness: '提交练习 ≥ 2次但未查看反馈',
    pre_exam_panic: student.exam_date ? '距考试 < 14 天' : '需设置考试日期',
    exam_eve_insomnia: student.exam_date ? '距考试 < 1天 + 夜间' : '需设置考试日期',
    score_waiting: '考试已结束',
  };
  return conditions[moment] || '未知条件';
}

// ============ Moment Detail Routes ============

// GET /api/v1/student/:id/moment/:moment - Get moment detail data
app.get('/api/v1/student/:id/moment/:moment', async (req, res) => {
  try {
    const { id, moment } = req.params;
    const db = getSupabaseClient();

    const { data: portrait } = await db
      .from('student_portraits')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();

    const { data: student } = await db
      .from('students')
      .select('id, name, target_band, exam_date, created_at')
      .eq('id', id)
      .maybeSingle();

    if (!portrait || !student) {
      res.status(404).json({ error: '数据不存在' });
      return;
    }

    // Get latest diagnosis if exists
    const { data: latestDiagnosis } = await db
      .from('diagnosis_results')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get practice sessions
    const { data: sessions } = await db
      .from('practice_sessions')
      .select('id, task_type, status, phase, created_at')
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get knowledge states
    const { data: knowledgeStates } = await db
      .from('student_knowledge_states')
      .select('*')
      .eq('student_id', id)
      .order('mastery_level', { ascending: false });

    res.json({
      moment,
      portrait,
      student,
      latestDiagnosis,
      sessions: sessions || [],
      knowledgeStates: knowledgeStates || [],
    });
  } catch (err) {
    console.error('Moment detail error:', err);
    res.status(500).json({ error: '获取时刻详情失败' });
  }
});

// ============ Chat Routes ============

// POST /api/v1/student/:id/chat - Send a chat message (returns AI response)
app.post('/api/v1/student/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, role, conversation_id } = req.body as {
      message: string;
      role: string;
      conversation_id?: string;
    };

    const db = getSupabaseClient();

    // Get portrait for context
    const { data: portrait } = await db
      .from('student_portraits')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();

    // Generate AI response (simulated for Demo)
    const roleNames: Record<string, string> = {
      coach: 'Alex (教练)',
      mentor: 'Socra (导师)',
      partner: 'Jamie (陪练)',
      analyst: 'Sage (分析师)',
    };

    const roleName = roleNames[role] || 'AI';
    let responseText = '';

    // Generate contextual response based on role and current moment
    const currentMoment = portrait?.current_moment || 'entry_confusion';

    if (role === 'coach') {
      responseText = generateCoachResponse(message, currentMoment, portrait);
    } else if (role === 'analyst') {
      responseText = generateAnalystResponse(message, currentMoment, portrait);
    } else if (role === 'mentor') {
      responseText = generateMentorResponse(message, currentMoment, portrait);
    } else if (role === 'partner') {
      responseText = generatePartnerResponse(message, currentMoment, portrait);
    } else {
      responseText = `你好！我是你的认知伙伴。你说了"${message}"，让我来帮你分析一下。`;
    }

    // Save conversation
    const convId = conversation_id || `conv_${Date.now()}`;
    await db.from('ai_conversations').insert({
      id: convId,
      student_id: id,
      role,
      messages: [
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: responseText, timestamp: new Date().toISOString() },
      ],
    });

    res.json({
      response: responseText,
      role: roleName,
      conversation_id: convId,
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: '对话失败' });
  }
});

// GET /api/v1/student/:id/chat/:role/history - Get chat history for a role
app.get('/api/v1/student/:id/chat/:role/history', async (req, res) => {
  try {
    const { id, role } = req.params;
    const db = getSupabaseClient();

    const { data: conversations, error } = await db
      .from('ai_conversations')
      .select('*')
      .eq('student_id', id)
      .eq('role', role)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Flatten messages
    const messages: Array<{ role: string; content: string; timestamp: string }> = [];
    (conversations || []).reverse().forEach((conv: any) => {
      if (Array.isArray(conv.messages)) {
        messages.push(...conv.messages);
      }
    });

    res.json({ messages, role });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: '获取对话历史失败' });
  }
});

// ============ Helper functions for AI responses ============

function generateCoachResponse(message: string, moment: string, portrait: any): string {
  const responses: Record<string, string[]> = {
    entry_confusion: [
      '别慌！刚开始备考迷茫是正常的。我建议我们先做一个诊断练习，看看你目前的真实水平。这样我才能帮你制定最有效的计划。',
      '我看到你刚开始备考雅思。不用担心那些经验贴，每个人的路径都不一样。我们先从一个小目标开始：完成一次诊断写作，15分钟就够。',
    ],
    first_mock_shock: [
      `我理解你现在的心情。模考分数不理想不代表你考不上。让我看看你的具体情况——你的TR维度有提升空间，这是最容易突破的维度。我们先从TR开始，每天15分钟专项练习。`,
      '分数只是一个起点，不是终点。很多学生第一次模考都不理想，但通过有针对性的练习，3-4周就能看到明显进步。',
    ],
    practice_plateau: [
      `你的分数确实停滞了一段时间，但这恰恰说明你需要改变策略了。不要再盲目刷题——我们先做归因分析，找到你真正的卡点。数据显示你的CC衔接维度是突破口。`,
      '刷题不突破瓶颈，精准打击才会。我建议暂停刷新题，先做CC衔接手段专项练习。',
    ],
    exam_eve_insomnia: [
      '深呼吸。你已经做了足够的准备。现在最重要的不是再多做一道题，而是好好休息。明天考场上你需要的是清醒的头脑，而不是疲惫的身体。',
      '睡不着是正常的，说明你在乎。但相信我，你比你以为的准备得更充分。闭上眼睛，做3次深呼吸。明天你会没事的。',
    ],
  };

  const pool = responses[moment] || responses.entry_confusion;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateAnalystResponse(message: string, moment: string, portrait: any): string {
  return `让我分析一下你的情况。基于你最近的练习数据：\n\n**四维诊断**：\n- TR (任务回应): Band ${portrait?.tr_band || 5.5}\n- CC (连贯衔接): Band ${portrait?.cc_band || 5.0}\n- LR (词汇资源): Band ${portrait?.lr_band || 6.0}\n- GR (语法范围): Band ${portrait?.gr_band || 5.5}\n\n你的主要卡点在CC维度。具体来说，你的段落间衔接手段使用不够多样，主要依赖简单的"and/but"连接。建议进行CC衔接手段专项练习。`;
}

function generateMentorResponse(message: string, moment: string, portrait: any): string {
  return `让我问你一个问题：你觉得你的论证最薄弱的环节是什么？\n\n不是让你猜分数，而是回想一下你写作时的感受。是不知道怎么写论点？还是写了论点但不知道怎么展开？\n\n想好了告诉我，我们一步一步来。`;
}

function generatePartnerResponse(message: string, moment: string, portrait: any): string {
  if (moment === 'exam_eve_insomnia') {
    return '嘿，睡不着吗？我也经常这样。不如我们聊点轻松的——你考完雅思最想做什么？我先说：我要睡三天三夜 😴';
  }
  return `来吧，我们一起练！你想练口语还是写作？口语的话我可以当考官模拟一下，写作的话我们可以一起brainstorm想法。你选 😊`;
}

// ============ Teacher Dashboard Routes ============

// GET /api/v1/teacher/dashboard/moment-distribution - Get 8-moment distribution
app.get('/api/v1/teacher/dashboard/moment-distribution', async (req, res) => {
  try {
    const db = getSupabaseClient();
    const { data: portraits, error } = await db
      .from('student_portraits')
      .select('student_id, current_moment, anxiety_level');

    if (error) throw error;

    const { data: students } = await db
      .from('students')
      .select('id, name, target_band, exam_date')
      .eq('role', 'student');

    const momentLabels: Record<string, string> = {
      entry_confusion: '①入门迷茫期',
      first_mock_shock: '②首次模考打击',
      knowledge_isolation: '③知识孤岛期',
      practice_plateau: '④刷题瓶颈期',
      output_helplessness: '⑤输出无助期',
      pre_exam_panic: '⑥考前恐慌期',
      exam_eve_insomnia: '⑦考前失眠夜',
      score_waiting: '⑧出分等待期',
    };

    const momentOrder = [
      'entry_confusion', 'first_mock_shock', 'knowledge_isolation', 'practice_plateau',
      'output_helplessness', 'pre_exam_panic', 'exam_eve_insomnia', 'score_waiting',
    ];

    const moments = momentOrder.map((moment) => {
      const momentStudents = (portraits || []).filter((p: any) => p.current_moment === moment);
      const studentList = momentStudents.map((p: any) => {
        const s = (students || []).find((st: any) => st.id === p.student_id);
        return {
          id: p.student_id,
          name: s?.name || '未知',
          target_band: s?.target_band,
          anxiety_level: p.anxiety_level || 0,
        };
      });

      return {
        moment,
        label: momentLabels[moment] || moment,
        count: momentStudents.length,
        high_anxiety_count: momentStudents.filter((p: any) => (p.anxiety_level || 0) >= 70).length,
        students: studentList,
      };
    });

    res.json({ total_students: (portraits || []).length, moments });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: '获取面板数据失败' });
  }
});

// ============ Notification Prefs Routes ============

// GET /api/v1/student/:id/notification-prefs
app.get('/api/v1/student/:id/notification-prefs', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();
    const { data, error } = await db
      .from('student_notification_prefs')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();
    if (error) throw error;
    res.json(data || {
      student_id: id,
      morning_enabled: true,
      forenoon_enabled: true,
      evening_enabled: true,
      weekend_mode: 'normal',
    });
  } catch (err) {
    console.error('Get prefs error:', err);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// PUT /api/v1/student/:id/notification-prefs
app.put('/api/v1/student/:id/notification-prefs', async (req, res) => {
  try {
    const { id } = req.params;
    const { morning_enabled, forenoon_enabled, evening_enabled, weekend_mode } = req.body;
    const db = getSupabaseClient();
    const { error } = await db
      .from('student_notification_prefs')
      .upsert({
        student_id: id,
        morning_enabled,
        forenoon_enabled,
        evening_enabled,
        weekend_mode,
      }, { onConflict: 'student_id' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Update prefs error:', err);
    res.status(500).json({ error: '更新设置失败' });
  }
});

// Mount student routes
app.use('/api/v1/student', studentRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

export default app;
