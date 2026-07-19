import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesome6 } from '@expo/vector-icons';
import { Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Star component for background
function Star({ delay, size, top, left }: { delay: number; size: number; top: string; left: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 2000 + delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 2000 + delay,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [delay]);

  return (
    <View style={{ position: 'absolute', top: top as any, left: left as any }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#fff',
          opacity,
        }}
      />
    </View>
  );
}

// Starry background
function StarryBackground() {
  const stars = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: Math.random() * 2000,
    }));
  }, []);

  return (
    <View className="absolute inset-0">
      {stars.map(star => (
        <Star key={star.id} {...star} />
      ))}
    </View>
  );
}

// Breathing circle with enhanced animation
function BreathingCircle({ breathText }: { breathText: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.5,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.2,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scaleLoop.start();
    glowLoop.start();

    return () => {
      scaleLoop.stop();
      glowLoop.stop();
    };
  }, []);

  return (
    <View className="items-center justify-center">
      {/* Outer glow */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: 'rgba(165, 180, 252, 0.15)',
          opacity: glowOpacity,
          transform: [{ scale }],
        }}
      />
      {/* Middle ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          borderWidth: 2,
          borderColor: 'rgba(165, 180, 252, 0.3)',
          transform: [{ scale }],
        }}
      />
      {/* Inner circle */}
      <Animated.View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(165, 180, 252, 0.4)',
          transform: [{ scale }],
        }}
      >
        <Text className="text-indigo-200 text-xl font-light">{breathText}</Text>
      </Animated.View>
    </View>
  );
}

export default function NightScreen() {
  const { student } = useAuth();
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const [phase, setPhase] = useState<'intro' | 'chat' | 'breathing' | 'goodnight'>('intro');
  const [breathText, setBreathText] = useState('吸气...');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (phase === 'breathing') {
      const phases = ['吸气...', '保持...', '呼气...', '保持...'];
      let idx = 0;
      setBreathText(phases[0]);
      intervalRef.current = setInterval(() => {
        idx = (idx + 1) % phases.length;
        setBreathText(phases[idx]);
      }, 4000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  const renderPhase = () => {
    switch (phase) {
      case 'intro':
        return (
          <Animated.View className="flex-1 items-center justify-center px-8" style={{ opacity: fadeAnim }}>
            <View className="w-24 h-24 rounded-full bg-indigo-500/20 items-center justify-center mb-6">
              <FontAwesome6 name="moon" size={48} color="#a5b4fc" />
            </View>
            <Text className="text-indigo-100 text-2xl font-light mb-2">考前夜</Text>
            <Text className="text-indigo-300/60 text-sm mb-8">让心灵平静下来</Text>
            <Text className="text-indigo-200/80 text-base text-center leading-7 mb-8">
              明天就要考试了，现在不需要再刷题。{'\n'}让我们放松一下，回顾你的备考旅程。
            </Text>
            <TouchableOpacity
              onPress={() => setPhase('chat')}
              className="bg-indigo-500/30 rounded-full px-10 py-4 border border-indigo-400/30"
            >
              <Text className="text-indigo-100 font-medium text-base">开始回顾</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      case 'chat':
        return (
          <Animated.View className="flex-1 px-6 pt-16" style={{ opacity: fadeAnim }}>
            {/* Mentor message */}
            <View className="flex-row items-start gap-3 mb-6">
              <View className="w-10 h-10 rounded-full bg-indigo-500/30 items-center justify-center">
                <FontAwesome6 name="user-graduate" size={16} color="#a5b4fc" />
              </View>
              <View className="flex-1 bg-indigo-500/20 rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                <Text className="text-indigo-300/60 text-xs mb-1">Mentor · Socra</Text>
                <Text className="text-indigo-100 text-sm leading-6">
                  你已经准备了很久，现在的你比一周前更有准备。明天的考试只是把你已有的能力展示出来。
                </Text>
              </View>
            </View>

            {/* Progress review */}
            <View className="ml-13 mb-6">
              <Text className="text-indigo-300/50 text-xs mb-3 uppercase tracking-wider">你的进步轨迹</Text>
              <View className="gap-2">
                {[
                  { icon: 'chart-line', text: '首次模考 TR 5.0', color: '#3B82F6' },
                  { icon: 'arrow-trend-up', text: 'CC 从 5.0 提升到 5.5', color: '#8B5CF6' },
                  { icon: 'fire', text: '连续打卡 14 天', color: '#F97316' },
                  { icon: 'brain', text: '完成 7 次专项练习', color: '#10B981' },
                ].map((item, i) => (
                  <View key={i} className="flex-row items-center gap-3 bg-indigo-500/10 rounded-xl px-4 py-3">
                    <FontAwesome6 name={item.icon as any} size={14} color={item.color} />
                    <Text className="text-indigo-200 text-sm">{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Encouragement */}
            <View className="bg-indigo-500/10 rounded-2xl p-4 mx-6 mb-6 border border-indigo-400/20">
              <Text className="text-indigo-200/80 text-sm text-center leading-6">
                每一次练习都在让你变得更好。{'\n'}明天的你，会感谢今天坚持的自己。
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setPhase('breathing')}
              className="bg-indigo-500/30 rounded-full px-10 py-4 mt-auto mb-12 self-center border border-indigo-400/30"
            >
              <Text className="text-indigo-100 font-medium">做一组呼吸练习</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      case 'breathing':
        return (
          <Animated.View className="flex-1 items-center justify-center px-8" style={{ opacity: fadeAnim }}>
            <Text className="text-indigo-300/60 text-sm mb-12">跟随节奏，深呼吸</Text>

            <BreathingCircle breathText={breathText} />

            <Text className="text-indigo-300/40 text-xs mt-12 mb-4">4-4-4 呼吸法</Text>

            <TouchableOpacity
              onPress={() => setPhase('goodnight')}
              className="bg-indigo-500/20 rounded-full px-8 py-3 border border-indigo-400/20"
            >
              <Text className="text-indigo-300/80 text-sm">结束练习</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      case 'goodnight':
        return (
          <Animated.View className="flex-1 items-center justify-center px-8" style={{ opacity: fadeAnim }}>
            <View className="w-16 h-16 rounded-full bg-indigo-500/20 items-center justify-center mb-6">
              <FontAwesome6 name="star" size={28} color="#a5b4fc" />
            </View>
            <Text className="text-indigo-100 text-2xl font-light mb-3">晚安</Text>
            <Text className="text-indigo-200/70 text-base text-center leading-7 mb-8">
              明天的你，会是最好的你。{'\n'}放下手机，好好休息。
            </Text>

            {/* Tomorrow checklist */}
            <View className="bg-indigo-500/15 rounded-2xl p-5 w-full border border-indigo-400/20">
              <Text className="text-indigo-300/70 text-xs mb-3 uppercase tracking-wider">明天要做的事</Text>
              <View className="gap-3">
                {[
                  { icon: 'id-card', text: '检查准考证和文具' },
                  { icon: 'clock', text: '提前到达考场' },
                  { icon: 'heart', text: '相信自己' },
                ].map((item, i) => (
                  <View key={i} className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-indigo-500/20 items-center justify-center">
                      <FontAwesome6 name={item.icon as any} size={12} color="#a5b4fc" />
                    </View>
                    <Text className="text-indigo-200 text-sm">{item.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setPhase('intro')}
              className="mt-8 py-3 px-6"
            >
              <Text className="text-indigo-400/60 text-sm">重新开始</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <Screen>
      <View className="flex-1" style={{ backgroundColor: '#0f0d2e' }}>
        <StarryBackground />
        {/* Gradient overlay */}
        <View
          className="absolute inset-0"
          style={{
            backgroundColor: 'rgba(15, 13, 46, 0.3)',
          }}
        />
        {renderPhase()}
      </View>
    </Screen>
  );
}
