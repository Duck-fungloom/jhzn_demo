import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeSearchParams, useSafeRouter } from '@/hooks/useSafeRouter';

const momentData: Record<string, {
  title: string;
  subtitle: string;
  description: string;
  stat: string;
  color: string;
  icon: keyof typeof FontAwesome6.glyphMap;
  rationalPath: { title: string; description: string; steps: string[] };
  emotionalPath: { title: string; message: string };
}> = {
  entry_confusion: {
    title: 'Entry Confusion',
    subtitle: 'Just starting, don\'t know where to begin',
    description: 'Opening social media, 2000 posts about IELTS prep; opening cloud storage, 50GB of materials from seniors; opening App Store, 30 IELTS apps... Don\'t know where to start.',
    stat: '92% of test takers feel the same way at the beginning',
    color: '#F59E0B',
    icon: 'compass',
    rationalPath: {
      title: 'Help me get organized',
      description: 'Let\'s start with a quick diagnostic to understand your starting point.',
      steps: ['Quick info collection', '15-min diagnostic writing', 'Personalized learning map'],
    },
    emotionalPath: {
      title: 'I just want to talk to someone',
      message: 'I understand. Every IELTS test taker feels this way at the beginning - it\'s not that you\'re not working hard, it\'s that there\'s too much information.',
    },
  },
  first_mock_shock: {
    title: 'First Mock Shock',
    subtitle: 'Score gap feels overwhelming',
    description: '1.5 points short, feeling like it\'s out of reach. Am I just not cut out for this?',
    stat: 'But what you haven\'t seen: your listening is already 6.5, writing TR is the only weak point',
    color: '#EF4444',
    icon: 'chart-line',
    rationalPath: {
      title: 'Show me where I\'m falling short',
      description: 'Let\'s look at your diagnostic results in detail.',
      steps: ['4-dimension analysis', 'Identify key weakness', 'Create focused plan'],
    },
    emotionalPath: {
      title: 'I don\'t want to see scores',
      message: 'Completely understand. First mock score lower than expected, many people don\'t want to see it. Let\'s talk about how you felt during the test instead.',
    },
  },
  practice_plateau: {
    title: 'Practice Plateau',
    subtitle: 'Score seems stuck',
    description: 'Done 15 sets of practice, total score stuck at 6.0. Every time I check answers I think "I know how to do these, why am I still getting them wrong?"',
    stat: '83% of test takers experience at least one plateau in mid-preparation',
    color: '#3B82F6',
    icon: 'arrows-rotate',
    rationalPath: {
      title: 'Show me what\'s blocking me',
      description: 'Let\'s analyze your recent practice patterns.',
      steps: ['Error attribution analysis', 'Identify hidden regression', 'Targeted breakthrough plan'],
    },
    emotionalPath: {
      title: 'I can barely hold on',
      message: 'I\'ve seen your practice records - you\'ve actually been improving, just not in the area you expected.',
    },
  },
  exam_eve_insomnia: {
    title: 'Exam Eve Insomnia',
    subtitle: 'Can\'t sleep before the big day',
    description: 'You opened the app 3 times. I guess you can\'t sleep right now.',
    stat: 'Every IELTS test taker feels this way the night before - you\'re not an exception, you\'re just normal.',
    color: '#6366F1',
    icon: 'moon',
    rationalPath: {
      title: 'Start breathing exercise',
      description: 'Let\'s calm your mind with a guided breathing exercise.',
      steps: ['4-4-6 breathing pattern', 'Review your preparation', 'Tomorrow\'s checklist'],
    },
    emotionalPath: {
      title: 'I\'m so nervous',
      message: 'You\'ve prepared for 8 weeks. You\'ve done everything you can. Tomorrow you just need to show up and let your preparation speak for itself.',
    },
  },
};

export default function MomentDetailScreen() {
  const { id } = useSafeSearchParams<{ id: string }>();
  const router = useSafeRouter();
  const [activePath, setActivePath] = useState<'rational' | 'emotional' | null>(null);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const breathAnim = useState(new Animated.Value(0))[0];

  const moment = id ? momentData[id] : null;

  useEffect(() => {
    if (id === 'exam_eve_insomnia') {
      const interval = setInterval(() => {
        setBreathPhase(prev => {
          const next = prev === 'inhale' ? 'hold' : prev === 'hold' ? 'exhale' : 'inhale';
          Animated.timing(breathAnim, {
            toValue: next === 'inhale' ? 1 : next === 'hold' ? 1 : 0,
            duration: next === 'inhale' ? 4000 : next === 'hold' ? 4000 : 6000,
            useNativeDriver: true,
          }).start();
          return next;
        });
      }, breathPhase === 'inhale' ? 4000 : breathPhase === 'hold' ? 4000 : 6000);
      return () => clearInterval(interval);
    }
  }, [id, breathPhase, breathAnim]);

  if (!moment) {
    return (
      <Screen className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Moment not found</Text>
      </Screen>
    );
  }

  const isExamEve = id === 'exam_eve_insomnia';
  const scale = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-5 pt-12 pb-8">
        <TouchableOpacity onPress={() => router.back()} className="mb-4">
          <FontAwesome6 name="arrow-left" size={20} color="#374151" />
        </TouchableOpacity>

        <View className="items-center mb-6">
          <View
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
            style={{ backgroundColor: moment.color + '20' }}
          >
            <FontAwesome6 name={moment.icon} size={28} color={moment.color} />
          </View>
          <Text className="text-[24px] font-bold text-gray-900 text-center mb-1">
            {moment.title}
          </Text>
          <Text className="text-[14px] text-gray-500 text-center">
            {moment.subtitle}
          </Text>
        </View>

        <View
          className="bg-white rounded-3xl p-5 mb-5"
          style={{ shadowColor: moment.color, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}
        >
          <Text className="text-[15px] text-gray-700 leading-6 mb-3">
            {moment.description}
          </Text>
          <View className="flex-row items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3">
            <FontAwesome6 name="lightbulb" size={14} color={moment.color} />
            <Text className="text-[12px] text-gray-600 flex-1 leading-5">
              {moment.stat}
            </Text>
          </View>
        </View>

        {isExamEve && (
          <View className="bg-white rounded-3xl p-6 mb-5 items-center" style={{ shadowColor: moment.color, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
            <Text className="text-[14px] text-gray-600 mb-4">Place your finger on the screen</Text>
            <Animated.View
              className="w-20 h-20 rounded-full items-center justify-center"
              style={{
                backgroundColor: moment.color + '40',
                transform: [{ scale }],
              }}
            >
              <View className="w-10 h-10 rounded-full" style={{ backgroundColor: moment.color }} />
            </Animated.View>
            <Text className="text-[16px] font-medium text-gray-900 mt-4">
              {breathPhase === 'inhale' ? 'Breathe In... 4s' : breathPhase === 'hold' ? 'Hold... 4s' : 'Breathe Out... 6s'}
            </Text>
            <Text className="text-[12px] text-gray-500 mt-2">Follow the rhythm</Text>
          </View>
        )}

        {!activePath && !isExamEve && (
          <View className="gap-3">
            <TouchableOpacity
              className="bg-white rounded-2xl p-4 flex-row items-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
              activeOpacity={0.7}
              onPress={() => setActivePath('rational')}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: moment.color + '15' }}>
                <FontAwesome6 name="chart-bar" size={16} color={moment.color} />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-gray-900">{moment.rationalPath.title}</Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">{moment.rationalPath.description}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-4 flex-row items-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
              activeOpacity={0.7}
              onPress={() => setActivePath('emotional')}
            >
              <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#EC4899' + '15' }}>
                <FontAwesome6 name="heart" size={16} color="#EC4899" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-semibold text-gray-900">{moment.emotionalPath.title}</Text>
                <Text className="text-[12px] text-gray-500 mt-0.5">Emotional support & guidance</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {activePath === 'rational' && (
          <View className="bg-white rounded-3xl p-5" style={{ shadowColor: moment.color, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
            <View className="flex-row items-center mb-4">
              <FontAwesome6 name="clipboard-list" size={18} color={moment.color} />
              <Text className="text-[16px] font-semibold text-gray-900 ml-2">Action Plan</Text>
            </View>
            {moment.rationalPath.steps.map((step, idx) => (
              <View key={idx} className="flex-row items-start mb-3">
                <View className="w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: moment.color + '20' }}>
                  <Text className="text-[11px] font-bold" style={{ color: moment.color }}>{idx + 1}</Text>
                </View>
                <Text className="text-[13px] text-gray-700 flex-1 leading-5">{step}</Text>
              </View>
            ))}
            <TouchableOpacity
              className="rounded-2xl py-3.5 items-center mt-4"
              style={{ backgroundColor: moment.color }}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-[14px]">Start Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {activePath === 'emotional' && (
          <View className="bg-white rounded-3xl p-5" style={{ shadowColor: '#EC4899', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
            <View className="flex-row items-center mb-4">
              <FontAwesome6 name="heart" size={18} color="#EC4899" />
              <Text className="text-[16px] font-semibold text-gray-900 ml-2">Your Companion</Text>
            </View>
            <View className="bg-pink-50 rounded-2xl p-4 mb-4">
              <Text className="text-[14px] text-gray-700 leading-6">
                {moment.emotionalPath.message}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-pink-500 rounded-2xl py-3.5 items-center"
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-[14px]">Chat with Companion</Text>
            </TouchableOpacity>
          </View>
        )}

        {activePath && (
          <TouchableOpacity
            className="mt-4 py-3 items-center"
            onPress={() => setActivePath(null)}
          >
            <Text className="text-gray-500 text-[13px]">Back to options</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Screen>
  );
}
