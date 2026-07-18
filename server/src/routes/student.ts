import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// GET /api/v1/student/:id/profile - Get student profile with portrait
router.get('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: student, error: studentErr } = await db
      .from('students')
      .select('id, phone, name, target_band, exam_date, timezone, onboarded, last_active_at, created_at')
      .eq('id', id)
      .maybeSingle();
    if (studentErr) throw studentErr;
    if (!student) {
      res.status(404).json({ error: '学生不存在' });
      return;
    }

    const { data: portrait, error: portraitErr } = await db
      .from('student_portraits')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();
    if (portraitErr) throw portraitErr;

    await db.from('students').update({ last_active_at: new Date().toISOString() }).eq('id', id);

    res.json({ student, portrait });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: '获取档案失败' });
  }
});

// PUT /api/v1/student/:id/onboard - Complete onboarding
router.put('/:id/onboard', async (req, res) => {
  try {
    const { id } = req.params;
    const { target_band, exam_date } = req.body as { target_band: number; exam_date?: string };
    const db = getSupabaseClient();

    const { error: updateErr } = await db
      .from('students')
      .update({ onboarded: true, target_band, exam_date: exam_date || null })
      .eq('id', id);
    if (updateErr) throw updateErr;

    res.json({ success: true });
  } catch (err) {
    console.error('Onboard error:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// PUT /api/v1/student/:id/portrait - Update portrait
router.put('/:id/portrait', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getSupabaseClient();

    const { error } = await db
      .from('student_portraits')
      .update(updates)
      .eq('student_id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Portrait update error:', err);
    res.status(500).json({ error: '更新画像失败' });
  }
});

// ============ Practice Session Routes ============

// GET /api/v1/student/:id/practice-sessions - Get practice sessions
router.get('/:id/practice-sessions', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: sessions, error } = await db
      .from('practice_sessions')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ sessions: sessions || [] });
  } catch (err) {
    console.error('Sessions error:', err);
    res.status(500).json({ error: '获取练习列表失败' });
  }
});

// GET /api/v1/student/:id/practice-sessions/recommended - Get recommended practice
router.get('/:id/practice-sessions/recommended', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    // Get portrait to determine recommendation
    const { data: portrait } = await db
      .from('student_portraits')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();

    // Generate recommendation based on current moment
    const currentMoment = portrait?.current_moment || 'entry_confusion';
    const recommendations: Record<string, { task_type: string; title: string; description: string; duration: string }> = {
      entry_confusion: {
        task_type: 'diagnostic_writing',
        title: '诊断写作练习',
        description: '花15分钟完成一篇Task 2写作，帮助我们了解你目前的真实水平',
        duration: '15分钟',
      },
      first_mock_shock: {
        task_type: 'tr_special',
        title: 'TR专项：论点展开训练',
        description: '把你的"只提1句论点"变成"提出+解释+举例"的完整论证',
        duration: '20分钟',
      },
      practice_plateau: {
        task_type: 'cc_special',
        title: 'CC专项：衔接手段练习',
        description: '学习使用多样的衔接手段，让你的文章逻辑更流畅',
        duration: '15分钟',
      },
      exam_eve_insomnia: {
        task_type: 'relaxation',
        title: '考前放松',
        description: '今晚不做练习。回顾一下你的备考历程，然后好好休息',
        duration: '5分钟',
      },
    };

    const recommendation = recommendations[currentMoment] || recommendations.entry_confusion;
    res.json({ recommendation });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

// POST /api/v1/student/:id/practice-sessions - Create a new practice session
router.post('/:id/practice-sessions', async (req, res) => {
  try {
    const { id } = req.params;
    const { task_type } = req.body as { task_type: string };
    const db = getSupabaseClient();

    const { data: session, error } = await db
      .from('practice_sessions')
      .insert({
        student_id: id,
        task_type,
        status: 'active',
        phase: 'try',
      })
      .select()
      .single();

    if (error) throw error;

    // Update total practices
    await db.from('student_portraits')
      .update({
        total_practices: (await db.from('practice_sessions').select().eq('student_id', id).then(r => r.data?.length || 0)),
      })
      .eq('student_id', id);

    res.json({ session });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: '创建练习失败' });
  }
});

// GET /api/v1/student/:id/practice-sessions/:sessionId - Get practice session detail
router.get('/:id/practice-sessions/:sessionId', async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const db = getSupabaseClient();

    const { data: session, error } = await db
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', id)
      .maybeSingle();

    if (error) throw error;
    if (!session) {
      res.status(404).json({ error: '练习不存在' });
      return;
    }

    res.json({ session });
  } catch (err) {
    console.error('Session detail error:', err);
    res.status(500).json({ error: '获取练习详情失败' });
  }
});

// PUT /api/v1/student/:id/practice-sessions/:sessionId/content - Save writing content
router.put('/:id/practice-sessions/:sessionId/content', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phase, content, word_count } = req.body as {
      phase: string;
      content: string;
      word_count: number;
    };
    const db = getSupabaseClient();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (phase === 'try') updateData.phase1_content = content;
    else if (phase === 'revise') updateData.phase2_content = content;
    else if (phase === 'final') updateData.phase3_content = content;

    const { error } = await db
      .from('practice_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Save content error:', err);
    res.status(500).json({ error: '保存内容失败' });
  }
});

// PUT /api/v1/student/:id/practice-sessions/:sessionId/phase - Update phase
router.put('/:id/practice-sessions/:sessionId/phase', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { phase } = req.body as { phase: string };
    const db = getSupabaseClient();

    const { error } = await db
      .from('practice_sessions')
      .update({ phase })
      .eq('id', sessionId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Phase update error:', err);
    res.status(500).json({ error: '更新阶段失败' });
  }
});

// POST /api/v1/student/:id/practice-sessions/:sessionId/submit - Submit practice
router.post('/:id/practice-sessions/:sessionId/submit', async (req, res) => {
  try {
    const { id, sessionId } = req.params;
    const db = getSupabaseClient();

    // Get session
    const { data: session } = await db
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('student_id', id)
      .maybeSingle();

    if (!session) {
      res.status(404).json({ error: '练习不存在' });
      return;
    }

    // Generate diagnosis result (simulated for Demo)
    const diagnosisData = {
      student_id: id,
      session_id: sessionId,
      tr_band: 5.5 + Math.random() * 1.5,
      cc_band: 5.0 + Math.random() * 1.0,
      lr_band: 5.5 + Math.random() * 1.5,
      gr_band: 5.5 + Math.random() * 1.0,
      solo_level: 'multistructural',
      solo_justification: '学生能够识别多个要素，但尚未建立要素间的有机联系',
      bottlenecks: [
        {
          description: 'CC衔接手段单一',
          why_blocks: '主要依赖and/but/simple connectors，缺乏复杂衔接手段',
          current_band: 5.0,
          target_band: 6.5,
        },
      ],
      subskill_mastery: [
        { kc_id: 'k1', name: '论点提出', mastery: 0.65 },
        { kc_id: 'k2', name: '论点展开', mastery: 0.31 },
        { kc_id: 'k3', name: '例证使用', mastery: 0.48 },
        { kc_id: 'k4', name: '段落结构', mastery: 0.55 },
        { kc_id: 'k5', name: '衔接手段', mastery: 0.28 },
      ],
      recommended_practice: {
        kc_id: 'k5',
        practice_type: 'CC衔接手段专项训练',
        reason: '衔接手段是你目前最薄弱的子技能，提升空间最大',
      },
    };

    // Save diagnosis
    const { data: diagnosis, error: diagErr } = await db
      .from('diagnosis_results')
      .insert(diagnosisData)
      .select()
      .single();

    if (diagErr) throw diagErr;

    // Update session status
    await db.from('practice_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Update portrait bands
    await db.from('student_portraits')
      .update({
        tr_band: Math.round(diagnosisData.tr_band * 2) / 2,
        cc_band: Math.round(diagnosisData.cc_band * 2) / 2,
        lr_band: Math.round(diagnosisData.lr_band * 2) / 2,
        gr_band: Math.round(diagnosisData.gr_band * 2) / 2,
        completed_diagnoses: ((await db.from('diagnosis_results').select().eq('student_id', id).then(r => r.data?.length || 0))),
      })
      .eq('student_id', id);

    res.json({ diagnosis, session });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: '提交失败' });
  }
});

// GET /api/v1/student/:id/practice-sessions/:sessionId/comparison - Get phase comparison
router.get('/:id/practice-sessions/:sessionId/comparison', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const db = getSupabaseClient();

    const { data: session, error } = await db
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!session) {
      res.status(404).json({ error: '练习不存在' });
      return;
    }

    res.json({
      phase1: session.phase1_content,
      phase2: session.phase2_content,
      phase3: session.phase3_content,
      improvements: [
        { aspect: '论点展开', before: '只提出1句论点', after: '论点+解释+举例' },
        { aspect: '衔接手段', before: '仅用and/but', after: '使用however, furthermore等' },
        { aspect: '段落结构', before: '整段无分层', after: '主题句+展开+总结' },
      ],
    });
  } catch (err) {
    console.error('Comparison error:', err);
    res.status(500).json({ error: '获取对比失败' });
  }
});

// ============ Diagnosis Routes ============

// GET /api/v1/student/:id/diagnosis/:sessionId - Get diagnosis report
router.get('/:id/diagnosis/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const db = getSupabaseClient();

    const { data: diagnosis, error } = await db
      .from('diagnosis_results')
      .select('*')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) throw error;
    if (!diagnosis) {
      res.status(404).json({ error: '诊断报告不存在' });
      return;
    }

    res.json({ diagnosis });
  } catch (err) {
    console.error('Diagnosis error:', err);
    res.status(500).json({ error: '获取诊断报告失败' });
  }
});

// GET /api/v1/student/:id/diagnoses - Get all diagnosis reports
router.get('/:id/diagnoses', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: diagnoses, error } = await db
      .from('diagnosis_results')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ diagnoses: diagnoses || [] });
  } catch (err) {
    console.error('Diagnoses error:', err);
    res.status(500).json({ error: '获取诊断列表失败' });
  }
});

// ============ Commitment Routes ============

// GET /api/v1/student/:id/commitments - Get commitments
router.get('/:id/commitments', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: commitments, error } = await db
      .from('commitments')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ commitments: commitments || [] });
  } catch (err) {
    console.error('Commitments error:', err);
    res.status(500).json({ error: '获取承诺列表失败' });
  }
});

// POST /api/v1/student/:id/commitments - Create commitment
router.post('/:id/commitments', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, target, description } = req.body as {
      type: string;
      target: number;
      description: string;
    };
    const db = getSupabaseClient();

    const { data: commitment, error } = await db
      .from('commitments')
      .insert({
        student_id: id,
        type,
        target,
        current: 0,
        description,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ commitment });
  } catch (err) {
    console.error('Create commitment error:', err);
    res.status(500).json({ error: '创建承诺失败' });
  }
});

// ============ Notification Prefs Routes ============

// GET /api/v1/student/:id/notification-prefs - Get notification preferences
router.get('/:id/notification-prefs', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: prefs, error } = await db
      .from('student_notification_prefs')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();

    if (error) throw error;
    res.json({ prefs: prefs || {} });
  } catch (err) {
    console.error('Prefs error:', err);
    res.status(500).json({ error: '获取偏好失败' });
  }
});

// PUT /api/v1/student/:id/notification-prefs - Update notification preferences
router.put('/:id/notification-prefs', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getSupabaseClient();

    const { error } = await db
      .from('student_notification_prefs')
      .update(updates)
      .eq('student_id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Prefs update error:', err);
    res.status(500).json({ error: '更新偏好失败' });
  }
});

// ============ Knowledge Map Routes ============

// GET /api/v1/student/:id/knowledge-map - Get knowledge map
router.get('/:id/knowledge-map', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: states, error } = await db
      .from('student_knowledge_states')
      .select('*')
      .eq('student_id', id)
      .order('mastery_level', { ascending: false });

    if (error) throw error;

    // Return default knowledge map if no states exist
    const defaultKnowledgeMap = [
      { kc_id: 'k1', name: '论点提出', category: 'TR', mastery_level: 0.65, attempt_count: 5, last_practiced: new Date().toISOString() },
      { kc_id: 'k2', name: '论点展开', category: 'TR', mastery_level: 0.31, attempt_count: 3, last_practiced: new Date().toISOString() },
      { kc_id: 'k3', name: '例证使用', category: 'TR', mastery_level: 0.48, attempt_count: 4, last_practiced: new Date().toISOString() },
      { kc_id: 'k4', name: '段落结构', category: 'CC', mastery_level: 0.55, attempt_count: 4, last_practiced: new Date().toISOString() },
      { kc_id: 'k5', name: '衔接手段', category: 'CC', mastery_level: 0.28, attempt_count: 2, last_practiced: new Date().toISOString() },
      { kc_id: 'k6', name: '同义替换', category: 'LR', mastery_level: 0.60, attempt_count: 5, last_practiced: new Date().toISOString() },
      { kc_id: 'k7', name: '话题词汇', category: 'LR', mastery_level: 0.45, attempt_count: 3, last_practiced: new Date().toISOString() },
      { kc_id: 'k8', name: '复杂句型', category: 'GR', mastery_level: 0.40, attempt_count: 3, last_practiced: new Date().toISOString() },
      { kc_id: 'k9', name: '主谓一致', category: 'GR', mastery_level: 0.70, attempt_count: 6, last_practiced: new Date().toISOString() },
      { kc_id: 'k10', name: '冠词使用', category: 'GR', mastery_level: 0.55, attempt_count: 4, last_practiced: new Date().toISOString() },
    ];

    res.json({ states: states && states.length > 0 ? states : defaultKnowledgeMap });
  } catch (err) {
    console.error('Knowledge map error:', err);
    res.status(500).json({ error: '获取知识图谱失败' });
  }
});

// ============ Night Mode Routes ============

// GET /api/v1/student/:id/night-mode/status - Get night mode status
router.get('/:id/night-mode/status', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: student } = await db
      .from('students')
      .select('exam_date')
      .eq('id', id)
      .maybeSingle();

    const { data: portrait } = await db
      .from('student_portraits')
      .select('current_moment, anxiety_level')
      .eq('student_id', id)
      .maybeSingle();

    const examDate = student?.exam_date;
    const daysUntilExam = examDate
      ? Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)
      : null;

    const isExamEve = daysUntilExam !== null && daysUntilExam <= 1;
    const hour = new Date().getHours();
    const isNightTime = hour >= 0 && hour < 5;

    res.json({
      available: isExamEve || portrait?.current_moment === 'exam_eve_insomnia',
      is_exam_eve: isExamEve,
      is_night_time: isNightTime,
      days_until_exam: daysUntilExam,
      anxiety_level: portrait?.anxiety_level || 50,
    });
  } catch (err) {
    console.error('Night mode error:', err);
    res.status(500).json({ error: '获取夜间模式状态失败' });
  }
});

export default router;
