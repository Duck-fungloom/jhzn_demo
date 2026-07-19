import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useSafeRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const isPhoneValid = phone.length === 11;
  const isCodeValid = code.length === 6;
  const canLogin = isPhoneValid && (codeSent ? isCodeValid : true);

  const handleSendCode = useCallback(() => {
    if (!isPhoneValid) return;
    setCodeSent(true);
    setShowCodeInput(true);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [isPhoneValid]);

  const doLogin = useCallback(async () => {
    setLoading(true);
    try {
      await login(phone);
      router.replace('/onboarding');
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  }, [router, login, phone]);

  const handleQuickStart = useCallback(() => {
    login('13800138001').then(() => {
      router.replace('/onboarding');
    }).catch((e) => console.warn("Login error:", e));
  }, [router, login]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <FontAwesome6 name="brain" size={32} color="#fff" />
          </View>
          <Text style={styles.appName}>认知伙伴</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Phone input with +86 */}
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <FontAwesome6 name="mobile-screen" size={16} color="#6B7280" />
              <Text style={styles.countryNum}>+86</Text>
              <FontAwesome6 name="chevron-down" size={12} color="#9CA3AF" />
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="输入手机号"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/D/g, ''))}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          {/* Verification code button */}
          <TouchableOpacity
            style={[styles.codeButton, !isPhoneValid && styles.codeButtonDisabled]}
            onPress={handleSendCode}
            disabled={!isPhoneValid || countdown > 0}
          >
            <Text style={[styles.codeButtonText, (!isPhoneValid || countdown > 0) && styles.codeButtonTextDisabled]}>
              {countdown > 0 ? `${countdown}s 后重新获取` : '获取验证码'}
            </Text>
          </TouchableOpacity>

          {/* Code input (animated expand) */}
          {showCodeInput && (
            <View style={styles.codeInputRow}>
              <TextInput
                style={styles.codeInput}
                placeholder="输入验证码"
                placeholderTextColor="#9CA3AF"
                value={code}
                onChangeText={(t) => setCode(t.replace(/D/g, ''))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          )}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginButton, !canLogin && styles.loginButtonDisabled]}
            onPress={doLogin}
            disabled={!canLogin || loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? '登录中...' : '登录 / 注册'}
            </Text>
          </TouchableOpacity>

          {/* Demo skip */}
          <TouchableOpacity style={styles.demoLink} onPress={handleQuickStart}>
            <Text style={styles.demoText}>体验 Demo（跳过登录）→</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>或</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social login */}
          <TouchableOpacity style={styles.socialButton}>
            <FontAwesome6 name="comment-dots" size={20} color="#07C160" />
            <Text style={styles.socialText}>微信登录</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <FontAwesome6 name="apple" size={20} color="#000" />
            <Text style={styles.socialText}>Apple ID 登录</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    gap: 16,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    overflow: 'hidden',
    height: 52,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    height: '100%',
  },
  countryText: {
    fontSize: 16,
  },
  countryNum: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  codeButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeButtonDisabled: {
    opacity: 0.5,
  },
  codeButtonText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  codeButtonTextDisabled: {
    color: '#9CA3AF',
  },
  codeInputRow: {
    height: 52,
  },
  codeInput: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 8,
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  demoLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#9CA3AF',
  },
  socialButton: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialIcon: {
    fontSize: 20,
  },
  socialText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
});
