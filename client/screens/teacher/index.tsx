import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

interface MomentData {
  moment: string;
  label: string;
  count: number;
  high_anxiety_count: number;
  students: Array<{ id: string; name: string; portrait_summary: string }>;
}

const momentColors: Record<string, string> = {
  entry_confusion: '#F59E0B',
  first_mock_shock: '#EF4444',
  knowledge_isolation: '#8B5CF6',
  practice_plateau: '#3B82F6',
  output_helplessness: '#EC4899',
  pre_exam_panic: '#F97316',
  exam_eve_insomnia: '#6366F1',
  score_waiting: '#10B981',
};

export default function TeacherDashboardScreen() {
  const [moments, setMoments] = useState<MomentData[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedMoment, setExpandedMoment] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/teacher/dashboard/moment-distribution`);
      const data = await response.json();
      setMoments(data.moments || []);
      setTotalStudents(data.total_students || 0);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const getRiskColor = (highAnxietyCount: number) => {
    if (highAnxietyCount >= 3) return '#EF4444';
    if (highAnxietyCount >= 1) return '#F59E0B';
    return '#10B981';
  };

  const getRiskLabel = (highAnxietyCount: number) => {
    if (highAnxietyCount >= 3) return 'high';
    if (highAnxietyCount >= 1) return 'medium';
    return 'low';
  };

  const maxCount = Math.max(...moments.map(m => m.count), 1);

  if (loading) {
    return (
      <Screen className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#6366F1" />
      </Screen>
    );
  }

  return (
    <Screen className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 px-5 pt-12 pb-6">
        <Text className="text-[28px] font-bold text-gray-900 mb-1">
          Dashboard
        </Text>
        <Text className="text-[15px] text-gray-500 mb-6">
          8 Moments Distribution - {totalStudents} students
        </Text>

        <View className="bg-white rounded-3xl p-5 mb-6" style={{ shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
          <Text className="text-[16px] font-semibold text-gray-900 mb-4">
            Student Distribution
          </Text>

          <View className="flex-row items-end h-[180px] mb-3">
            {moments.map((moment, index) => {
              const barHeight = maxCount > 0 ? (moment.count / maxCount) * 150 : 0;
              const color = momentColors[moment.moment] || '#6366F1';
              const isExpanded = expandedMoment === moment.moment;

              return (
                <TouchableOpacity
                  key={moment.moment}
                  className="flex-1 items-center mx-[3px]"
                  activeOpacity={0.7}
                  onPress={() => setExpandedMoment(isExpanded ? null : moment.moment)}
                >
                  <Text className="text-[11px] text-gray-500 mb-1 font-medium">
                    {moment.count}
                  </Text>
                  <View
                    className="w-full rounded-t-lg"
                    style={{
                      height: Math.max(barHeight, 8),
                      backgroundColor: isExpanded ? color : color + 'CC',
                      borderWidth: isExpanded ? 2 : 0,
                      borderColor: color,
                    }}
                  />
                  <Text className="text-[10px] text-gray-400 mt-1 text-center">
                    {moment.label?.charAt(0) || (index + 1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View className="flex-row justify-between px-1">
            {moments.map((moment) => {
              const color = momentColors[moment.moment] || '#6366F1';
              return (
                <View key={moment.moment} className="flex-1 items-center mx-[3px]">
                  <View
                    className="w-3 h-3 rounded-full mb-1"
                    style={{ backgroundColor: getRiskColor(moment.high_anxiety_count) }}
                  />
                </View>
              );
            })}
          </View>

          <View className="flex-row justify-center mt-4 gap-4">
            <View className="flex-row items-center gap-1">
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <Text className="text-[10px] text-gray-500">0 High Risk</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <Text className="text-[10px] text-gray-500">1-2 High Risk</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <View className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <Text className="text-[10px] text-gray-500">3+ High Risk</Text>
            </View>
          </View>
        </View>

        {expandedMoment && (() => {
          const momentData = moments.find(m => m.moment === expandedMoment);
          if (!momentData || momentData.students.length === 0) return null;

          return (
            <View className="bg-white rounded-3xl p-5 mb-4" style={{ shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
              <Text className="text-[15px] font-semibold text-gray-900 mb-3">
                {momentData.label} - {momentData.count} students
              </Text>
              {momentData.students.map((student, idx) => (
                <View key={student.id} className={`py-3 ${idx < momentData.students.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-[14px] font-medium text-gray-900">{student.name}</Text>
                      <Text className="text-[12px] text-gray-500 mt-0.5">{student.portrait_summary}</Text>
                    </View>
                    <View className="flex-row gap-2">
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: getRiskColor(momentData.high_anxiety_count) + '20' }}
                      >
                        <Text
                          className="text-[10px] font-medium"
                          style={{ color: getRiskColor(momentData.high_anxiety_count) }}
                        >
                          {getRiskLabel(momentData.high_anxiety_count)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          );
        })()}

        <View className="bg-white rounded-3xl p-5" style={{ shadowColor: '#6366F1', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3 }}>
          <Text className="text-[15px] font-semibold text-gray-900 mb-3">
            Moment Details
          </Text>
          {moments.map((moment, idx) => {
            const color = momentColors[moment.moment] || '#6366F1';
            return (
              <TouchableOpacity
                key={moment.moment}
                className={`flex-row items-center py-3 ${idx < moments.length - 1 ? 'border-b border-gray-100' : ''}`}
                activeOpacity={0.7}
                onPress={() => setExpandedMoment(expandedMoment === moment.moment ? null : moment.moment)}
              >
                <View className="w-8 h-8 rounded-full items-center justify-center mr-3" style={{ backgroundColor: color + '20' }}>
                  <FontAwesome6 name="user" size={14} color={color} />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-medium text-gray-900">{moment.label}</Text>
                  <Text className="text-[11px] text-gray-500">{moment.count} students</Text>
                </View>
                <View
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: getRiskColor(moment.high_anxiety_count) + '20' }}
                >
                  <Text
                    className="text-[10px] font-medium"
                    style={{ color: getRiskColor(moment.high_anxiety_count) }}
                  >
                    {moment.high_anxiety_count} high risk
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
