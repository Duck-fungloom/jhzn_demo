import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

interface DimensionDetail {
  band: number;
  strength: string;
  weakness: string;
}

interface DimensionDetails {
  task_response: DimensionDetail;
  coherence_cohesion: DimensionDetail;
  lexical_resource: DimensionDetail;
  grammatical_range: DimensionDetail;
}

interface Bottleneck {
  description: string;
  why_blocks: string;
  current_band: number;
  target_band: number;
}

interface SubskillMastery {
  kc_id: string;
  name: string;
  mastery: number;
  dimension: string;
}

interface RecommendedPractice {
  kc_id: string;
  practice_type: string;
  reason: string;
}

interface DiagnosisData {
  id: string;
  session_id: string;
  student_id: string;
  task_response_band: number;
  coherence_cohesion_band: number;
  lexical_resource_band: number;
  grammatical_range_band: number;
  dimension_details: DimensionDetails;
  solo_level: string;
  solo_justification: string;
  bottlenecks: Bottleneck[];
  subskill_mastery: SubskillMastery[];
  recommended_practice: RecommendedPractice;
}

const DIMENSION_CONFIG = [
  { key: 'task_response' as const, id: 'TR', label: 'Task Response', color: '#3B82F6', bg: '#EFF6FF' },
  { key: 'coherence_cohesion' as const, id: 'CC', label: 'Coherence & Cohesion', color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'lexical_resource' as const, id: 'LR', label: 'Lexical Resource', color: '#10B981', bg: '#ECFDF5' },
  { key: 'grammatical_range' as const, id: 'GR', label: 'Grammatical Range', color: '#F59E0B', bg: '#FFFBEB' },
];

const SOLO_LEVELS: Record<string, { label: string; desc: string; color: string }> = {
  unistructural: { label: '单点结构', desc: '能识别单一知识点', color: '#EF4444' },
  multistructural: { label: '多点结构', desc: '能识别多个知识点但未整合', color: '#F59E0B' },
  relational: { label: '关联结构', desc: '能将知识点有机整合', color: '#3B82F6' },
  extended_abstract: { label: '拓展抽象', desc: '能迁移应用到新情境', color: '#10B981' },
};

// Loading skeleton component
function Skeleton({ className }: { className?: string }) {
  return <View className={`bg-stone-200 rounded-lg ${className || ''}`} style={{ opacity: 0.6 }} />;
}

function LoadingSkeleton() {
  return (
    <View className="px-6 gap-5 pt-8">
      <Skeleton className="h-8 w-48 self-center" />
      <Skeleton className="h-4 w-64 self-center" />
      <View className="bg-white rounded-2xl p-5 gap-4 mt-4">
        {[1, 2, 3, 4].map(i => (
          <View key={i} className="gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-full" />
          </View>
        ))}
      </View>
      <Skeleton className="h-24 w-full mt-4" />
      <Skeleton className="h-32 w-full" />
    </View>
  );
}

export default function DiagnosisScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ sessionId?: string; view?: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DiagnosisData | null>(null);
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set());
  const [expandedBottleneck, setExpandedBottleneck] = useState<number | null>(null);

  const sessionId = params.sessionId || 'sess-diag-001';
  const autoExpandBottleneck = params.view === 'bottleneck';

  const fetchDiagnosis = useCallback(async () => {
    try {
      setLoading(true);
      /**
       * 服务端文件：server/src/routes/student.ts
       * 接口：GET /api/v1/student/:id/diagnosis/:sessionId
       * Path 参数：id: string, sessionId: string
       */
      const res = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/test-student/diagnosis/${sessionId}`);
      const json = await res.json();
      if (json.diagnosis) {
        setData(json.diagnosis);
      }
    } catch (err) {
      console.warn('Failed to fetch diagnosis:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useFocusEffect(
    useCallback(() => {
      fetchDiagnosis();
    }, [fetchDiagnosis])
  );

  // Auto-expand bottleneck panel if deep link has ?view=bottleneck
  useEffect(() => {
    if (autoExpandBottleneck && data) {
      setExpandedBottleneck(0);
    }
  }, [autoExpandBottleneck, data]);

  const toggleDim = (key: string) => {
    setExpandedDims(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDims(new Set(DIMENSION_CONFIG.map(d => d.key)));
  };

  const collapseAll = () => {
    setExpandedDims(new Set());
  };

  const allExpanded = expandedDims.size === DIMENSION_CONFIG.length;

  const getBand = (key: string): number => {
    if (!data) return 0;
    switch (key) {
      case 'task_response': return data.task_response_band;
      case 'coherence_cohesion': return data.coherence_cohesion_band;
      case 'lexical_resource': return data.lexical_resource_band;
      case 'grammatical_range': return data.grammatical_range_band;
      default: return 0;
    }
  };

  const soloInfo = data ? SOLO_LEVELS[data.solo_level] || SOLO_LEVELS.multistructural : null;

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <LoadingSkeleton />
        ) : data ? (
          <>
            {/* Header */}
            <View className="items-center pt-14 pb-6">
              <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-4">
                <FontAwesome6 name="chart-bar" size={36} color="#4F46E5" />
              </View>
              <Text className="text-stone-900 font-bold text-2xl">诊断报告</Text>
              <Text className="text-stone-500 text-sm mt-2">基于你的写作，Analyst 为你做了分项诊断</Text>
            </View>

            {/* 4 Dimension Bars */}
            <View className="mx-6 bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
              {/* Expand/Collapse all */}
              <View className="flex-row justify-end mb-4">
                <TouchableOpacity onPress={allExpanded ? collapseAll : expandAll} className="flex-row items-center gap-1">
                  <Text className="text-indigo-600 text-xs font-medium">{allExpanded ? '折叠全部' : '展开全部'}</Text>
                  <FontAwesome6 name={allExpanded ? 'chevron-up' : 'chevron-down'} size={10} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              <View className="gap-4">
                {DIMENSION_CONFIG.map(dim => {
                  const band = getBand(dim.key);
                  const detail = data.dimension_details?.[dim.key];
                  const isExpanded = expandedDims.has(dim.key);

                  return (
                    <View key={dim.key}>
                      <TouchableOpacity onPress={() => toggleDim(dim.key)} activeOpacity={0.7}>
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center gap-2">
                            <View className="px-2 py-0.5 rounded" style={{ backgroundColor: dim.bg }}>
                              <Text className="font-bold text-xs" style={{ color: dim.color }}>{dim.id}</Text>
                            </View>
                            <Text className="text-stone-900 font-bold text-lg">Band {band}</Text>
                          </View>
                          <FontAwesome6 name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color="#A8A29E" />
                        </View>
                        <View className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                          <View className="h-full rounded-full" style={{ width: `${(band / 9) * 100}%`, backgroundColor: dim.color }} />
                        </View>
                      </TouchableOpacity>

                      {/* Expanded detail */}
                      {isExpanded && detail && (
                        <View className="mt-3 p-3 rounded-xl bg-stone-50 gap-2">
                          <View className="flex-row items-start gap-2">
                            <FontAwesome6 name="circle-check" size={12} color="#10B981" />
                            <Text className="text-stone-700 text-xs flex-1 leading-5">{detail.strength}</Text>
                          </View>
                          <View className="flex-row items-start gap-2">
                            <FontAwesome6 name="triangle-exclamation" size={12} color="#F59E0B" />
                            <Text className="text-stone-700 text-xs flex-1 leading-5">{detail.weakness}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* No total score notice */}
              <View className="mt-5 pt-4 border-t border-stone-100">
                <View className="flex-row items-center gap-2">
                  <FontAwesome6 name="circle-info" size={14} color="#4F46E5" />
                  <Text className="text-indigo-700 text-xs">这是分项诊断，不是总分。每个维度独立评分。</Text>
                </View>
              </View>
            </View>

            {/* SOLO Level Card */}
            {soloInfo && data && (
              <View className="mx-6 mt-5 bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: soloInfo.color + '15' }}>
                    <FontAwesome6 name="brain" size={16} color={soloInfo.color} />
                  </View>
                  <View>
                    <Text className="text-stone-900 font-bold text-sm">SOLO 认知层级</Text>
                    <Text className="text-stone-500 text-xs">你的思维处于哪个阶段</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: soloInfo.color + '15' }}>
                    <Text className="font-bold text-sm" style={{ color: soloInfo.color }}>{soloInfo.label}</Text>
                  </View>
                  <Text className="text-stone-600 text-xs">{soloInfo.desc}</Text>
                </View>
                <Text className="text-stone-600 text-xs leading-5">{data.solo_justification}</Text>

                {/* SOLO progress bar */}
                <View className="mt-4 flex-row gap-1">
                  {Object.entries(SOLO_LEVELS).map(([key, info], idx) => {
                    const isActive = key === data.solo_level;
                    const levels = ['unistructural', 'multistructural', 'relational', 'extended_abstract'];
                    const currentIdx = levels.indexOf(data.solo_level);
                    const isPast = idx <= currentIdx;
                    return (
                      <View key={key} className="flex-1">
                        <View className="h-1.5 rounded-full" style={{ backgroundColor: isPast ? info.color : '#E7E5E4' }} />
                        <Text className={`text-[9px] mt-1 text-center ${isActive ? 'font-bold' : ''}`} style={{ color: isActive ? info.color : '#A8A29E' }}>
                          {info.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Bottleneck Cards */}
            {data.bottlenecks && data.bottlenecks.length > 0 && (
              <View className="mx-6 mt-5">
                <View className="flex-row items-center gap-2 mb-3">
                  <FontAwesome6 name="crosshairs" size={16} color="#EF4444" />
                  <Text className="text-stone-900 font-bold text-base">卡点分析</Text>
                </View>
                {data.bottlenecks.map((bn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    className="bg-white rounded-2xl p-4 mb-3"
                    onPress={() => setExpandedBottleneck(expandedBottleneck === idx ? null : idx)}
                    activeOpacity={0.7}
                    style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-stone-900 font-bold text-sm flex-1">{bn.description}</Text>
                      <FontAwesome6 name={expandedBottleneck === idx ? 'chevron-up' : 'chevron-down'} size={12} color="#A8A29E" />
                    </View>
                    <View className="flex-row items-center gap-2 mt-2">
                      <View className="px-2 py-0.5 rounded bg-red-50">
                        <Text className="text-red-600 text-xs font-medium">当前 Band {bn.current_band}</Text>
                      </View>
                      <FontAwesome6 name="arrow-right" size={10} color="#A8A29E" />
                      <View className="px-2 py-0.5 rounded bg-green-50">
                        <Text className="text-green-600 text-xs font-medium">目标 Band {bn.target_band}</Text>
                      </View>
                    </View>
                    {expandedBottleneck === idx && (
                      <View className="mt-3 pt-3 border-t border-stone-100">
                        <Text className="text-stone-600 text-xs leading-5">{bn.why_blocks}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Sub-skill Mastery */}
            {data.subskill_mastery && data.subskill_mastery.length > 0 && (
              <View className="mx-6 mt-5 bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
                <View className="flex-row items-center gap-2 mb-4">
                  <FontAwesome6 name="sitemap" size={16} color="#4F46E5" />
                  <Text className="text-stone-900 font-bold text-base">子技能掌握度</Text>
                </View>
                <View className="gap-3">
                  {data.subskill_mastery.map((skill) => {
                    const masteryPercent = Math.round(skill.mastery * 100);
                    const barColor = skill.mastery >= 0.6 ? '#10B981' : skill.mastery >= 0.4 ? '#F59E0B' : '#EF4444';
                    return (
                      <View key={skill.kc_id}>
                        <View className="flex-row items-center justify-between mb-1">
                          <View className="flex-row items-center gap-2">
                            <View className="px-1.5 py-0.5 rounded bg-stone-100">
                              <Text className="text-stone-500 text-[10px] font-medium">{skill.dimension}</Text>
                            </View>
                            <Text className="text-stone-800 text-xs">{skill.name}</Text>
                          </View>
                          <Text className="text-stone-500 text-xs font-medium">{masteryPercent}%</Text>
                        </View>
                        <View className="h-2 bg-stone-100 rounded-full overflow-hidden">
                          <View className="h-full rounded-full" style={{ width: `${masteryPercent}%`, backgroundColor: barColor }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Recommended Practice */}
            {data.recommended_practice && (
              <View className="mx-6 mt-5 bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
                <View className="flex-row items-center gap-2 mb-3">
                  <FontAwesome6 name="bullseye" size={16} color="#10B981" />
                  <Text className="text-stone-900 font-bold text-base">推荐练习</Text>
                </View>
                <View className="bg-emerald-50 rounded-xl p-4">
                  <Text className="text-emerald-800 font-bold text-sm mb-2">{data.recommended_practice.practice_type}</Text>
                  <Text className="text-emerald-700 text-xs leading-5">{data.recommended_practice.reason}</Text>
                </View>
              </View>
            )}

            {/* CTA */}
            <View className="px-6 mt-6 gap-3">
              <TouchableOpacity
                className="bg-blue-600 rounded-2xl py-4 items-center"
                onPress={() => router.navigate('/')}
              >
                <Text className="text-white font-bold text-base">进入首页，开始你的雅思之路</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-white rounded-2xl py-3 items-center border border-stone-200"
                onPress={() => router.navigate('/knowledge')}
              >
                <Text className="text-stone-700 font-medium text-sm">查看知识图谱</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="flex-1 items-center justify-center pt-20">
            <FontAwesome6 name="file-circle-xmark" size={48} color="#A8A29E" />
            <Text className="text-stone-500 text-base mt-4">暂无诊断数据</Text>
            <Text className="text-stone-400 text-sm mt-2">完成一次写作练习后即可查看诊断报告</Text>
            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-3 px-6 mt-6"
              onPress={() => router.navigate('/')}
            >
              <Text className="text-white font-medium">返回首页</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
