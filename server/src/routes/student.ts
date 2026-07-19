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
      .select('id, phone, name, target_band, exam_date, timezone, onboarding_completed, created_at')
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

    const studentData = { ...student, onboarded: student.onboarding_completed };
    res.json({ student: studentData, portrait });
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

    const defaultPrompts: Record<string, string> = {
      writing: 'Some people believe that technology has made our lives more complex. To what extent do you agree or disagree? Write at least 250 words.',
      speaking: 'Describe a book you read recently that you found interesting. You should say: what the book was, why you read it, what it was about, and explain why you found it interesting.',
      reading: 'Read the following passage and answer the questions that follow. Focus on identifying the main idea and supporting details.',
      listening: 'Listen to the conversation and answer the questions. Pay attention to the key details mentioned by the speakers.',
    };

    const { data: session, error } = await db
      .from('practice_sessions')
      .insert({
        student_id: id,
        task_type,
        task_prompt: defaultPrompts[task_type] || 'Complete the practice task.',
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

// POST /api/v1/student/:id/practice-sessions/:sessionId/scaffold - Request scaffold hint
router.post('/:id/practice-sessions/:sessionId/scaffold', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { level, student_message } = req.body;
    const db = getSupabaseClient();

    // Verify session exists
    const { data: session, error: sessErr } = await db
      .from('practice_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessErr) throw sessErr;
    if (!session) {
      return res.status(404).json({ error: '练习会话不存在' });
    }

    // Return scaffold response based on level
    const scaffoldResponses: Record<number, { hint: string; strategy: string }> = {
      1: {
        hint: '先想想你的论点核心是什么——用一句话概括你想说服读者相信什么。如果一句话说不清，说明论点还不够聚焦。',
        strategy: 'direction_hint',
      },
      2: {
        hint: '你的论点在第二段。试试这个结构：先提出论点（1句）→ 给出理由（1句）→ 用具体例子支撑（2句）→ 回扣论点（1句）。这就是 PEEL 结构：Point, Evidence, Explanation, Link。',
        strategy: 'guided_path',
      },
      3: {
        hint: '示范段落：\n\n"There is a growing consensus that renewable energy is not just environmentally necessary but economically advantageous. For instance, the cost of solar panels has dropped by 89% since 2010 (IRENA, 2023), making solar power cheaper than coal in many regions. This cost reduction, combined with government subsidies, creates a compelling economic case for transition. Therefore, the shift to renewable energy represents both a moral imperative and a sound investment."\n\n注意结构：论点→证据→解释→回扣。现在用同样的结构重写你的段落。',
        strategy: 'full_demo',
      },
    };

    const scaffold = scaffoldResponses[level] || scaffoldResponses[1];

    res.json({
      level,
      hint: scaffold.hint,
      strategy: scaffold.strategy,
      session_id: sessionId,
    });
  } catch (err) {
    console.error('Scaffold error:', err);
    res.status(500).json({ error: '获取支架失败' });
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

// GET /api/v1/student/:id/diagnosis/compare - Compare two diagnosis results (MUST be before /:sessionId)
router.get('/:id/diagnosis/compare', async (req, res) => {
  try {
    const { id } = req.params;
    const { currentId, previousId } = req.query as { currentId: string; previousId: string };
    const db = getSupabaseClient();

    if (!currentId || !previousId) {
      return res.status(400).json({ error: '缺少 currentId 或 previousId 参数' });
    }

    // Get current diagnosis
    const { data: currentDiag, error: currentError } = await db
      .from('diagnosis_results')
      .select('*')
      .eq('id', currentId)
      .eq('student_id', id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentDiag) {
      return res.status(404).json({ error: '当前诊断记录不存在' });
    }

    // Get previous diagnosis
    const { data: previousDiag, error: previousError } = await db
      .from('diagnosis_results')
      .select('*')
      .eq('id', previousId)
      .eq('student_id', id)
      .maybeSingle();

    if (previousError) throw previousError;
    if (!previousDiag) {
      return res.status(404).json({ error: '对比诊断记录不存在' });
    }

    // Calculate changes
    const dimensions = [
      { key: 'task_response_band', label: 'TR', name: '任务回应' },
      { key: 'coherence_cohesion_band', label: 'CC', name: '连贯衔接' },
      { key: 'lexical_resource_band', label: 'LR', name: '词汇资源' },
      { key: 'grammatical_range_band', label: 'GR', name: '语法范围' },
    ];

    const comparison = dimensions.map((dim) => {
      const current = currentDiag[dim.key as keyof typeof currentDiag] as number;
      const previous = previousDiag[dim.key as keyof typeof previousDiag] as number;
      const change = current - previous;
      return {
        dimension: dim.key,
        label: dim.label,
        name: dim.name,
        current,
        previous,
        change,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      };
    });

    // Calculate overall average band
    const currentAvg = (comparison.reduce((sum, d) => sum + d.current, 0) / 4).toFixed(1);
    const previousAvg = (comparison.reduce((sum, d) => sum + d.previous, 0) / 4).toFixed(1);

    // Get subskill mastery comparison if available
    const currentSubskills = (currentDiag.subskill_mastery as Record<string, number>) || {};
    const previousSubskills = (previousDiag.subskill_mastery as Record<string, number>) || {};

    const subskillComparison = Object.entries(currentSubskills).map(([skillId, currentLevel]) => {
      const previousLevel = previousSubskills[skillId] || 0;
      const change = currentLevel - previousLevel;
      return {
        skillId,
        current: currentLevel,
        previous: previousLevel,
        change,
        trend: change > 0.05 ? 'up' : change < -0.05 ? 'down' : 'stable',
      };
    });

    res.json({
      current: {
        id: currentDiag.id,
        date: currentDiag.created_at,
        soloLevel: currentDiag.solo_level,
        bands: {
          TR: currentDiag.task_response_band,
          CC: currentDiag.coherence_cohesion_band,
          LR: currentDiag.lexical_resource_band,
          GR: currentDiag.grammatical_range_band,
        },
        average: parseFloat(currentAvg),
      },
      previous: {
        id: previousDiag.id,
        date: previousDiag.created_at,
        soloLevel: previousDiag.solo_level,
        bands: {
          TR: previousDiag.task_response_band,
          CC: previousDiag.coherence_cohesion_band,
          LR: previousDiag.lexical_resource_band,
          GR: previousDiag.grammatical_range_band,
        },
        average: parseFloat(previousAvg),
      },
      comparison,
      subskillComparison,
      summary: {
        improved: comparison.filter((d) => d.change > 0).length,
        declined: comparison.filter((d) => d.change < 0).length,
        stable: comparison.filter((d) => d.change === 0).length,
        overallChange: parseFloat(currentAvg) - parseFloat(previousAvg),
      },
    });
  } catch (err) {
    console.error('Diagnosis compare error:', err);
    res.status(500).json({ error: '对比诊断失败' });
  }
});

// GET /api/v1/student/:id/diagnosis/list - Get all diagnosis results for comparison (MUST be before /:sessionId)
router.get('/:id/diagnosis/list', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    const { data: diagnoses, error } = await db
      .from('diagnosis_results')
      .select('id, task_response_band, coherence_cohesion_band, lexical_resource_band, grammatical_range_band, solo_level, created_at')
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const list = (diagnoses || []).map((d) => ({
      id: d.id,
      date: d.created_at,
      soloLevel: d.solo_level,
      bands: {
        TR: d.task_response_band,
        CC: d.coherence_cohesion_band,
        LR: d.lexical_resource_band,
        GR: d.grammatical_range_band,
      },
      average: ((d.task_response_band + d.coherence_cohesion_band + d.lexical_resource_band + d.grammatical_range_band) / 4).toFixed(1),
    }));

    res.json({ diagnoses: list });
  } catch (err) {
    console.error('Diagnosis list error:', err);
    res.status(500).json({ error: '获取诊断列表失败' });
  }
});

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
    const { title, description, target_frequency } = req.body as {
      title: string;
      description?: string;
      target_frequency: number;
    };
    const db = getSupabaseClient();

    const { data: commitment, error } = await db
      .from('commitments')
      .insert({
        student_id: id,
        title,
        description: description || '',
        target_frequency,
        completed_count: 0,
        checkin_count: 0,
        status: 'active',
        started_at: new Date().toISOString(),
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

// POST /api/v1/student/:id/commitments/:commitmentId/checkin - Check in commitment
router.post('/:id/commitments/:commitmentId/checkin', async (req, res) => {
  try {
    const { id, commitmentId } = req.params;
    const db = getSupabaseClient();

    // Get current commitment
    const { data: commitment, error: fetchError } = await db
      .from('commitments')
      .select('*')
      .eq('id', commitmentId)
      .eq('student_id', id)
      .single();

    if (fetchError || !commitment) {
      res.status(404).json({ error: '承诺不存在' });
      return;
    }

    const newCheckinCount = (commitment.checkin_count || 0) + 1;
    const isCompleted = newCheckinCount >= commitment.target_frequency;

    const { data: updated, error: updateError } = await db
      .from('commitments')
      .update({
        checkin_count: newCheckinCount,
        completed_count: isCompleted ? (commitment.completed_count || 0) + 1 : commitment.completed_count,
        status: isCompleted ? 'completed' : commitment.status,
        ended_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', commitmentId)
      .select()
      .single();

    if (updateError) throw updateError;
    res.json({ commitment: updated });
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: '打卡失败' });
  }
});

// ============ Progress Routes ============

// GET /api/v1/student/:id/progress - Get progress statistics
router.get('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    // Get all practice sessions for statistics
    const { data: sessions, error: sessionsError } = await db
      .from('practice_sessions')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: true });

    if (sessionsError) throw sessionsError;

    // Get all diagnosis results for trend
    const { data: diagnoses, error: diagError } = await db
      .from('diagnosis_results')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: true });

    if (diagError) throw diagError;

    // Calculate statistics
    const totalSessions = sessions?.length || 0;
    const totalWords = sessions?.reduce((sum, s) => sum + (s.word_count || 0), 0) || 0;
    const totalMinutes = sessions?.reduce((sum, s) => {
      if (s.started_at && s.completed_at) {
        const diff = new Date(s.completed_at).getTime() - new Date(s.started_at).getTime();
        return sum + Math.floor(diff / 60000);
      }
      return sum;
    }, 0) || 0;

    // Calculate streak (consecutive days with practice)
    const practiceDays = new Set(
      sessions?.map(s => new Date(s.created_at).toDateString()) || []
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (practiceDays.has(checkDate.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Recent sessions (last 10)
    const recentSessions = (sessions || []).slice(-10).reverse().map(s => ({
      id: s.id,
      task_type: s.task_type,
      status: s.status,
      word_count: s.word_count,
      created_at: s.created_at,
    }));

    // Dimension trend from diagnoses
    const dimensionTrend = (diagnoses || []).map(d => ({
      date: d.created_at,
      tr: d.task_response_band,
      cc: d.coherence_cohesion_band,
      lr: d.lexical_resource_band,
      gr: d.grammatical_range_band,
    }));

    // Weekly practice data (last 8 weeks)
    const weeklyData: { week: string; count: number; words: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSessions = sessions?.filter(s => {
        const d = new Date(s.created_at);
        return d >= weekStart && d < weekEnd;
      }) || [];

      weeklyData.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        count: weekSessions.length,
        words: weekSessions.reduce((sum, s) => sum + (s.word_count || 0), 0),
      });
    }

    res.json({
      stats: {
        total_sessions: totalSessions,
        total_words: totalWords,
        total_minutes: totalMinutes,
        current_streak: streak,
      },
      recent_sessions: recentSessions,
      dimension_trend: dimensionTrend,
      weekly_data: weeklyData,
    });
  } catch (err) {
    console.error('Progress error:', err);
    res.status(500).json({ error: '获取进度数据失败' });
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

// ============ Chat Routes (SSE Streaming) ============

// POST /api/v1/student/:id/chat/with-memory - Chat with memory injection (SSE stream)
router.post('/:id/chat/with-memory', async (req, res) => {
  const { id } = req.params;
  const { message, conversation_id, current_moment, phase, is_night_mode, selected_role } =
    req.body as {
      message: string;
      conversation_id?: string;
      current_moment?: string;
      phase?: string;
      is_night_mode?: boolean;
      selected_role?: 'coach' | 'mentor' | 'partner' | 'analyst';
    };

  if (!message?.trim()) {
    res.status(400).json({ error: '消息不能为空' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const db = getSupabaseClient();

    // Fetch portrait for memory injection
    const { data: portrait } = await db
      .from('student_portraits')
      .select('*')
      .eq('student_id', id)
      .maybeSingle();

    // Fetch recent memories from portrait_memories table
    const { data: memories } = await db
      .from('portrait_memories')
      .select('*')
      .eq('student_id', id)
      .eq('status', 'active')
      .gte('confidence', 0.8)
      .order('relevance_score', { ascending: false })
      .limit(5);

    // Fetch conversation history
    let history: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversation_id) {
      const { data: convMessages } = await db
        .from('ai_conversations')
        .select('role, content')
        .eq('conversation_id', conversation_id)
        .eq('student_id', id)
        .order('created_at', { ascending: true })
        .limit(20);
      if (convMessages) {
        history = convMessages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
    }

    // Import agent service dynamically
    const { handleChatStream, getAgentInfo } = await import('../services/agentService.js');

    let resolvedAgent: string = selected_role || 'coach';

    await handleChatStream(
      {
        message,
        conversationId: conversation_id,
        currentMoment: current_moment || portrait?.current_moment,
        phase,
        isNightMode: is_night_mode,
        selectedRole: selected_role,
        studentId: id,
        portrait: portrait as Record<string, unknown> | undefined,
        memories: (memories || []) as Array<Record<string, unknown>>,
        history,
      },
      // onChunk
      (text: string) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
      },
      // onDone
      async (fullText: string, agentId: string) => {
        resolvedAgent = agentId;
        const agentInfo = getAgentInfo(agentId as import('../services/agentService.js').AgentId);

        // Save conversation to database
        if (conversation_id) {
          try {
            await db.from('ai_conversations').insert([
              { student_id: id, conversation_id, role: 'user', content: message, agent: agentId },
              { student_id: id, conversation_id, role: 'assistant', content: fullText, agent: agentId },
            ]);
          } catch (saveErr) {
            console.error('Failed to save conversation:', saveErr);
          }
        }

        res.write(
          `data: ${JSON.stringify({
            type: 'done',
            agent: agentId,
            agent_name: agentInfo.name,
            agent_role: agentInfo.role,
            agent_color: agentInfo.color,
          })}\n\n`
        );
        res.write('data: [DONE]\n\n');
        res.end();
      },
      // onError
      (error: Error) => {
        console.error('Chat stream error:', error);
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
        );
        res.write('data: [DONE]\n\n');
        res.end();
      }
    );
  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: '服务器内部错误' })}\n\n`
    );
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// GET /api/v1/student/:id/chat/:role/history - Get chat history for a role
router.get('/:id/chat/:role/history', async (req, res) => {
  try {
    const { id, role } = req.params;
    const db = getSupabaseClient();

    const { data: conversations, error } = await db
      .from('ai_conversations')
      .select('*')
      .eq('student_id', id)
      .eq('agent', role)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ messages: conversations || [] });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: '获取对话历史失败' });
  }
});

// GET /api/v1/student/:id/notifications - Get notifications
router.get('/:id/notifications', async (req, res) => {
  try {
    const { id } = req.params;
    const { since } = req.query;
    const db = getSupabaseClient();

    let query = db
      .from('cron_notification_logs')
      .select('*')
      .eq('student_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (since && typeof since === 'string') {
      query = db
        .from('cron_notification_logs')
        .select('*')
        .eq('student_id', id)
        .gt('created_at', since)
        .order('created_at', { ascending: false })
        .limit(20);
    }

    const { data: notifications, error } = await query;
    if (error) throw error;
    res.json({ notifications: notifications || [] });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// GET /api/v1/student/:id/llm-status - Check LLM configuration status
router.get('/:id/llm-status', async (_req, res) => {
  try {
    const { getLLMStatus } = await import('../services/llm/index.js');
    res.json(getLLMStatus());
  } catch (err) {
    console.error('LLM status error:', err);
    res.status(500).json({ error: '获取LLM状态失败' });
  }
});

// ============ Moments Routes ============

// Moment unlock conditions
const MOMENT_CONDITIONS = {
  entry_confusion: { type: 'always' as const },
  first_exam_shock: { type: 'diagnosis_completed' as const },
  knowledge_island: { type: 'practice_count' as const, required: 5 },
  practice_plateau: { type: 'diagnosis_completed' as const },
  output_helpless: { type: 'practice_count' as const, required: 10 },
  pre_exam_panic: { type: 'days_before_exam' as const, days: 14 },
  pre_exam_insomnia: { type: 'days_before_exam' as const, days: 3 },
  post_exam_recovery: { type: 'after_exam' as const },
};

// GET /api/v1/student/:id/moments - Get moments with unlock status
router.get('/:id/moments', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getSupabaseClient();

    // Get student info
    const { data: student, error: studentErr } = await db
      .from('students')
      .select('id, exam_date, created_at')
      .eq('id', id)
      .maybeSingle();
    if (studentErr) throw studentErr;
    if (!student) {
      res.status(404).json({ error: '学生不存在' });
      return;
    }

    // Get portrait for current_moment
    const { data: portrait } = await db
      .from('student_portraits')
      .select('current_moment')
      .eq('student_id', id)
      .maybeSingle();

    // Count practice sessions
    const { count: practiceCount } = await db
      .from('practice_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', id)
      .eq('status', 'submitted');

    // Count diagnosis results
    const { count: diagnosisCount } = await db
      .from('diagnosis_results')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', id);

    // Calculate days until exam
    const now = new Date();
    const examDate = student.exam_date ? new Date(student.exam_date) : null;
    const daysUntilExam = examDate 
      ? Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isAfterExam = examDate ? examDate < now : false;

    // Calculate unlock status for each moment
    const moments = [
      { id: 'entry_confusion', num: '①', label: '入门迷茫期', color: '#2563EB' },
      { id: 'first_exam_shock', num: '②', label: '首次模考打击', color: '#EF4444' },
      { id: 'knowledge_island', num: '③', label: '知识点孤岛期', color: '#8B5CF6' },
      { id: 'practice_plateau', num: '④', label: '瓶颈突破期', color: '#F59E0B' },
      { id: 'output_helpless', num: '⑤', label: '输出无助期', color: '#7C3AED' },
      { id: 'pre_exam_panic', num: '⑥', label: '考前恐慌', color: '#DC2626' },
      { id: 'pre_exam_insomnia', num: '⑦', label: '考前失眠夜', color: '#1E1B4B' },
      { id: 'post_exam_recovery', num: '⑧', label: '考后复盘期', color: '#0891B2' },
    ];

    const momentsWithStatus = moments.map((moment) => {
      const condition = MOMENT_CONDITIONS[moment.id as keyof typeof MOMENT_CONDITIONS];
      let unlocked = false;
      let progress = 0;
      let progressText = '';
      let required = 0;

      switch (condition.type) {
        case 'always':
          unlocked = true;
          progress = 100;
          progressText = '已解锁';
          break;
        case 'diagnosis_completed':
          unlocked = (diagnosisCount || 0) > 0;
          progress = unlocked ? 100 : 0;
          required = 1;
          progressText = unlocked ? '已解锁' : `完成诊断后解锁 (0/1)`;
          break;
        case 'practice_count':
          const count = practiceCount || 0;
          required = condition.required;
          unlocked = count >= required;
          progress = Math.min(100, Math.round((count / required) * 100));
          progressText = unlocked ? '已解锁' : `完成 ${count}/${required} 次练习后解锁`;
          break;
        case 'days_before_exam':
          if (daysUntilExam === null) {
            unlocked = false;
            progressText = '设置考试日期后解锁';
          } else if (daysUntilExam <= condition.days) {
            unlocked = true;
            progress = 100;
            progressText = `距考试还有 ${daysUntilExam} 天`;
          } else {
            progress = Math.max(0, Math.round(((condition.days - daysUntilExam) / condition.days) * 100));
            progressText = `考前 ${condition.days} 天解锁 (还需 ${daysUntilExam - condition.days} 天)`;
          }
          break;
        case 'after_exam':
          unlocked = isAfterExam;
          progress = unlocked ? 100 : 0;
          progressText = unlocked ? '已解锁' : '考试结束后解锁';
          break;
      }

      return {
        ...moment,
        unlocked,
        progress,
        progressText,
        required,
      };
    });

    // Determine current moment (first unlocked but not completed)
    let currentMoment = portrait?.current_moment || 'entry_confusion';
    const currentIdx = momentsWithStatus.findIndex(m => m.id === currentMoment);
    
    // If current moment is not unlocked, find the first unlocked moment
    if (currentIdx === -1 || !momentsWithStatus[currentIdx]?.unlocked) {
      const firstUnlockedIdx = momentsWithStatus.findIndex(m => m.unlocked);
      if (firstUnlockedIdx !== -1) {
        currentMoment = momentsWithStatus[firstUnlockedIdx].id;
      }
    }

    res.json({
      moments: momentsWithStatus,
      currentMoment,
      stats: {
        practiceCount: practiceCount || 0,
        diagnosisCount: diagnosisCount || 0,
        daysUntilExam,
        isAfterExam,
      },
    });
  } catch (err) {
    console.error('Moments error:', err);
    res.status(500).json({ error: '获取时刻列表失败' });
  }
});

// PUT /api/v1/student/:id/moments/current - Update current moment
router.put('/:id/moments/current', async (req, res) => {
  try {
    const { id } = req.params;
    const { momentId } = req.body as { momentId: string };
    const db = getSupabaseClient();

    // Check if portrait exists
    const { data: portrait } = await db
      .from('student_portraits')
      .select('student_id')
      .eq('student_id', id)
      .maybeSingle();

    if (portrait) {
      const { error } = await db
        .from('student_portraits')
        .update({ current_moment: momentId })
        .eq('student_id', id);
      if (error) throw error;
    } else {
      // Create portrait if not exists
      const { error } = await db
        .from('student_portraits')
        .insert({ student_id: id, current_moment: momentId });
      if (error) throw error;
    }

    res.json({ success: true, currentMoment: momentId });
  } catch (err) {
    console.error('Update current moment error:', err);
    res.status(500).json({ error: '更新当前时刻失败' });
  }
});

export default router;
