import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesome6 } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const router = useSafeRouter();
  const { student } = useAuth();
  const [step, setStep] = useState(0);
  const [targetScore, setTargetScore] = useState('');
  const [examDate, setExamDate] = useState('');
  const [isAdult, setIsAdult] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [essay, setEssay] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const isStep1Valid = !!targetScore;

  const handleNext = async () => {
    if (step === 0 && isStep1Valid) {
      setStep(1);
    } else if (step === 1) {
      // Submit essay
      if (student) {
        try {
          await fetch(`${BASE_URL}/api/v1/student/practice-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: 'diagnostic', content: essay }),
          });
        } catch (e) { console.error(e); }
      }
      setStep(2);
    } else if (step === 2) {
      router.replace('/');
    }
  };

  const targetScores = ['6.0', '6.5', '7.0', '7.5+'];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Step 0: Info collection */}
        {step === 0 && (
          <View className="px-6 pt-8 pb-12">
            {/* Coach Alex greeting */}
            <View className="flex-row items-start gap-3 mb-8">
              <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center">
                <FontAwesome6 name="dumbbell" size={20} color="#EA580C" />
              </View>
              <View className="flex-1 bg-orange-50 rounded-2xl rounded-tl-sm p-4">
                <Text className="text-orange-600 font-bold text-base mb-1">Coach · Alex</Text>
                <Text className="text-stone-700 text-sm leading-5">
                  你好！在开始之前，先了解一下你的目标和起点，这样我才能为你定制最适合的学习路径。
                </Text>
              </View>
            </View>

            {/* Target score */}
            <Text className="text-stone-900 font-bold text-lg mb-3">你的目标分数</Text>
            <View className="flex-row gap-3 mb-8">
              {targetScores.map(score => (
                <TouchableOpacity
                  key={score}
                  className={`flex-1 py-3 rounded-xl items-center border-2 ${
                    targetScore === score ? 'border-blue-500 bg-blue-50' : 'border-stone-200 bg-white'
                  }`}
                  onPress={() => setTargetScore(score)}
                >
                  <Text className={`font-semibold ${targetScore === score ? 'text-blue-600' : 'text-stone-700'}`}>
                    {score}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Exam date */}
            <Text className="text-stone-900 font-bold text-lg mb-3">考试日期</Text>
            <View className="flex-row items-center bg-white rounded-xl border border-stone-200 px-4 py-3 mb-2">
              <FontAwesome6 name="calendar" size={16} color="#9CA3AF" />
              <Text className="flex-1 ml-3 text-stone-400">选择日期</Text>
              <TouchableOpacity>
                <Text className="text-stone-400 text-sm bg-stone-100 px-3 py-1 rounded-full">暂无计划</Text>
              </TouchableOpacity>
            </View>

            {/* Age question */}
            <Text className="text-stone-900 font-bold text-lg mb-3 mt-6">你是否已满 18 岁？</Text>
            <View className="flex-row gap-3 mb-6">
              {['是', '否'].map(opt => (
                <TouchableOpacity
                  key={opt}
                  className={`flex-1 py-3.5 rounded-xl items-center border-2 ${
                    isAdult === opt ? 'border-blue-500 bg-blue-50' : 'border-stone-200 bg-white'
                  }`}
                  onPress={() => setIsAdult(opt)}
                >
                  <Text className={`font-semibold ${isAdult === opt ? 'text-blue-600' : 'text-stone-700'}`}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Guardian fields (if under 18) */}
            {isAdult === '否' && (
              <View className="gap-3 mb-6">
                <TextInput
                  className="bg-white rounded-xl border border-stone-200 px-4 py-3 text-stone-700"
                  placeholder="监护人姓名"
                  placeholderTextColor="#9CA3AF"
                  value={guardianName}
                  onChangeText={setGuardianName}
                />
                <TextInput
                  className="bg-white rounded-xl border border-stone-200 px-4 py-3 text-stone-700"
                  placeholder="监护人手机号"
                  placeholderTextColor="#9CA3AF"
                  value={guardianPhone}
                  onChangeText={setGuardianPhone}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {/* Next button */}
            <TouchableOpacity
              className={`py-4 rounded-xl items-center mb-4 ${isStep1Valid ? 'bg-blue-200' : 'bg-blue-100'}`}
              onPress={handleNext}
              disabled={!isStep1Valid}
            >
              <Text className="text-white font-semibold text-base">下一步</Text>
            </TouchableOpacity>

            {/* Skip link */}
            <TouchableOpacity className="items-center" onPress={() => setStep(1)}>
              <Text className="text-stone-400">跳过，直接做诊断</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Diagnosis writing */}
        {step === 1 && (
          <View className="px-6 pt-4 pb-12">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-stone-900 font-bold text-lg">轻量诊断写作</Text>
              <View className="flex-row items-center gap-1">
                <FontAwesome6 name="clock" size={14} color="#9CA3AF" />
                <Text className={`font-mono text-sm ${timeLeft < 120 ? 'text-red-500' : 'text-stone-500'}`}>
                  {formatTime(timeLeft)}
                </Text>
              </View>
            </View>

            {/* Coach message */}
            <View className="flex-row items-start gap-3 mb-6">
              <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
                <FontAwesome6 name="dumbbell" size={16} color="#EA580C" />
              </View>
              <View className="flex-1 bg-orange-50 rounded-2xl rounded-tl-sm p-3">
                <Text className="text-stone-700 text-sm leading-5">
                  &ldquo;最后一步——花 15 分钟写一篇短文。这不是考试，是帮我们知道你的起点，这样我才能给你最精准的建议。&rdquo;
                </Text>
              </View>
            </View>

            {/* Task prompt */}
            <View className="bg-white rounded-2xl p-4 border border-stone-200 mb-4">
              <Text className="text-stone-400 text-sm mb-2">题目 · Task 2</Text>
              <Text className="text-stone-900 text-base leading-6">
                Some people believe that technology has made our lives more complex rather than simpler. To what extent do you agree or disagree?
              </Text>
            </View>

            {/* Text area */}
            <TextInput
              className="bg-white rounded-2xl border border-stone-200 p-4 text-stone-700 min-h-[200px] text-base leading-6"
              placeholder="开始写吧，不用有压力..."
              placeholderTextColor="#9CA3AF"
              value={essay}
              onChangeText={setEssay}
              multiline
              textAlignVertical="top"
            />

            {/* Word count */}
            <View className="flex-row justify-between mt-3 mb-6">
              <Text className="text-stone-500 text-sm">字数：{wordCount}</Text>
              <Text className="text-amber-500 text-sm">建议：150+</Text>
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-blue-600 rounded-xl py-4 items-center"
                onPress={handleNext}
              >
                <Text className="text-white font-semibold">提交</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-white rounded-xl py-4 items-center border border-stone-200"
                onPress={() => setStep(0)}
              >
                <Text className="text-stone-500 font-semibold">稍后再说</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Results */}
        {step === 2 && (
          <View className="px-6 pt-12 pb-12 items-center">
            {/* Celebration */}
            <FontAwesome6 name="gift" size={48} color="#F97316" />
            <Text className="text-stone-900 font-bold text-2xl mb-2">诊断完成！</Text>
            <Text className="text-stone-500 text-center mb-8">
              你的专属学习地图已生成{'\n'}我们发现了你最需要提升的维度
            </Text>

            {/* Dimension bars */}
            <View className="w-full bg-white rounded-2xl p-5 mb-8" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
              {[
                { label: 'TR', band: 'Band 5', pct: 50, color: '#3B82F6' },
                { label: 'CC', band: 'Band 5.5', pct: 55, color: '#8B5CF6' },
                { label: 'LR', band: 'Band 6', pct: 60, color: '#10B981' },
                { label: 'GR', band: 'Band 5.5', pct: 55, color: '#F59E0B' },
              ].map(d => (
                <View key={d.label} className="mb-4">
                  <View className="flex-row items-center gap-3 mb-2">
                    <View className="bg-stone-100 px-2 py-0.5 rounded">
                      <Text className="text-xs font-bold" style={{ color: d.color }}>{d.label}</Text>
                    </View>
                    <Text className="text-stone-900 font-semibold text-lg">{d.band}</Text>
                  </View>
                  <View className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <View className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                  </View>
                </View>
              ))}
              <View className="flex-row items-center gap-2 mt-2 pt-3 border-t border-stone-100">
                <FontAwesome6 name="triangle-exclamation" size={14} color="#F59E0B" />
                <Text className="text-amber-700 text-sm">这是分项诊断，不是总分</Text>
              </View>
            </View>

            {/* Enter home button */}
            <TouchableOpacity
              className="w-full bg-blue-600 rounded-xl py-4 items-center"
              onPress={() => router.replace('/')}
            >
              <Text className="text-white font-semibold text-base">进入首页，开始你的雅思之路 →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
