// Moment Detection Engine
// Determines which anxiety moment a student is currently experiencing

interface BandScores {
  tr: number;
  cc: number;
  lr: number;
  gr: number;
}

interface LatestBands {
  dimensionScores: BandScores;
  history: number[];
}

interface StudentState {
  daysSinceStart: number;
  totalPractices: number;
  completedDiagnoses: number;
  targetBand: number;
  latestBands: LatestBands;
  knowledgeConnectivity: number;
  currentMoment: string;
  examDate: string | null;
}

type AnxietyMoment =
  | 'entry_confusion'
  | 'first_mock_shock'
  | 'knowledge_isolation'
  | 'practice_plateau'
  | 'output_helplessness'
  | 'pre_exam_panic'
  | 'exam_eve_insomnia'
  | 'score_waiting';

function averageBands(scores: BandScores): number {
  const values = [scores.tr, scores.cc, scores.lr, scores.gr].filter(v => v > 0);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function daysUntilExam(examDate: string): number {
  const now = new Date();
  const exam = new Date(examDate);
  return Math.ceil((exam.getTime() - now.getTime()) / 86400000);
}

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 0 && hour < 5;
}

export function detectCurrentMoment(student: StudentState): AnxietyMoment {
  const {
    daysSinceStart,
    totalPractices,
    completedDiagnoses,
    targetBand,
    latestBands,
    knowledgeConnectivity,
    currentMoment,
    examDate,
  } = student;

  // ⑦ 考前失眠夜：距考试 < 1 天 + 夜间 (00:00-05:00)
  if (examDate) {
    const daysUntil = daysUntilExam(examDate);
    if (daysUntil <= 1 && daysUntil > 0 && isNightTime()) {
      return 'exam_eve_insomnia';
    }
  }

  // ⑥ 考前恐慌期：距考试 < 14 天
  if (examDate) {
    const daysUntil = daysUntilExam(examDate);
    if (daysUntil <= 14 && daysUntil > 1) {
      return 'pre_exam_panic';
    }
  }

  // ⑧ 出分等待期：考试已过 + 距出分 < 13 天
  if (examDate) {
    const daysSince = -daysUntilExam(examDate);
    if (daysSince > 0 && daysSince <= 13) {
      return 'score_waiting';
    }
  }

  // ④ 刷题瓶颈期：连续 ≥ 3 次练习 Band 变化 < 0.5
  const recentBands = latestBands.history;
  if (recentBands.length >= 3) {
    const last3 = recentBands.slice(-3);
    const maxDiff = Math.max(...last3) - Math.min(...last3);
    if (maxDiff < 0.5 && totalPractices >= 5) {
      return 'practice_plateau';
    }
  }

  // ③ 知识点孤岛期：练习 ≥ 5 次，知识图谱连通度 < 0.3
  if (totalPractices >= 5 && knowledgeConnectivity < 0.3) {
    return 'knowledge_isolation';
  }

  // ② 首次模考打击：完成第一次诊断，总分 < 目标 ≥ 1 分
  if (completedDiagnoses >= 1 && totalPractices <= 5) {
    const avgBand = averageBands(latestBands.dimensionScores);
    if (avgBand > 0 && targetBand - avgBand >= 1.0) {
      return 'first_mock_shock';
    }
  }

  // ① 入门迷茫期：注册 < 7 天，练习 < 3 次，无诊断记录
  if (daysSinceStart < 7 && totalPractices < 3 && completedDiagnoses === 0) {
    return 'entry_confusion';
  }

  // Default: keep current moment or fallback to entry_confusion
  return (currentMoment as AnxietyMoment) || 'entry_confusion';
}
