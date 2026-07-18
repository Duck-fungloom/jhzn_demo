import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

const DIMENSIONS = [
  { id: 'TR', band: 5, color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'CC', band: 5.5, color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'LR', band: 6, color: '#10B981', bg: '#ECFDF5' },
  { id: 'GR', band: 5.5, color: '#F59E0B', bg: '#FFFBEB' },
];

export default function DiagnosisScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ sessionId?: string }>();

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Celebration */}
        <View className="items-center pt-16 pb-6">
          <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-4">
            <FontAwesome6 name="gift" size={36} color="#4F46E5" />
          </View>
          <Text className="text-stone-900 font-bold text-2xl">诊断完成！</Text>
          <Text className="text-stone-500 text-sm mt-2 text-center">你的专属学习地图已生成</Text>
          <Text className="text-stone-500 text-sm text-center">我们发现了你最需要提升的维度</Text>
        </View>

        {/* Dimension bars */}
        <View className="mx-6 bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
          <View className="gap-5">
            {DIMENSIONS.map(dim => (
              <View key={dim.id}>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="px-2 py-0.5 rounded" style={{ backgroundColor: dim.bg }}>
                    <Text className="font-bold text-xs" style={{ color: dim.color }}>{dim.id}</Text>
                  </View>
                  <Text className="text-stone-900 font-bold text-lg">Band {dim.band}</Text>
                </View>
                <View className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${(dim.band / 9) * 100}%`, backgroundColor: dim.color }} />
                </View>
              </View>
            ))}
          </View>

          <View className="mt-5 pt-4 border-t border-stone-100">
            <View className="flex-row items-center gap-2">
              <FontAwesome6 name="triangle-exclamation" size={14} color="#D97706" />
              <Text className="text-amber-700 text-sm">这是分项诊断，不是总分</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View className="px-6 mt-6">
          <TouchableOpacity
            className="bg-blue-600 rounded-2xl py-4 items-center"
            onPress={() => router.navigate('/')}
          >
            <Text className="text-white font-bold text-base">进入首页，开始你的雅思之路 →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
