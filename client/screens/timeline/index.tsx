import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome6 } from '@expo/vector-icons';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

const MOMENT_ORDER = [
  'entry_confusion', 'first_mock_shock', 'knowledge_isolation',
  'practice_plateau', 'output_helplessness', 'pre_exam_panic',
  'exam_eve_insomnia', 'score_waiting',
];

const MOMENT_CONFIG: Record<string, { icon: any; title: string; desc: string; color: string }> = {
  entry_confusion: { icon: 'compass', title: '\u5165\u95E8\u8FF7\u832B\u671F', desc: '"\u6253\u5F00\u5C0F\u7EA2\u4E66\uFF0C2000\u7BC7\u7ECF\u9A8C\u8D34\u6251\u9762\u800C\u6765"', color: '#f59e0b' },
  first_mock_shock: { icon: 'chart-line', title: '\u9996\u6B21\u6A21\u8003\u6253\u51FB', desc: '"\u5DEE1.5\u5206\uFF0C\u6211\u662F\u4E0D\u662F\u6839\u672C\u8003\u4E0D\u4E0A\uFF1F"', color: '#ef4444' },
  knowledge_isolation: { icon: 'puzzle-piece', title: '\u77E5\u8BC6\u70B9\u5B64\u5C9B\u671F', desc: '"\u5B66\u4E86\u5F88\u591A\uFF0C\u4F46\u611F\u89C9\u90FD\u662F\u788E\u7247"', color: '#8b5cf6' },
  practice_plateau: { icon: 'arrow-trend-down', title: '\u5237\u9898\u74F6\u9888\u671F', desc: '"\u5206\u6570\u50CF\u710A\u6B7B\u4E86\u4E00\u6837"', color: '#3b82f6' },
  output_helplessness: { icon: 'comment-slash', title: '\u8F93\u51FA\u65E0\u52A9\u671F', desc: '"\u5199\u4E86\u4F46\u4E0D\u77E5\u9053\u597D\u4E0D\u597D"', color: '#06b6d4' },
  pre_exam_panic: { icon: 'exclamation-triangle', title: '\u8003\u524D\u6050\u614C\u671F', desc: '"\u8FD8\u670914\u5929\uFF0C\u6211\u4EC0\u4E48\u90FD\u8FD8\u6CA1\u51C6\u5907\u597D"', color: '#f97316' },
  exam_eve_insomnia: { icon: 'moon', title: '\u8003\u524D\u5931\u7720\u591C', desc: '"\u660E\u5929\u5C31\u8003\u4E86\uFF0C\u7761\u4E0D\u7740..."', color: '#6366f1' },
  score_waiting: { icon: 'hourglass-half', title: '\u51FA\u5206\u7B49\u5F85\u671F', desc: '"\u6210\u7EE9\u4EC0\u4E48\u65F6\u5019\u51FA\uFF1F"', color: '#64748b' },
};

interface MomentData {
  id: string;
  status: 'completed' | 'current' | 'next' | 'locked';
  progress?: number;
  progressMax?: number;
  reviewText?: string;
}

export default function TimelineScreen() {
  const router = useSafeRouter();
  const [userId, setUserId] = useState('student-001');
  const [moments, setMoments] = useState<MomentData[]>([]);
  const [currentMoment, setCurrentMoment] = useState('entry_confusion');
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');

  const loadTimeline = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/student/${userId}/timeline`);
      const data = await res.json();
      if (data.current_moment) {
        setCurrentMoment(data.current_moment);
        setMoments(data.moments || []);
      }
    } catch (err) {
      console.error('Load timeline error:', err);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => {
    loadTimeline();
  }, [loadTimeline]));

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(id => { if (id) setUserId(id); });
    AsyncStorage.getItem('user_name').then(n => { if (n) setUserName(n); });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTimeline();
    setRefreshing(false);
  }, [loadTimeline]);

  const getMomentStatus = (momentId: string): MomentData['status'] => {
    const found = moments.find(m => m.id === momentId);
    if (found?.status) return found.status;
    if (momentId === currentMoment) return 'current';
    const currentIdx = MOMENT_ORDER.indexOf(currentMoment);
    const momentIdx = MOMENT_ORDER.indexOf(momentId);
    if (momentIdx === currentIdx + 1) return 'next';
    return 'locked';
  };

  const handleMomentPress = (momentId: string) => {
    const status = getMomentStatus(momentId);
    if (status === 'locked') return;
    router.push(`/moment/${momentId}`);
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{'\u4F60\u7684\u96C5\u601D\u4E4B\u8DEF'}</Text>
          {userName ? <Text style={styles.headerName}>{userName}{'\uFF0C\u7EE7\u7EED\u52A0\u6CB9'}</Text> : null}
        </View>

        {MOMENT_ORDER.map((momentId, index) => {
          const config = MOMENT_CONFIG[momentId];
          const status = getMomentStatus(momentId);
          const isLast = index === MOMENT_ORDER.length - 1;

          return (
            <View key={momentId} style={styles.momentWrapper}>
              <TouchableOpacity
                style={[
                  styles.momentCard,
                  status === 'current' && styles.currentCard,
                  status === 'completed' && styles.completedCard,
                  status === 'locked' && styles.lockedCard,
                  status === 'next' && styles.nextCard,
                ]}
                onPress={() => handleMomentPress(momentId)}
                activeOpacity={status === 'locked' ? 1 : 0.7}
              >
                {status === 'current' && (
                  <View style={styles.currentBadge}>
                    <FontAwesome6 name="location-dot" size={10} color="#6366f1" />
                    <Text style={styles.currentBadgeText}>{'\u4F60\u5728\u8FD9\u91CC'}</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: status === 'locked' ? '#F5F5F4' : `${config.color}15` }]}>
                    <FontAwesome6
                      name={config.icon}
                      size={20}
                      color={status === 'locked' ? '#d1d5db' : config.color}
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <View style={styles.cardTitleRow}>
                      <Text style={[styles.cardTitle, status === 'locked' && styles.lockedText]}>
                        {config.title}
                      </Text>
                      {status === 'completed' && <FontAwesome6 name="circle-check" size={20} color="#10b981" />}
                      {status === 'locked' && <FontAwesome6 name="lock" size={16} color="#d1d5db" />}
                    </View>
                    <Text style={[styles.cardDesc, status === 'locked' && styles.lockedText]}>
                      {config.desc}
                    </Text>
                  </View>
                </View>

                {status === 'locked' && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: '30%' }]} />
                    </View>
                    <Text style={styles.progressText}>{'\u89E3\u9501\u6761\u4EF6\u672A\u6EE1\u8DB3'}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {!isLast && (
                <View style={styles.connector}>
                  <View style={[styles.connectorLine, status === 'completed' && styles.completedConnector]} />
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.teacherButton}
            onPress={() => router.push('/teacher')}
          >
            <FontAwesome6 name="chalkboard-user" size={16} color="#6366f1" />
            <Text style={styles.teacherButtonText}>{'\u6559\u5E08\u7AEF\u4EEA\u8868\u76D8'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F5F2' },
  content: { padding: 20, paddingTop: 16 },
  header: { marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1C1917', letterSpacing: -0.5 },
  headerName: { fontSize: 15, color: '#78716C', marginTop: 4 },
  momentWrapper: { alignItems: 'center' },
  momentCard: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  currentCard: {
    borderWidth: 2, borderColor: '#6366f1',
    shadowColor: '#6366f1', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  completedCard: { opacity: 0.85 },
  lockedCard: { backgroundColor: '#FAFAF9' },
  nextCard: { borderWidth: 1, borderColor: '#e7e5e4', borderStyle: 'dashed' },
  currentBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 10,
  },
  currentBadgeText: { fontSize: 11, color: '#6366f1', fontWeight: '600', marginLeft: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1C1917' },
  cardDesc: { fontSize: 13, color: '#78716C', marginTop: 4 },
  lockedText: { color: '#A8A29E' },
  progressContainer: { marginTop: 12 },
  progressBar: { height: 4, backgroundColor: '#F5F5F4', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#d1d5db', borderRadius: 2 },
  progressText: { fontSize: 11, color: '#A8A29E', marginTop: 6 },
  connector: { height: 24, alignItems: 'center' },
  connectorLine: { width: 2, height: '100%', backgroundColor: '#e7e5e4' },
  completedConnector: { backgroundColor: '#10b981' },
  footer: { marginTop: 24, alignItems: 'center', paddingBottom: 20 },
  teacherButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 14, backgroundColor: '#EEF2FF',
  },
  teacherButtonText: { fontSize: 14, color: '#6366f1', fontWeight: '600', marginLeft: 8 },
});
