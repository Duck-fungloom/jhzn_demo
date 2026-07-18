import { useEffect, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome6 } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function SplashScreen() {
  const router = useSafeRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      const token = await AsyncStorage.getItem('auth_token');
      const onboarded = await AsyncStorage.getItem('onboarded');
      if (!token) {
        router.replace('/login');
      } else if (!onboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F5F2', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <View style={{
          width: 80, height: 80, borderRadius: 24,
          backgroundColor: '#6366f1',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}>
          <FontAwesome6 name="brain" size={40} color="#fff" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: '#1C1917', letterSpacing: 1 }}>
          {'\u8BA4\u77E5\u4F19\u4F34'}
        </Text>
        <Text style={{ fontSize: 14, color: '#78716C', marginTop: 6, letterSpacing: 0.5 }}>
          {'\u4F60\u7684\u96C5\u601DAI\u5B66\u4E60\u4F19\u4F34'}
        </Text>
      </Animated.View>
    </View>
  );
}
