import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesome6 } from '@expo/vector-icons';

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View className="flex-row items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <View key={idx} className="flex-row items-center">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{
              backgroundColor: idx <= currentStep ? '#2563EB' : '#E5E7EB',
            }}
          >
            {idx < currentStep ? (
              <FontAwesome6 name="check" size={12} color="#fff" />
            ) : (
              <Text className="text-white text-xs font-bold">{idx + 1}</Text>
            )}
          </View>
          {idx < totalSteps - 1 && (
            <View
              className="w-8 h-0.5 mx-1"
              style={{
                backgroundColor: idx < currentStep ? '#2563EB' : '#E5E7EB',
              }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// Animated dimension bar for results
function AnimatedDimensionBar({ label, band, percent, color, delay }: {
  label: string;
  band: string;
  percent: number;
  color: string;
  delay: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(widthAnim, {
        toValue: percent,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [percent, delay]);

  return (
    <View className="mb-4">
      <View className="flex-row items-center gap-3 mb-2">
        <View className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Text className="text-xs font-bold" style={{ color }}>{label}</Text>
        </View>
        <Text className="text-stone-900 font-semibold text-lg">{band}</Text>
      </View>
      <View className="h-3 bg-stone-100 rounded-full overflow-hidden">
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
    </View>
  );
}

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
  const [showResults, setShowResults] = useState(false);
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
  const isStep1Valid = !!targetScore;

  // Countdown timer
  useEffect(() => {
    if (step !== 1) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const handleNext = async () => {
    if (step === 0 && isStep1Valid) {
      setStep(1);
    } else if (step === 1) {
      // Submit essay
      if (student) {
        try {
          await fetch(`${BASE_URL}/api/v1/student/${student.id}/practice-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_type: 'opinion',
              task_prompt: 'Some people believe that technology has made our lives more complex rather than simpler.',
              content: essay || 'Diagnostic essay placeholder',
              word_count: wordCount || 50,
            }),
          });
        } catch (e) { console.error(e); }
      }
      setStep(2);
      // Trigger animation after a short delay
      setTimeout(() => setShowResults(true), 300);
    } else if (step === 2) {
      router.replace('/(tabs)');
    }
  };

  const targetScores = ['6.0', '6.5', '7.0', '7.5+'];

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const dimensions = [
    { label: 'TR', band: 'Band 5', percent: 50, color: '#3B82F6' },
    { label: 'CC', band: 'Band 5.5', percent: 55, color: '#8B5CF6' },
    { label: 'LR', band: 'Band 6', percent: 60, color: '#10B981' },
    { label: 'GR', band: 'Band 5.5', percent: 55, color: '#F59E0B' },
  ];

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Step indicator */}
        <View className="pt-12 px-6">
          <StepIndicator currentStep={step} totalSteps={3} />
        </View>

        {/* Step 0: Info collection */}
        {step === 0 && (
          <View className="px-6 pt-4 pb-12">
            {/* Coach Alex greeting */}
            <View className="flex-row items-start gap-3 mb-8">
              <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center">
                <FontAwesome6 name="dumbbell" size={20} color="#EA580C" />
              </View>
              <View className="flex-1 bg-orange-50 rounded-2xl rounded-tl-sm p-4">
                <Text className="text-orange-600 font-bold text-sm mb-1">Coach Alex</Text>
                <Text className="text-stone-700 text-sm leading-5">
                  你好！在开始之前，先了解一下你的目标和起点，这样我才能为你定制最适合的学习路径。
                </Text>
              </View>
            </View>

            {/* Target score */}
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-6 h-6 rounded-full bg-blue-100 items-center justify-center">
                  <FontAwesome6 name="trophy" size={10} color="#2563EB" />
                </View>
                <Text className="text-stone-900 font-bold text-base">你的目标分数</Text>
              </View>
              <View className="flex-row gap-3">
                {targetScores.map(score => (
                  <TouchableOpacity
                    key={score}
                    className="flex-1 py-3.5 rounded-xl items-center border-2"
                    style={{
                      borderColor: targetScore === score ? '#2563EB' : '#E5E7EB',
                      backgroundColor: targetScore === score ? '#EFF6FF' : '#fff',
                    }}
                    onPress={() => setTargetScore(score)}
                  >
                    <Text
                      className="font-semibold text-base"
                      style={{ color: targetScore === score ? '#2563EB' : '#374151' }}
                    >
                      {score}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Exam date */}
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-6 h-6 rounded-full bg-purple-100 items-center justify-center">
                  <FontAwesome6 name="calendar" size={10} color="#8B5CF6" />
                </View>
                <Text className="text-stone-900 font-bold text-base">考试日期</Text>
              </View>
              <View className="flex-row items-center bg-white rounded-xl border border-stone-200 px-4 py-3.5">
                <FontAwesome6 name="calendar-days" size={16} color="#9CA3AF" />
                <TextInput
                  className="flex-1 ml-3 text-stone-700"
                  placeholder="选择日期（可选）"
                  placeholderTextColor="#9CA3AF"
                  value={examDate}
                  onChangeText={setExamDate}
                />
                {!examDate && (
                  <TouchableOpacity
                    className="bg-stone-100 px-3 py-1.5 rounded-full"
                    onPress={() => setExamDate('暂无计划')}
                  >
                    <Text className="text-stone-500 text-xs">暂无计划</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Age question */}
            <View className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center">
                  <FontAwesome6 name="user" size={10} color="#10B981" />
                </View>
                <Text className="text-stone-900 font-bold text-base">你是否已满 18 岁？</Text>
              </View>
              <View className="flex-row gap-3">
                {['是，我已成年', '否，我未满18岁'].map((opt, idx) => (
                  <TouchableOpacity
                    key={opt}
                    className="flex-1 py-3.5 rounded-xl items-center border-2"
                    style={{
                      borderColor: isAdult === (idx === 0 ? '是' : '否') ? '#2563EB' : '#E5E7EB',
                      backgroundColor: isAdult === (idx === 0 ? '是' : '否') ? '#EFF6FF' : '#fff',
                    }}
                    onPress={() => setIsAdult(idx === 0 ? '是' : '否')}
                  >
                    <Text
                      className="font-medium text-sm"
                      style={{ color: isAdult === (idx === 0 ? '是' : '否') ? '#2563EB' : '#374151' }}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Guardian fields (if under 18) */}
            {isAdult === '否' && (
              <View className="gap-3 mb-6 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <View className="flex-row items-center gap-2 mb-2">
                  <FontAwesome6 name="shield-halved" size={14} color="#D97706" />
                  <Text className="text-amber-700 text-sm font-medium">需要监护人信息</Text>
                </View>
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
              className="py-4 rounded-xl items-center mb-4"
              style={{
                backgroundColor: isStep1Valid ? '#2563EB' : '#93C5FD',
              }}
              onPress={handleNext}
              disabled={!isStep1Valid}
            >
              <Text className="text-white font-semibold text-base">下一步</Text>
            </TouchableOpacity>

            {/* Skip link */}
            <TouchableOpacity className="items-center py-2" onPress={() => setStep(1)}>
              <Text className="text-stone-400 text-sm">跳过，直接做诊断</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Diagnosis writing */}
        {step === 1 && (
          <View className="px-6 pt-4 pb-12">
            {/* Header with timer */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <FontAwesome6 name="pen-to-square" size={16} color="#2563EB" />
                <Text className="text-stone-900 font-bold text-lg">轻量诊断写作</Text>
              </View>
              <View
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  backgroundColor: timeLeft < 120 ? '#FEF2F2' : '#F5F5F4',
                }}
              >
                <FontAwesome6
                  name="clock"
                  size={12}
                  color={timeLeft < 120 ? '#EF4444' : '#9CA3AF'}
                />
                <Text
                  className="font-mono text-sm font-medium"
                  style={{ color: timeLeft < 120 ? '#EF4444' : '#6B7280' }}
                >
                  {formatTime(timeLeft)}
                </Text>
              </View>
            </View>

            {/* Coach message */}
            <View className="flex-row items-start gap-3 mb-5">
              <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
                <FontAwesome6 name="dumbbell" size={16} color="#EA580C" />
              </View>
              <View className="flex-1 bg-orange-50 rounded-2xl rounded-tl-sm p-3">
                <Text className="text-stone-700 text-sm leading-5">
                  最后一步——花 15 分钟写一篇短文。这不是考试，是帮我们知道你的起点，这样我才能给你最精准的建议。
                </Text>
              </View>
            </View>

            {/* Task prompt */}
            <View className="bg-white rounded-2xl p-4 border border-stone-200 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <View className="bg-blue-50 px-2 py-0.5 rounded">
                  <Text className="text-blue-600 text-xs font-medium">Task 2</Text>
                </View>
                <Text className="text-stone-400 text-xs">Opinion Essay</Text>
              </View>
              <Text className="text-stone-900 text-base leading-6">
                Some people believe that technology has made our lives more complex rather than simpler. To what extent do you agree or disagree?
              </Text>
            </View>

            {/* Text area */}
            <View className="bg-white rounded-2xl border border-stone-200 overflow-hidden mb-3">
              <TextInput
                className="p-4 text-stone-700 min-h-[180px] text-base leading-6"
                placeholder="开始写吧，不用有压力..."
                placeholderTextColor="#9CA3AF"
                value={essay}
                onChangeText={setEssay}
                multiline
                textAlignVertical="top"
              />
              {/* Word count bar */}
              <View className="flex-row items-center justify-between px-4 py-2.5 bg-stone-50 border-t border-stone-100">
                <View className="flex-row items-center gap-2">
                  <Text className="text-stone-500 text-sm">字数：</Text>
                  <Text className="text-stone-900 font-semibold text-sm">{wordCount}</Text>
                </View>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: wordCount >= 150 ? '#DCFCE7' : '#FEF3C7',
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: wordCount >= 150 ? '#16A34A' : '#D97706' }}
                  >
                    {wordCount >= 150 ? '达标' : '建议 150+'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                className="flex-1 bg-white rounded-xl py-4 items-center border border-stone-200"
                onPress={() => setStep(0)}
              >
                <Text className="text-stone-500 font-semibold">返回</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-blue-600 rounded-xl py-4 items-center"
                onPress={handleNext}
              >
                <Text className="text-white font-semibold">提交诊断</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Results */}
        {step === 2 && (
          <View className="px-6 pt-6 pb-12 items-center">
            {/* Celebration */}
            <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center mb-4">
              <FontAwesome6 name="gift" size={36} color="#F97316" />
            </View>
            <Text className="text-stone-900 font-bold text-2xl mb-2">诊断完成！</Text>
            <Text className="text-stone-500 text-center text-sm mb-6">
              你的专属学习地图已生成{'\n'}我们发现了你最需要提升的维度
            </Text>

            {/* Dimension bars with animation */}
            <View className="w-full bg-white rounded-2xl p-5 mb-6 border border-stone-100">
              <Text className="text-stone-900 font-bold text-base mb-4">四维能力评估</Text>
              {dimensions.map((d, idx) => (
                <AnimatedDimensionBar
                  key={d.label}
                  label={d.label}
                  band={d.band}
                  percent={d.percent}
                  color={d.color}
                  delay={idx * 200}
                />
              ))}
            </View>

            {/* Insight card */}
            <View className="w-full bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-100">
              <View className="flex-row items-center gap-2 mb-3">
                <FontAwesome6 name="lightbulb" size={16} color="#2563EB" />
                <Text className="text-blue-700 font-bold text-sm">Coach Alex 说</Text>
              </View>
              <Text className="text-stone-700 text-sm leading-5">
                你的 LR 表现不错，说明词汇基础还可以。但 TR 和 CC 需要加强——这是大多数考生最容易忽略的维度。别担心，我们有针对性的练习帮你突破。
              </Text>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              className="w-full bg-blue-600 rounded-xl py-4 items-center mb-3"
              onPress={() => router.replace('/diagnosis', { sessionId: 'sess-diag-001' })}
            >
              <Text className="text-white font-semibold">查看完整诊断报告</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="w-full bg-white rounded-xl py-4 items-center border border-stone-200"
              onPress={() => router.replace('/(tabs)')}
            >
              <Text className="text-stone-600 font-semibold">返回首页</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
