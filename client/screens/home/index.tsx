import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

const MOMENTS = [
  { id: 'entry_confusion', label: '入门迷茫', icon: 'compass', color: '#6366f1', desc: '刚接触雅思，不知道从哪开始' },
  { id: 'first_exam_shock', label: '首次模考打击', icon: 'bolt', color: '#ef4444', desc: '第一次模考成绩不理想' },
  { id: 'foundation_building', label: '基础搭建期', icon: 'layer-group', color: '#059669', desc: '系统学习各科目基础' },
  { id: 'practice_plateau', label: '刷题瓶颈', icon: 'chart-line', color: '#d97706', desc: '反复练习但分数不涨' },
  { id: 'output_helpless', label: '输出无助期', icon: 'pen', color: '#7c3aed', desc: '口语写作找不到人批改' },
  { id: 'pre_exam_panic', label: '考前恐慌', icon: 'triangle-exclamation', color: '#dc2626', desc: '考试临近，焦虑不安' },
  { id: 'pre_exam_insomnia', label: '考前失眠夜', icon: 'moon', color: '#1e1b4b', desc: '考试前夜，难以入眠' },
  { id: 'post_exam_recovery', label: '考后复盘期', icon: 'redo', color: '#0891b2', desc: '考试结束，总结经验' },
];

export default function HomeScreen() {
  const { student, portrait } = useAuth();
  const router = useSafeRouter();
  const [currentMoment, setCurrentMoment] = useState('entry_confusion');
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  useFocusEffect(() => {
    if (!student) return;
    fetch(`${BASE_URL}/api/v1/student/${student.id}/profile`)
      .then(r => r.json())
      .then(data => {
        if (data.portrait?.current_moment) {
          setCurrentMoment(data.portrait.current_moment);
        }
      })
      .catch(console.error);
  });

  const currentIdx = MOMENTS.findIndex(m => m.id === currentMoment);

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-12 pb-4">
          <Text className="text-stone-800 text-2xl font-bold">认知伙伴</Text>
          <Text className="text-stone-500 text-sm mt-1">
            {student ? `Hi, ${student.name}` : '你的雅思 AI 学习伙伴'}
          </Text>
        </View>

        {/* Current moment card */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-2xl p-5" style={{ shadowColor: '#6366f1', shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 }}>
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: (MOMENTS[currentIdx]?.color || '#6366f1') + '20' }}>
                <FontAwesome6 name={MOMENTS[currentIdx]?.icon as any || 'compass'} size={18} color={MOMENTS[currentIdx]?.color || '#6366f1'} />
              </View>
              <View className="flex-1">
                <Text className="text-stone-800 font-bold text-base">当前阶段</Text>
                <Text className="text-stone-500 text-xs">{MOMENTS[currentIdx]?.label || '入门迷茫'}</Text>
              </View>
            </View>
            <Text className="text-stone-600 text-sm leading-5 mb-4">
              {MOMENTS[currentIdx]?.desc || '刚开始雅思备考，需要了解考试结构和自身水平'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              className="bg-indigo-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">开始今日学习</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline */}
        <View className="px-6 mb-6">
          <Text className="text-stone-800 font-bold text-base mb-4">学习旅程</Text>
          {MOMENTS.map((moment, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isLocked = idx > currentIdx;

            return (
              <View key={moment.id} className="flex-row mb-4">
                {/* Timeline indicator */}
                <View className="items-center mr-4">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isCompleted ? moment.color : isCurrent ? moment.color + '20' : '#e7e5e4',
                    }}
                  >
                    <FontAwesome6
                      name={isCompleted ? 'check' : (isLocked ? 'lock' : moment.icon) as any}
                      size={14}
                      color={isCompleted ? '#fff' : isCurrent ? moment.color : '#a8a29e'}
                    />
                  </View>
                  {idx < MOMENTS.length - 1 && (
                    <View className="w-0.5 h-8 mt-1" style={{ backgroundColor: isCompleted ? moment.color : '#e7e5e4' }} />
                  )}
                </View>

                {/* Content */}
                <TouchableOpacity
                  className="flex-1 bg-white rounded-xl p-4"
                  style={{ shadowColor: '#000', shadowOpacity: isCurrent ? 0.06 : 0.02, shadowRadius: 8, elevation: isCurrent ? 3 : 1 }}
                  onPress={() => {
                    if (isCurrent) router.push('/onboarding');
                    if (moment.id === 'pre_exam_insomnia') router.push('/night');
                  }}
                  disabled={isLocked}
                >
                  <Text className={`font-semibold text-sm mb-1 ${isLocked ? 'text-stone-400' : 'text-stone-800'}`}>
                    {moment.label}
                  </Text>
                  <Text className="text-xs text-stone-500" numberOfLines={2}>
                    {isLocked ? '完成当前阶段后解锁' : moment.desc}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
