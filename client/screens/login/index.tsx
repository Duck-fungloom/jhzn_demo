import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useSafeRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = useCallback(async (p: string, n?: string) => {
    setLoading(true);
    try {
      await login(p, n);
      // After login, check if onboarded - navigate accordingly
      // The AuthContext will have the student data now
      router.replace('/onboarding');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }, [router, login]);

  const handleLogin = useCallback(() => {
    if (!phone.trim()) return;
    doLogin(phone.trim(), name.trim() || undefined);
  }, [phone, name, doLogin]);

  const handleQuickStart = useCallback(() => {
    doLogin('13800000001', 'Demo Student');
  }, [doLogin]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <FontAwesome6 name="brain" size={36} color="#fff" />
          </View>
          <Text style={styles.appName}>认知伙伴</Text>
          <Text style={styles.subtitle}>你的雅思 AI 学习伙伴</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>手机号</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入手机号"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>昵称 (选填)</Text>
            <TextInput
              style={styles.input}
              placeholder="给自己取个名字"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, (!phone.trim() || loading) && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={!phone.trim() || loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? '登录中...' : '开始学习'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickStartButton} onPress={handleQuickStart} disabled={loading}>
            <FontAwesome6 name="bolt" size={16} color="#6366f1" />
            <Text style={styles.quickStartText}>Demo 快速体验</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#78716C',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#44403C',
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1C1917',
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  loginButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  quickStartText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
});
