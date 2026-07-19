import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

const RECOMMENDED = [
  {
    id: '1', tag: 'TR', title: 'Task Response 专项', subtitle: 'K3 论点展开深度',
    desc: '针对你的薄弱点：论点展开度 0.31 → 目标 0.5',
    mastery: 0.31, target: 0.5, time: '15 分钟', difficulty: '中等',
    badge: '推荐', badgeColor: '#3B82F6', color: '#3B82F6', bg: '#EFF6FF',
  },
  {
    id: '2', tag: 'CC', title: 'Coherence & Cohesion', subtitle: '段落连接词使用',
    desc: '提升文章逻辑衔接，从 Band 5.5 → 6.0',
    mastery: 0.55, target: 0.7, time: '20 分钟', difficulty: '较难',
    badge: '新', badgeColor: '#8B5CF6', color: '#8B5CF6', bg: '#F5F3FF',
  },
  {
    id: '3', tag: 'LR', title: 'Lexical Resource', subtitle: '学术词汇替换',
    desc: '巩固已学词汇，防止遗忘',
    mastery: 0.72, target: 0.85, time: '10 分钟', difficulty: '简单',
    badge: '复习', badgeColor: '#10B981', color: '#10B981', bg: '#ECFDF5',
  },
];

const HISTORY = [
  { id: '1', tag: 'TR', date: '7月17日', title: '写作练习', band: '5.5', color: '#10B981' },
  { id: '2', tag: 'GR', date: '7月15日', title: '写作练习', band: '6.0', color: '#10B981' },
];

export default function PracticeScreen() {
  const router = useSafeRouter();

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-12 pb-4 flex-row items-center justify-between">
          <Text className="text-stone-900 font-bold text-xl">今日练习</Text>
          <Text className="text-stone-400 text-sm">7月18日</Text>
        </View>

        {/* Stats */}
        <View className="px-6 mb-6 flex-row gap-3">
          {[
            { value: '1', unit: '次', label: '已完成', color: '#10B981' },
            { value: '7', unit: '天', label: '连续打卡', color: '#F59E0B' },
            { value: '4', unit: '篇', label: '本周练习', color: '#3B82F6' },
          ].map(s => (
            <View key={s.label} className="flex-1 bg-white rounded-2xl p-4 items-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
              <Text className="font-bold text-2xl" style={{ color: s.color }}>{s.value}</Text>
              <Text className="text-stone-400 text-xs">{s.unit} {s.label}</Text>
            </View>
          ))}
        </View>

        {/* Recommended */}
        <Text className="text-stone-900 font-bold text-base px-6 mb-3">推荐练习</Text>
        <View className="px-6 gap-3 mb-6">
          {RECOMMENDED.map(item => (
            <TouchableOpacity
              key={item.id}
              className="bg-white rounded-2xl p-5"
              style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}
              onPress={() => router.push('/writing', { id: item.id })}
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: item.bg }}>
                    <Text className="font-bold text-sm" style={{ color: item.color }}>{item.tag}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-stone-900 font-bold text-base">{item.title}</Text>
                    <Text className="text-stone-400 text-xs">{item.subtitle}</Text>
                  </View>
                </View>
                <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: item.badgeColor + '15' }}>
                  <Text className="text-xs font-medium" style={{ color: item.badgeColor }}>{item.badge}</Text>
                </View>
              </View>

              <Text className="text-stone-600 text-sm mb-3">{item.desc}</Text>

              <View className="mb-3">
                <View className="flex-row justify-between mb-1">
                  <Text className="text-stone-500 text-xs">当前掌握度</Text>
                  <Text className="text-stone-500 text-xs">{item.mastery} → 目标 {item.target}</Text>
                </View>
                <View className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <View className="h-full rounded-full" style={{ width: `${item.mastery * 100}%`, backgroundColor: item.color }} />
                </View>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <FontAwesome6 name="clock" size={12} color="#9CA3AF" />
                    <Text className="text-stone-400 text-xs">{item.time}</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <FontAwesome6 name="bullseye" size={12} color="#9CA3AF" />
                    <Text className="text-stone-400 text-xs">{item.difficulty}</Text>
                  </View>
                </View>
                <TouchableOpacity className="bg-blue-600 rounded-xl px-4 py-2 flex-row items-center gap-1.5"
                  onPress={() => router.push('/writing', { id: item.id })}>
                  <FontAwesome6 name="bolt" size={12} color="#fff" />
                  <Text className="text-white text-xs font-medium">开始</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* History */}
        <Text className="text-stone-900 font-bold text-base px-6 mb-3">历史练习</Text>
        <View className="px-6 pb-8 gap-2">
          {HISTORY.map(item => (
            <TouchableOpacity
              key={item.id}
              className="bg-white rounded-2xl px-5 py-4 flex-row items-center"
              style={{ shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 }}
            >
              <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
                <Text className="font-bold text-xs text-blue-600">{item.tag}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-stone-700 text-sm">{item.date} · {item.title}</Text>
                <Text className="font-bold text-sm" style={{ color: item.color }}>Band {item.band}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
