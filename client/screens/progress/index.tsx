import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

interface Stats {
  total_sessions: number;
  total_words: number;
  total_minutes: number;
  current_streak: number;
}

interface RecentSession {
  id: string;
  task_type: string;
  status: string;
  word_count: number;
  created_at: string;
}

interface DimensionTrend {
  date: string;
  tr: number;
  cc: number;
  lr: number;
  gr: number;
}

interface WeeklyData {
  week: string;
  count: number;
  words: number;
}

interface ProgressData {
  stats: Stats;
  recent_sessions: RecentSession[];
  dimension_trend: DimensionTrend[];
  weekly_data: WeeklyData[];
}

// Dimension colors
const DIMENSION_COLORS = {
  tr: '#4F46E5',
  cc: '#10B981',
  lr: '#F59E0B',
  gr: '#EF4444',
};

const DIMENSION_LABELS: Record<string, string> = {
  tr: 'TR 写作回应',
  cc: 'CC 连贯衔接',
  lr: 'LR 词汇丰富',
  gr: 'GR 语法范围',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  opinion: '议论文',
  discussion: '讨论类',
  problem_solution: '问题解决',
  two_part: '双问题',
};

export default function ProgressScreen() {
  const { student } = useAuth();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgress = async () => {
    try {
      /**
       * 服务端文件：server/src/routes/student.ts
       * 接口：GET /api/v1/student/:id/progress
       */
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/${student?.id}/progress`
      );
      const data = await response.json();
      setProgress(data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProgress();
    }, [student?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProgress();
  };

  // Calculate max words for chart scaling
  const maxWords = progress?.weekly_data?.reduce(
    (max, item) => Math.max(max, item.words),
    100
  ) || 100;

  // Get latest dimension scores
  const latestDimensions = progress?.dimension_trend?.slice(-1)[0] || null;

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 bg-gray-50 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-4 text-gray-500">加载进度数据中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-indigo-600 px-5 pt-12 pb-16">
          <Text className="text-white text-2xl font-bold">学习进度</Text>
          <Text className="text-indigo-200 text-sm mt-1">
            追踪你的成长轨迹
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Stats Cards */}
          <View className="mx-5 -mt-10">
            <View className="flex-row flex-wrap gap-3">
              <StatCard
                icon="pen-fancy"
                label="练习次数"
                value={progress?.stats.total_sessions || 0}
                color="#4F46E5"
              />
              <StatCard
                icon="font"
                label="总字数"
                value={progress?.stats.total_words || 0}
                color="#10B981"
              />
              <StatCard
                icon="fire"
                label="连续打卡"
                value={`${progress?.stats.current_streak || 0}天`}
                color="#EF4444"
              />
            </View>
          </View>

          {/* Weekly Practice Chart */}
          <View className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center mb-4">
              <FontAwesome6 name="chart-bar" size={16} color="#4F46E5" />
              <Text className="text-base font-semibold text-gray-900 ml-2">
                每周练习趋势
              </Text>
            </View>

            {progress?.weekly_data && progress.weekly_data.length > 0 ? (
              <View>
                <View className="flex-row items-end h-32 gap-1">
                  {progress.weekly_data.map((item, index) => {
                    const height = Math.max(4, (item.words / maxWords) * 100);
                    return (
                      <View key={index} className="flex-1 items-center">
                        <View
                          className="w-full bg-indigo-100 rounded-t-sm relative"
                          style={{ height: '100%' }}
                        >
                          <View
                            className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-sm"
                            style={{ height: `${height}%` }}
                          />
                        </View>
                        <Text className="text-[9px] text-gray-400 mt-1">
                          {item.week}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <View className="flex-row justify-between mt-2 px-1">
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 bg-indigo-500 rounded-sm" />
                    <Text className="text-xs text-gray-500">字数</Text>
                  </View>
                  <Text className="text-xs text-gray-400">
                    共 {progress.stats.total_words} 字
                  </Text>
                </View>
              </View>
            ) : (
              <View className="h-32 items-center justify-center bg-gray-50 rounded-xl">
                <FontAwesome6 name="chart-bar" size={32} color="#D1D5DB" />
                <Text className="text-gray-400 text-sm mt-2">暂无数据</Text>
              </View>
            )}
          </View>

          {/* Dimension Progress */}
          {latestDimensions && (
            <View className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center mb-4">
                <FontAwesome6 name="bullseye" size={16} color="#4F46E5" />
                <Text className="text-base font-semibold text-gray-900 ml-2">
                  四维能力评估
                </Text>
              </View>

              <View className="gap-3">
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                  const value = latestDimensions[key as keyof DimensionTrend] as number;
                  const color = DIMENSION_COLORS[key as keyof typeof DIMENSION_COLORS];

                  return (
                    <View key={key}>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-sm text-gray-700">{label}</Text>
                        <Text className="text-sm font-semibold" style={{ color }}>
                          Band {value}
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (value / 9) * 100)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Recent Sessions */}
          {progress?.recent_sessions && progress.recent_sessions.length > 0 && (
            <View className="mx-5 mt-4 mb-6 bg-white rounded-2xl p-4 shadow-sm">
              <View className="flex-row items-center mb-4">
                <FontAwesome6 name="clock-rotate-left" size={16} color="#4F46E5" />
                <Text className="text-base font-semibold text-gray-900 ml-2">
                  最近练习
                </Text>
              </View>

              <View className="gap-3">
                {progress.recent_sessions.slice(0, 5).map((session) => (
                  <View
                    key={session.id}
                    className="flex-row items-center justify-between py-2 border-b border-gray-100"
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-900">
                        {TASK_TYPE_LABELS[session.task_type] || session.task_type}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-0.5">
                        {new Date(session.created_at).toLocaleDateString('zh-CN')}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-semibold text-indigo-600">
                        {session.word_count} 字
                      </Text>
                      <Text className="text-xs text-gray-400">
                        {session.status === 'submitted' ? '已提交' : session.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Achievement Badge */}
          {progress?.stats.current_streak && progress.stats.current_streak >= 3 && (
            <View className="mx-5 mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-amber-100 rounded-full items-center justify-center">
                  <FontAwesome6 name="trophy" size={20} color="#D97706" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-sm text-amber-700">连续打卡成就</Text>
                  <Text className="text-2xl font-bold text-amber-900">
                    {progress.stats.current_streak} 天
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View className="h-6" />
        </ScrollView>
      </View>
    </Screen>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof FontAwesome6.glyphMap;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <View className="flex-1 min-w-[30%] bg-white rounded-2xl p-4 shadow-sm">
      <View className="flex-row items-center mb-2">
        <View
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <FontAwesome6 name={icon} size={14} color={color} />
        </View>
      </View>
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
    </View>
  );
}
