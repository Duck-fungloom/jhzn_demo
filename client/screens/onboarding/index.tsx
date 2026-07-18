import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome6 } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function OnboardingScreen() {
  const router = useSafeRouter();
  const [step, setStep] = useState(0);
  const [targetBand, setTargetBand] = useState('7.0');
  const [examDate, setExamDate] = useState('');
  const [noExamPlan, setNoExamPlan] = useState(false);
  const [essay, setEssay] = useState('');

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
    } else {
      await AsyncStorage.setItem('onboarded', 'true');
      const userId = await AsyncStorage.getItem('user_id');
      if (userId) {
        await fetch(`${API_BASE}/api/v1/student/${userId}/onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_band: parseFloat(targetBand), exam_date: examDate || null }),
        });
      }
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.progressRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.coachBubble}>
              <FontAwesome6 name="user-tie" size={24} color="#6366f1" />
              <Text style={styles.coachText}>
                {'\u4F60\u597D\uFF01\u5728\u5F00\u59CB\u4E4B\u524D\uFF0C\u5148\u4E86\u89E3\u4E00\u4E0B\u4F60\u7684\u76EE\u6807\u548C\u8D77\u70B9\u3002'}
              </Text>
            </View>

            <Text style={styles.label}>{'\u4F60\u7684\u76EE\u6807\u5206\u6570'}</Text>
            <View style={styles.bandRow}>
              {['6.0', '6.5', '7.0', '7.5+'].map(band => (
                <TouchableOpacity
                  key={band}
                  style={[styles.bandButton, targetBand === band && styles.bandButtonActive]}
                  onPress={() => setTargetBand(band.replace('+', ''))}
                >
                  <Text style={[styles.bandText, targetBand === band && styles.bandTextActive]}>{band}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 24 }]}>{'\u8003\u8BD5\u65E5\u671F'}</Text>
            <TouchableOpacity
              style={[styles.dateButton, noExamPlan && styles.dateButtonDisabled]}
              onPress={() => setNoExamPlan(!noExamPlan)}
            >
              <Text style={styles.dateText}>{noExamPlan ? '\u6682\u65E0\u8003\u8BD5\u8BA1\u5212' : '\u9009\u62E9\u65E5\u671F'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>{'\u4E0B\u4E00\u6B65'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>{'\u8DF3\u8FC7\uFF0C\u76F4\u63A5\u505A\u8BCA\u65AD'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.coachBubble}>
              <FontAwesome6 name="user-tie" size={24} color="#6366f1" />
              <Text style={styles.coachText}>
                {'\u6700\u540E\u4E00\u6B65\u2014\u2014\u82B1 15 \u5206\u949F\u5199\u4E00\u7BC7\u7B80\u77ED\u4F5C\u6587\u3002\u8FD9\u4E0D\u662F\u8003\u8BD5\uFF0C\u662F\u5E2E\u6211\u4EEC\u77E5\u9053\u4F60\u7684\u8D77\u70B9\u3002'}
              </Text>
            </View>

            <View style={styles.essayPrompt}>
              <Text style={styles.essayPromptTitle}>{'Writing Task 2'}</Text>
              <Text style={styles.essayPromptText}>
                {'"Some people believe that technology has made our lives more complex. To what extent do you agree or disagree?"'}
              </Text>
            </View>

            <TextInput
              style={styles.essayInput}
              placeholder={'\u5F00\u59CB\u5199\u5427\uFF0C\u4E0D\u7528\u6709\u538B\u529B...'}
              placeholderTextColor="#A8A29E"
              multiline
              value={essay}
              onChangeText={setEssay}
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>{'\u63D0\u4EA4\u5E76\u7EE7\u7EED'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip}>
              <Text style={styles.skipText}>{'\u7A0D\u540E\u518D\u5199'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.completeContainer}>
              <View style={styles.completeIcon}>
                <FontAwesome6 name="map" size={40} color="#6366f1" />
              </View>
              <Text style={styles.completeTitle}>{'\u4F60\u7684\u4E13\u5C5E\u5B66\u4E60\u5730\u56FE\u5DF2\u5C31\u7EEA'}</Text>
              <Text style={styles.completeText}>
                {'\u6211\u4EEC\u5DF2\u7ECF\u5206\u6790\u4E86\u4F60\u7684\u8D77\u70B9\uFF0C\u53D1\u73B0TR\uFF08\u4EFB\u52A1\u54CD\u5E94\uFF09\u662F\u4F60\u6700\u5BB9\u6613\u63D0\u5206\u7684\u7EF4\u5EA6\u3002'}
              </Text>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextText}>{'\u8FDB\u5165\u9996\u9875'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5F2' },
  content: { padding: 24, paddingTop: 40 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e7e5e4' },
  progressDotActive: { backgroundColor: '#6366f1', width: 24 },
  stepContainer: { flex: 1 },
  coachBubble: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  coachText: { flex: 1, fontSize: 15, color: '#44403C', lineHeight: 22, marginLeft: 12 },
  label: { fontSize: 15, fontWeight: '600', color: '#1C1917', marginBottom: 10 },
  bandRow: { flexDirection: 'row', gap: 10 },
  bandButton: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1.5, borderColor: '#e7e5e4' },
  bandButtonActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  bandText: { fontSize: 16, fontWeight: '600', color: '#44403C' },
  bandTextActive: { color: '#fff' },
  dateButton: { paddingVertical: 14, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1.5, borderColor: '#e7e5e4' },
  dateButtonDisabled: { backgroundColor: '#FAFAF9' },
  dateText: { fontSize: 15, color: '#78716C' },
  nextButton: { backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipText: { color: '#A8A29E', fontSize: 14, textAlign: 'center', marginTop: 12 },
  essayPrompt: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#6366f1' },
  essayPromptTitle: { fontSize: 13, fontWeight: '600', color: '#6366f1', marginBottom: 8 },
  essayPromptText: { fontSize: 14, color: '#44403C', lineHeight: 21, fontStyle: 'italic' },
  essayInput: { backgroundColor: '#fff', borderRadius: 16, padding: 16, minHeight: 160, fontSize: 15, color: '#1C1917', lineHeight: 22 },
  completeContainer: { alignItems: 'center', paddingTop: 40 },
  completeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  completeTitle: { fontSize: 22, fontWeight: '700', color: '#1C1917', marginBottom: 12 },
  completeText: { fontSize: 15, color: '#78716C', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
});
