import { useEffect } from 'react';
import { Stack, useSegments } from 'expo-router';
import { useColorScheme, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from '@/components/Provider';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import '../global.css';

function AuthRedirect() {
  const { student, isLoading } = useAuth();
  const router = useSafeRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inLogin = segments.includes('login');

    if (!student && !inLogin) {
      router.replace('/login');
    }
  }, [student, isLoading, segments, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.className = colorScheme === 'dark' ? 'dark' : 'light';
    }
  }, [colorScheme]);

  return (
    <SafeAreaProvider>
      <Provider>
        <AuthRedirect />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="diagnosis" />
        <Stack.Screen name="commitment" />
        <Stack.Screen name="progress" />
          <Stack.Screen name="night" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="comparison" />
          <Stack.Screen name="writing" />
        </Stack>
      </Provider>
    </SafeAreaProvider>
  );
}
