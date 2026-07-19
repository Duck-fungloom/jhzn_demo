import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Easing } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCallback } from 'react';

// Moment type from API
interface Moment {
  id: string;
  num: string;
  label: string;
  color: string;
  unlocked: boolean;
  progress: number;
  progressText: string;
  required?: number;
}

// Moment descriptions and extra content
const MOMENT_CONTENT: Record<string, { desc: string; date?: string; stat?: string; hint?: string }> = {
  entry_confusion: {
    desc: '打开小红书，翻了 2000 篇经验贴，不知道该相信谁。那种「人人都说自己三个月上 7 分」的感觉，是不是也让你很困惑？',
    date: '7月1日 · 完成了诊断 · Band 未知',
  },
  first_exam_shock: {
    desc: '模考分数出来那一刻，很多人都会感到崩溃。但你知道吗——',
    stat: '87% 的考生都有同样的感受',
  },
  knowledge_island: {
    desc: '你已经掌握了一些知识点，但它们还是零散的孤岛。让我们一起把它们连成大陆。',
    hint: '完成更多写作练习，系统将自动识别你的知识薄弱点，生成个性化知识图谱。',
  },
  practice_plateau: {
    desc: '你已经完成了诊断，现在让我们针对你的薄弱环节进行专项突破。',
    hint: '完成诊断报告后，将进入瓶颈突破期，获得针对性的CC专项训练。',
  },
  output_helpless: {
    desc: '口语写作找不到人批改，总是不知道自己的问题在哪里。',
    hint: 'AI 教练会为你提供详细的反馈和改进建议。',
  },
  pre_exam_panic: {
    desc: '考试临近，焦虑不安。这是正常的，让我们一起制定冲刺计划。',
    hint: '考前 14 天，专注于薄弱环节的强化训练。',
  },
  pre_exam_insomnia: {
    desc: '考试前夜，难以入眠。让我陪你度过这个夜晚。',
    hint: '放松练习，帮助你平静入睡。',
  },
  post_exam_recovery: {
    desc: '考试结束了，无论结果如何，你都已经完成了这段旅程。让我们一起复盘。',
    hint: '总结经验，为下一次挑战做准备。',
  },
};

// Breathing animation for current moment indicator
function BreathingDot({ color }: { color: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.4,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const opacityLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scaleLoop.start();
    opacityLoop.start();

    return () => {
      scaleLoop.stop();
      opacityLoop.stop();
    };
  }, []);

  return (
    <View className="items-center justify-center">
      {/* Outer glow */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }}
      />
      {/* Inner dot */}
      <View
        className="w-8 h-8 rounded-full items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <FontAwesome6 name="location-dot" size={14} color="#fff" />
      </View>
    </View>
  );
}

// Animated progress bar
function AnimatedProgressBar({ percent, color }: { percent: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View className="h-2 bg-stone-200 rounded-full overflow-hidden mb-1">
      <Animated.View
        className="h-full rounded-full"
        style={{
          width: widthAnim.interpolate({
            inputRange: [0, 100],
            outputRange: ['0%', '100%'],
          }),
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { student } = useAuth();
  const router = useSafeRouter();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [currentMoment, setCurrentMoment] = useState('entry_confusion');
  const [showMore, setShowMore] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  const fetchMoments = useCallback(async () => {
    if (!student) return;
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/api/v1/student/${student.id}/moments`);
      const data = await response.json();
      if (data.moments) {
        setMoments(data.moments);
        setCurrentMoment(data.currentMoment || 'entry_confusion');
      }
    } catch (e) {
      console.warn('Moments fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [student?.id]);

  useFocusEffect(useCallback(() => {
    fetchMoments();
  }, [fetchMoments]));

  const currentIdx = moments.findIndex(m => m.id === currentMoment);
  const visibleMoments = showMore ? moments : moments.slice(0, 4);
  const hiddenCount = moments.length - 4;

  const toggleExpand = (id: string) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const handleMomentAction = (moment: Moment) => {
    switch (moment.id) {
      case 'entry_confusion':
      case 'first_exam_shock':
        router.push('/diagnosis', { sessionId: 'sess-diag-001' });
        break;
      case 'knowledge_island':
      case 'practice_plateau':
      case 'output_helpless':
        router.push('/(tabs)/practice');
        break;
      case 'pre_exam_panic':
        router.push('/(tabs)/practice');
        break;
      case 'pre_exam_insomnia':
        router.push('/night');
        break;
      case 'post_exam_recovery':
        router.push('/progress');
        break;
      default:
        router.push('/onboarding');
    }
  };

  if (loading && moments.length === 0) {
    return (
      <Screen>
        <View className="flex-1 bg-stone-50 items-center justify-center">
          <Text className="text-stone-400">加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-6 pt-12 pb-2">
          <Text className="text-stone-900 text-xl font-bold">认知伙伴</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <FontAwesome6 name="bell" size={22} color="#4B5563" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              <FontAwesome6 name="user" size={22} color="#4B5563" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center gap-2 mb-1">
            <FontAwesome6 name="location-dot" size={18} color="#2563EB" />
            <Text className="text-stone-900 text-2xl font-bold">你的雅思之路</Text>
          </View>
          <Text className="text-stone-400 text-sm ml-6">
            你已经走到了第 {currentIdx + 1} 站
          </Text>
        </View>

        {/* Timeline */}
        <View className="px-6 pt-4">
          {visibleMoments.map((moment, idx) => {
            const isCompleted = idx < currentIdx && moment.unlocked;
            const isCurrent = moment.id === currentMoment && moment.unlocked;
            const isLocked = !moment.unlocked;
            const isExpanded = expandedCard === moment.id;
            const content = MOMENT_CONTENT[moment.id] || { desc: '' };

            if (isCompleted) {
              return (
                <View key={moment.id} className="flex-row mb-2">
                  <View className="items-center mr-4 w-10">
                    <View className="w-8 h-8 rounded-lg bg-green-500 items-center justify-center">
                      <FontAwesome6 name="check" size={14} color="#fff" />
                    </View>
                    {idx < moments.length - 1 && <View className="w-0.5 h-10 bg-stone-200 mt-1" />}
                  </View>
                  <TouchableOpacity
                    className="flex-1 rounded-2xl p-4 mb-4"
                    style={{ backgroundColor: `${moment.color}10` }}
                    onPress={() => toggleExpand(moment.id)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-stone-900 font-bold text-base flex-1">
                        {moment.num} {moment.label}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <FontAwesome6 name="circle-check" size={18} color={moment.color} />
                        <FontAwesome6
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={12}
                          color="#9CA3AF"
                        />
                      </View>
                    </View>
                    <Text className="text-stone-600 text-sm leading-5 mb-2">{content.desc}</Text>
                    {content.date && (
                      <Text className="text-stone-400 text-xs mb-2">{content.date}</Text>
                    )}
                    {/* Expanded content */}
                    {isExpanded && content.date && (
                      <TouchableOpacity
                        className="mt-2 py-2 px-3 rounded-lg self-start"
                        style={{ backgroundColor: `${moment.color}15` }}
                        onPress={() => router.push('/diagnosis', { sessionId: 'sess-diag-001' })}
                      >
                        <Text className="text-sm font-medium" style={{ color: moment.color }}>
                          回看诊断报告 →
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              );
            }

            if (isCurrent) {
              return (
                <View key={moment.id} className="flex-row mb-2">
                  <View className="items-center mr-4 w-10">
                    <BreathingDot color={moment.color} />
                    {idx < moments.length - 1 && <View className="w-0.5 h-10 bg-stone-200 mt-1" />}
                  </View>
                  <View
                    className="flex-1 rounded-2xl p-4 mb-4 border-2"
                    style={{
                      backgroundColor: `${moment.color}08`,
                      borderColor: `${moment.color}40`,
                    }}
                  >
                    <View className="flex-row items-center gap-2 mb-2">
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${moment.color}20` }}
                      >
                        <Text className="text-xs font-semibold" style={{ color: moment.color }}>
                          当前阶段
                        </Text>
                      </View>
                    </View>
                    <Text className="text-stone-900 font-bold text-base mb-2">
                      {moment.num} {moment.label}
                    </Text>
                    <Text className="text-stone-600 text-sm leading-5 mb-2">{content.desc}</Text>
                    {content.stat && (
                      <View className="flex-row items-center gap-2 mb-3 bg-white/60 rounded-lg px-3 py-2 self-start">
                        <FontAwesome6 name="chart-pie" size={12} color={moment.color} />
                        <Text className="text-stone-600 text-xs font-medium">{content.stat}</Text>
                      </View>
                    )}
                    <View className="flex-row gap-3 mt-3">
                      <TouchableOpacity
                        className="flex-1 rounded-xl py-3 items-center"
                        style={{ backgroundColor: moment.color }}
                        onPress={() => handleMomentAction(moment)}
                      >
                        <Text className="text-white font-semibold text-sm">
                          {moment.id === 'pre_exam_insomnia' ? '进入陪伴模式' : '开始行动'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-white rounded-xl py-3 items-center border"
                        style={{ borderColor: `${moment.color}40` }}
                        onPress={() => router.push('/settings')}
                      >
                        <Text className="font-semibold text-sm" style={{ color: moment.color }}>
                          稍后再说
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }

            // Locked moment
            return (
              <View key={moment.id} className="flex-row mb-2">
                <View className="items-center mr-4 w-10">
                  <View className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center">
                    <FontAwesome6 name="lock" size={14} color="#9CA3AF" />
                  </View>
                  {idx < moments.length - 1 && <View className="w-0.5 h-10 bg-stone-200 mt-1" />}
                </View>
                <TouchableOpacity
                  className="flex-1 bg-white rounded-2xl p-4 mb-4 border border-stone-100"
                  onPress={() => toggleExpand(moment.id)}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-stone-500 font-bold text-base flex-1">
                      {moment.num} {moment.label}
                    </Text>
                    <FontAwesome6
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text className="text-stone-400 text-sm mb-3">{content.desc}</Text>
                  <View>
                    <AnimatedProgressBar
                      percent={moment.progress || 0}
                      color={moment.color}
                    />
                    <View className="flex-row justify-between items-center">
                      <Text className="text-stone-400 text-xs">{moment.progressText}</Text>
                    </View>
                  </View>
                  {/* Expanded hint */}
                  {isExpanded && content.hint && (
                    <View className="mt-3 pt-3 border-t border-stone-100">
                      <Text className="text-stone-500 text-xs leading-5">
                        {content.hint}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Show more toggle */}
          {!showMore && hiddenCount > 0 && (
            <TouchableOpacity
              className="flex-row items-center justify-center py-3 mb-4"
              onPress={() => setShowMore(true)}
            >
              <View className="bg-white rounded-full px-6 py-2.5 flex-row items-center gap-2 border border-stone-200">
                <Text className="text-stone-500 text-sm">还有 {hiddenCount} 站</Text>
                <FontAwesome6 name="chevron-down" size={12} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          )}

          {showMore && (
            <TouchableOpacity
              className="flex-row items-center justify-center py-3 mb-4"
              onPress={() => setShowMore(false)}
            >
              <View className="bg-white rounded-full px-6 py-2.5 flex-row items-center gap-2 border border-stone-200">
                <Text className="text-stone-500 text-sm">收起</Text>
                <FontAwesome6 name="chevron-up" size={12} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Today's recommendation */}
        <View className="px-6 pb-8">
          <View className="bg-white rounded-2xl p-5 border border-stone-100">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                  <FontAwesome6 name="book-open" size={16} color="#2563EB" />
                </View>
                <Text className="text-stone-900 font-bold text-base">今日推荐练习</Text>
              </View>
              <View className="bg-orange-50 px-2.5 py-1 rounded-full">
                <Text className="text-orange-600 text-xs font-medium">TR 专项</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2 mb-1">
              <FontAwesome6 name="brain" size={20} color="#F97316" />
              <Text className="text-stone-900 font-bold text-base">TR 专项练习 · 15分钟</Text>
            </View>
            <Text className="text-stone-500 text-sm mb-4">针对：Task Response · K3 论点展开</Text>
            <TouchableOpacity
              className="bg-blue-600 rounded-xl py-3.5 items-center"
              onPress={() => router.push('/(tabs)/practice')}
            >
              <Text className="text-white font-semibold">开始练习 →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
