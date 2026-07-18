import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { student, portrait, refreshProfile } = useAuth();
  const router = useSafeRouter();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  useFocusEffect(
    () => {
      if (!student) return;
      const studentId = student.id;
      fetch(`${BASE_URL}/api/v1/student/${studentId}/profile`)
        .then(r => r.json())
        .then(() => refreshProfile())
        .catch(console.error);
      fetch(`${BASE_URL}/api/v1/student/${studentId}/practice-sessions?limit=5`)
        .then(r => r.json())
        .then(data => {
          if (data.sessions) setRecentSessions(data.sessions);
        })
        .catch(console.error);
    }
  );

  if (!student) {
    return (
      <Screen>
        <View className="flex-1 bg-stone-50 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-stone-200 items-center justify-center mb-4">
            <FontAwesome6 name="user" size={32} color="#A8A29E" />
          </View>
          <Text className="text-stone-800 text-xl font-bold mb-2">未登录</Text>
          <Text className="text-stone-500 text-sm text-center mb-6">登录后开始你的雅思备考之旅</Text>
          <TouchableOpacity
            onPress={() => router.push('/login')}
            className="bg-indigo-600 px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">立即登录</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const dims = (portrait?.five_dimensions || {}) as Record<string, number>;
  const dimensions = [
    { label: '认知', score: dims.cognitive || 0, icon: 'brain' as const, color: '#4F46E5' },
    { label: '元认知', score: dims.metacognitive || 0, icon: 'lightbulb' as const, color: '#7C3AED' },
    { label: '情感', score: dims.affective || 0, icon: 'heart' as const, color: '#EC4899' },
    { label: '行为', score: dims.behavioral || 0, icon: 'chart-line' as const, color: '#059669' },
    { label: '社交', score: dims.social || 0, icon: 'users' as const, color: '#0EA5E9' },
  ];

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View className="px-6 pt-12 pb-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-stone-800 text-2xl font-bold">我的</Text>
            <TouchableOpacity
              onPress={() => {}}
              className="w-10 h-10 rounded-full bg-white items-center justify-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
            >
              <FontAwesome6 name="gear" size={16} color="#78716C" />
            </TouchableOpacity>
          </View>

          {/* User card */}
          <View className="bg-white rounded-2xl p-5 mb-6" style={{ shadowColor: '#4F46E5', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}>
            <View className="flex-row items-center mb-4">
              <View className="w-14 h-14 rounded-full bg-indigo-100 items-center justify-center mr-4">
                <FontAwesome6 name="user" size={24} color="#4F46E5" />
              </View>
              <View>
                <Text className="text-stone-800 text-lg font-bold">{student.name || '同学'}</Text>
                <Text className="text-stone-500 text-sm">{student.phone}</Text>
              </View>
            </View>
            <View className="flex-row gap-4">
              {student.target_band && (
                <View className="flex-1 bg-indigo-50 rounded-xl p-3 items-center">
                  <Text className="text-indigo-600 text-lg font-bold">{student.target_band}</Text>
                  <Text className="text-indigo-400 text-xs">目标分数</Text>
                </View>
              )}
              <View className="flex-1 bg-emerald-50 rounded-xl p-3 items-center">
                <Text className="text-emerald-600 text-lg font-bold">{recentSessions.length}</Text>
                <Text className="text-emerald-400 text-xs">练习次数</Text>
              </View>
            </View>
          </View>

          {/* Five dimensions */}
          <Text className="text-stone-800 font-bold text-base mb-3">五维画像</Text>
          <View className="bg-white rounded-2xl p-5 mb-6" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
            {dimensions.map((dim) => (
              <View key={dim.label} className="flex-row items-center mb-3 last:mb-0">
                <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: dim.color + '15' }}>
                  <FontAwesome6 name={dim.icon} size={14} color={dim.color} />
                </View>
                <Text className="text-stone-700 text-sm w-16">{dim.label}</Text>
                <View className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden mx-3">
                  <View className="h-full rounded-full" style={{ width: `${dim.score}%`, backgroundColor: dim.color }} />
                </View>
                <Text className="text-stone-500 text-xs w-8 text-right">{dim.score}</Text>
              </View>
            ))}
          </View>

          {/* Quick actions */}
          <Text className="text-stone-800 font-bold text-base mb-3">快捷入口</Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            {[
              { label: '知识图谱', icon: 'map' as const, color: '#059669', route: '/(tabs)/knowledge' },
              { label: '提醒设置', icon: 'bell' as const, color: '#D97706', route: '' },
              { label: '考前夜模式', icon: 'moon' as const, color: '#7C3AED', route: '/night' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => router.push(item.route as any)}
                className="bg-white rounded-xl p-4 items-center"
                style={{ width: '30%', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mb-2" style={{ backgroundColor: item.color + '15' }}>
                  <FontAwesome6 name={item.icon} size={16} color={item.color} />
                </View>
                <Text className="text-stone-700 text-xs font-medium">{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <>
              <Text className="text-stone-800 font-bold text-base mb-3">最近练习</Text>
              <View className="bg-white rounded-2xl p-4 mb-6" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                {recentSessions.slice(0, 3).map((session: any, idx: number) => (
                  <View key={session.id || idx} className={`flex-row items-center py-3 ${idx > 0 ? 'border-t border-stone-100' : ''}`}>
                    <View className="w-8 h-8 rounded-lg bg-indigo-50 items-center justify-center mr-3">
                      <FontAwesome6 name="pen" size={12} color="#4F46E5" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-stone-700 text-sm font-medium" numberOfLines={1}>
                        {session.task_title || '写作练习'}
                      </Text>
                      <Text className="text-stone-400 text-xs">
                        {new Date(session.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className={`px-2 py-1 rounded-full ${session.status === 'completed' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      <Text className={`text-xs ${session.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {session.status === 'completed' ? '已完成' : '进行中'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
