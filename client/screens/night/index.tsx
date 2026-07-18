import { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesome6 } from '@expo/vector-icons';

export default function NightScreen() {
  const { student } = useAuth();
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const [phase, setPhase] = useState<'intro' | 'chat' | 'review' | 'breathing' | 'goodnight'>('intro');
  const [breathScale] = useState(new Animated.Value(1));
  const [breathText, setBreathText] = useState('吸气...');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase === 'breathing') {
      const phases = ['吸气...', '保持...', '呼气...', '保持...'];
      let idx = 0;
      intervalRef.current = setInterval(() => {
        idx = (idx + 1) % phases.length;
        setBreathText(phases[idx]);
        Animated.timing(breathScale, {
          toValue: idx % 2 === 0 ? 1.5 : 1,
          duration: 3000,
          useNativeDriver: true,
        }).start();
      }, 3000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const renderPhase = () => {
    switch (phase) {
      case 'intro':
        return (
          <View className="flex-1 items-center justify-center px-8">
            <FontAwesome6 name="moon" size={48} color="#a5b4fc" />
            <Text className="text-indigo-200 text-xl font-bold mt-6 text-center">考前夜</Text>
            <Text className="text-indigo-300/70 text-sm text-center mt-4 leading-6">
              明天就要考试了，现在不需要再刷题。{'\n'}让我们放松一下，回顾你的备考旅程。
            </Text>
            <TouchableOpacity
              onPress={() => setPhase('chat')}
              className="bg-indigo-500/30 rounded-2xl px-8 py-3 mt-8"
            >
              <Text className="text-indigo-200 font-semibold">开始回顾</Text>
            </TouchableOpacity>
          </View>
        );
      case 'chat':
        return (
          <View className="flex-1 px-6 pt-16">
            <View className="bg-indigo-500/20 rounded-2xl p-4 self-start max-w-[80%]">
              <Text className="text-indigo-200 text-sm leading-5">
                你已经准备了很久，现在的你比一周前更有准备。明天的考试只是把你已有的能力展示出来。
              </Text>
            </View>
            <View className="mt-6">
              <Text className="text-indigo-300/50 text-xs mb-3">回顾你的进步</Text>
              <View className="gap-3">
                {['首次模考 TR 5.0', 'CC 从 5.0 提升到 5.5', '连续打卡 14 天'].map((item, i) => (
                  <View key={i} className="bg-indigo-500/10 rounded-xl px-4 py-2">
                    <Text className="text-indigo-300 text-sm">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setPhase('breathing')}
              className="bg-indigo-500/30 rounded-2xl px-8 py-3 mt-8 self-center"
            >
              <Text className="text-indigo-200 font-semibold">做一组呼吸练习</Text>
            </TouchableOpacity>
          </View>
        );
      case 'breathing':
        return (
          <View className="flex-1 items-center justify-center px-8">
            <Animated.View
              style={[styles.breathCircle, { transform: [{ scale: breathScale }] }]}
            >
              <Text className="text-indigo-200 text-lg">{breathText}</Text>
            </Animated.View>
            <TouchableOpacity
              onPress={() => setPhase('goodnight')}
              className="bg-indigo-500/30 rounded-2xl px-8 py-3 mt-12"
            >
              <Text className="text-indigo-200 font-semibold">结束练习</Text>
            </TouchableOpacity>
          </View>
        );
      case 'goodnight':
        return (
          <View className="flex-1 items-center justify-center px-8">
            <FontAwesome6 name="star" size={32} color="#a5b4fc" />
            <Text className="text-indigo-200 text-xl font-bold mt-6">晚安</Text>
            <Text className="text-indigo-300/70 text-sm text-center mt-4 leading-6">
              明天的你，会是最好的你。{'\n'}放下手机，好好休息。
            </Text>
            <View className="bg-indigo-500/20 rounded-2xl p-4 mt-8 w-full">
              <Text className="text-indigo-300 text-xs text-center">明天要做的事：</Text>
              <Text className="text-indigo-200 text-sm text-center mt-2">1. 检查准考证和文具{'\n'}2. 提前到达考场{'\n'}3. 相信自己</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Screen>
      <View className="flex-1 bg-[#1e1b4b]">
        {renderPhase()}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  breathCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(165,180,252,0.3)',
  },
});
