import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCallback } from 'react';

const MOMENTS = [
  { id: 'entry_confusion', num: '①', label: '入门迷茫期', color: '#2563EB', desc: '打开小红书，翻了 2000 篇经验贴，不知道该相信谁。那种「人人都说自己三个月上 7 分」的感觉，是不是也让你很困惑？', date: '7月1日 · 完成了诊断 · Band 未知' },
  { id: 'first_exam_shock', num: '②', label: '首次模考打击', color: '#EF4444', desc: '模考分数出来那一刻，很多人都会感到崩溃。但你知道吗——', stat: '87% 的考生都有同样的感受' },
  { id: 'knowledge_island', num: '③', label: '知识点孤岛期', color: '#8B5CF6', desc: '解锁条件：完成 ≥ 5 次练习', progress: '2/5', progressText: '预计解锁：再做 3 次专项练习' },
  { id: 'practice_plateau', num: '④', label: '瓶颈突破期', color: '#F59E0B', desc: '解锁条件：完成诊断报告', progress: '0/1', progressText: '预计解锁：完成诊断后自动开启' },
  { id: 'output_helpless', num: '⑤', label: '输出无助期', color: '#7C3AED', desc: '口语写作找不到人批改' },
  { id: 'pre_exam_panic', num: '⑥', label: '考前恐慌', color: '#DC2626', desc: '考试临近，焦虑不安' },
  { id: 'pre_exam_insomnia', num: '⑦', label: '考前失眠夜', color: '#1E1B4B', desc: '考试前夜，难以入眠' },
  { id: 'post_exam_recovery', num: '⑧', label: '考后复盘期', color: '#0891B2', desc: '考试结束，总结经验' },
];

export default function HomeScreen() {
  const { student, portrait } = useAuth();
  const router = useSafeRouter();
  const [currentMoment, setCurrentMoment] = useState('first_exam_shock');
  const [showMore, setShowMore] = useState(false);
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  useFocusEffect(useCallback(() => {
    if (!student) return;
    fetch(`${BASE_URL}/api/v1/student/${student.id}/profile`)
      .then(r => r.json())
      .then(data => {
        if (data.portrait?.current_moment) {
          setCurrentMoment(data.portrait.current_moment);
        }
      })
      .catch((e) => console.warn("Home error:", e));
  }, [student?.id]));

  const currentIdx = MOMENTS.findIndex(m => m.id === currentMoment);
  const visibleMoments = showMore ? MOMENTS : MOMENTS.slice(0, 4);
  const hiddenCount = MOMENTS.length - 4;

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-6 pt-12 pb-2">
          <Text className="text-stone-900 text-xl font-bold">认知伙伴</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity>
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
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isLocked = idx > currentIdx;

            if (isCompleted) {
              return (
                <View key={moment.id} className="flex-row mb-2">
                  <View className="items-center mr-4 w-10">
                    <View className="w-8 h-8 rounded-lg bg-green-500 items-center justify-center">
                      <FontAwesome6 name="check" size={14} color="#fff" />
                    </View>
                    {idx < MOMENTS.length - 1 && <View className="w-0.5 h-10 bg-stone-200 mt-1" />}
                  </View>
                  <TouchableOpacity
                    className="flex-1 bg-blue-50 rounded-2xl p-4 mb-4"
                    onPress={() => router.push('/diagnosis', { sessionId: 'demo' })}
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-stone-900 font-bold text-base">
                        {moment.num} {moment.label}
                      </Text>
                      <FontAwesome6 name="circle-check" size={18} color="#2563EB" />
                    </View>
                    <Text className="text-stone-600 text-sm leading-5 mb-2">{moment.desc}</Text>
                    <Text className="text-stone-400 text-xs mb-3">{moment.date}</Text>
                    <TouchableOpacity onPress={() => router.push('/diagnosis', { sessionId: 'demo' })}>
                      <Text className="text-blue-600 text-sm font-medium">回看诊断 →</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </View>
              );
            }

            if (isCurrent) {
              return (
                <View key={moment.id} className="flex-row mb-2">
                  <View className="items-center mr-4 w-10">
                    <View className="w-8 h-8 rounded-full bg-red-500 items-center justify-center">
                      <FontAwesome6 name="location-dot" size={14} color="#fff" />
                    </View>
                    {idx < MOMENTS.length - 1 && <View className="w-0.5 h-10 bg-stone-200 mt-1" />}
                  </View>
                  <View className="flex-1 bg-red-50 rounded-2xl p-4 mb-4 border-2 border-blue-400">
                    <Text className="text-stone-900 font-bold text-base mb-2">
                      {moment.num} {moment.label}
                    </Text>
                    <Text className="text-stone-600 text-sm leading-5 mb-2">{moment.desc}</Text>
                    {moment.stat && <Text className="text-stone-400 text-xs mb-3">{moment.stat}</Text>}
                    <View className="flex-row gap-3 mt-3">
                      <TouchableOpacity
                        className="flex-1 bg-blue-600 rounded-xl py-3 items-center"
                        onPress={() => {
                          if (moment.id === 'first_exam_shock') router.push('/diagnosis', { sessionId: 'demo' });
                          else router.push('/onboarding');
                        }}
                      >
                        <Text className="text-white font-semibold text-sm">看看我到底差在哪</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-white rounded-xl py-3 items-center border border-blue-400"
                        onPress={() => router.push("/settings")}
                      >
                        <Text className="text-blue-600 font-semibold text-sm">不想看分数</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View key={moment.id} className="flex-row mb-2">
                <View className="items-center mr-4 w-10">
                  <View className="w-8 h-8 rounded-full bg-stone-100 items-center justify-center">
                    <FontAwesome6 name="lock" size={14} color="#9CA3AF" />
                  </View>
                  {idx < MOMENTS.length - 1 && <View className="w-0.5 h-10 bg-stone-200 mt-1" />}
                </View>
                <View className="flex-1 bg-stone-50 rounded-2xl p-4 mb-4 border border-stone-200">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-stone-500 font-bold text-base">
                      {moment.num} {moment.label}
                    </Text>
                    <FontAwesome6 name="lock" size={14} color="#9CA3AF" />
                  </View>
                  <Text className="text-stone-400 text-sm mb-2">{moment.desc}</Text>
                  {moment.progress && (
                    <View>
                      <View className="h-2 bg-stone-200 rounded-full overflow-hidden mb-1">
                        <View className="h-full bg-blue-400 rounded-full" style={{ width: moment.id === 'knowledge_island' ? '40%' : '0%' }} />
                      </View>
                      <Text className="text-stone-400 text-xs">{moment.progress} · {moment.progressText}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Show more toggle */}
          {!showMore && hiddenCount > 0 && (
            <TouchableOpacity
              className="flex-row items-center justify-center py-3 mb-4"
              onPress={() => setShowMore(true)}
            >
              <View className="bg-stone-100 rounded-full px-6 py-2 flex-row items-center gap-2">
                <Text className="text-stone-500 text-sm">还有 {hiddenCount} 站（⑤⑥⑦⑧）</Text>
                <FontAwesome6 name="chevron-right" size={12} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Today's recommendation */}
        <View className="px-6 pb-8">
          <View className="bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <FontAwesome6 name="book-open" size={18} color="#2563EB" />
                <Text className="text-stone-900 font-bold text-base">今日推荐练习</Text>
              </View>
              <View className="bg-blue-50 px-2 py-0.5 rounded">
                <Text className="text-blue-600 text-xs font-medium">TR</Text>
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
