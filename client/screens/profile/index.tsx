import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

const DIMENSIONS = [
  { name: '认知', value: 65, angle: -90 },
  { name: '元认知', value: 45, angle: -18 },
  { name: '行为', value: 72, angle: 54 },
  { name: '知识', value: 58, angle: 126 },
  { name: '情感', value: 38, angle: 198 },
];

const METRICS = [
  { label: 'Band 分数', from: '5', to: '6.5', color: '#3B82F6', trend: 'up' },
  { label: '支架依赖', from: '2.1', to: '1.4', color: '#8B5CF6', trend: 'down' },
  { label: '表达信心', from: '45', to: '58', color: '#10B981', trend: 'up' },
];

const ANXIETY_DATA = [
  { label: '模考', value: 82 },
  { label: 'W3', value: 68 },
  { label: '瓶颈期', value: 75 },
  { label: 'W5', value: 55 },
  { label: 'W6', value: 62 },
  { label: '考前', value: 70 },
  { label: 'W8', value: 48 },
];

function RadarChart() {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const levels = 5;

  const getPoint = (angle: number, ratio: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + maxR * ratio * Math.cos(rad), y: cy + maxR * ratio * Math.sin(rad) };
  };

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }}>
        {/* Grid levels */}
        {Array.from({ length: levels }, (_, i) => {
          const r = ((i + 1) / levels) * maxR;
          const points = DIMENSIONS.map(d => getPoint(d.angle, (i + 1) / levels));
          const pathD = points.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
          return <View key={i} style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }}
            className="opacity-10">
            <View style={{ width: size, height: size }} className="bg-blue-200 rounded-full opacity-20" />
          </View>;
        })}

        {/* Axes */}
        {DIMENSIONS.map((d, i) => {
          const end = getPoint(d.angle, 1);
          return <View key={i} style={{
            position: 'absolute', top: cy, left: cx,
            width: Math.abs(end.x - cx), height: 1,
            backgroundColor: '#E5E7EB',
            transform: [{ rotate: `${d.angle}deg` }],
          }} />;
        })}

        {/* Data polygon */}
        {(() => {
          const points = DIMENSIONS.map(d => getPoint(d.angle, d.value / 100));
          return <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }}>
            <View style={{
              position: 'absolute',
              width: size, height: size,
              backgroundColor: 'rgba(59,130,246,0.1)',
              borderRadius: 4,
            }} />
          </View>;
        })()}

        {/* Labels */}
        {DIMENSIONS.map((d, i) => {
          const labelPos = getPoint(d.angle, 1.25);
          return <Text key={i} className="absolute text-xs text-stone-500"
            style={{
              left: labelPos.x - 20, top: labelPos.y - 8,
              width: 40, textAlign: 'center',
            }}>
            {d.name} {d.value}%
          </Text>;
        })}
      </View>
    </View>
  );
}

function MiniLineChart({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const width = 80;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 8) - 4,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <View style={{ width, height }}>
      <View style={{ position: 'absolute', top: 0, left: 0, width, height }}>
        <View style={{
          position: 'absolute', top: 0, left: 0, width, height,
          backgroundColor: color + '10', borderRadius: 4,
        }} />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useSafeRouter();
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/profile`);
      const data = await res.json();
      if (data.success) setProfile(data.data);
    } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-blue-600 px-6 pt-14 pb-8">
          <Text className="text-white font-bold text-2xl mb-4">我的</Text>
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-blue-500 items-center justify-center">
              <FontAwesome6 name="user" size={28} color="#fff" />
            </View>
            <View>
              <Text className="text-white font-bold text-xl">{profile?.name || '李同学'}</Text>
              <Text className="text-blue-200 text-sm mt-0.5">备考雅思 · 第 8 周</Text>
              <View className="flex-row gap-2 mt-2">
                <View className="bg-blue-500 rounded-full px-3 py-1">
                  <Text className="text-white text-xs">目标 Band 7</Text>
                </View>
                <View className="bg-blue-500 rounded-full px-3 py-1">
                  <Text className="text-white text-xs">当前 6.5</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Radar */}
        <View className="mx-6 -mt-4 bg-white rounded-2xl p-5"
          style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
          <Text className="text-stone-900 font-bold text-base mb-4">五维学习画像</Text>
          <RadarChart />
        </View>

        {/* Metrics */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5"
          style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
          <Text className="text-stone-900 font-bold text-base mb-4">可观测指标</Text>
          <View className="flex-row gap-3">
            {METRICS.map(m => (
              <View key={m.label} className="flex-1 bg-stone-50 rounded-xl p-3">
                <Text className="text-stone-500 text-xs mb-2">{m.label}</Text>
                <View className="h-10 items-center justify-center">
                  <View style={{ width: 60, height: 2, backgroundColor: m.color, transform: [{ rotate: m.trend === 'up' ? '-20deg' : '20deg' }] }} />
                </View>
                <Text className="text-center font-bold text-sm mt-1" style={{ color: m.color }}>
                  {m.from} → {m.to}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Anxiety curve */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5"
          style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
          <Text className="text-stone-900 font-bold text-base mb-4">焦虑曲线</Text>
          <View className="h-32">
            {/* Reference lines */}
            <View className="absolute left-0 right-0" style={{ top: 12 }}>
              <View className="h-px bg-red-300 opacity-50" />
            </View>
            <View className="absolute left-0 right-0" style={{ top: 50 }}>
              <View className="h-px bg-amber-300 opacity-50" />
            </View>

            {/* Data points */}
            <View className="flex-row items-end justify-between h-full px-2">
              {ANXIETY_DATA.map((d, i) => (
                <View key={i} className="items-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mb-1" />
                  <Text className="text-stone-400 text-[10px]">{d.label}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className="flex-row gap-4 mt-3">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <Text className="text-stone-500 text-xs">高焦虑 &gt;80</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <Text className="text-stone-500 text-xs">中焦虑 50-80</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <Text className="text-stone-900 font-bold text-base px-6 mt-6 mb-3">设置</Text>
        <View className="mx-6 mb-8 bg-white rounded-2xl overflow-hidden"
          style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
          {[
            { icon: 'moon', label: '考前夜模式', badge: '今晚可用', badgeColor: '#8B5CF6', route: '/night' as const },
            { icon: 'bell', label: '提醒设置', route: '/settings' as const },
            { icon: 'clipboard-list', label: '备考承诺', route: null },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              className={`px-5 py-4 flex-row items-center ${i > 0 ? 'border-t border-stone-100' : ''}`}
              onPress={() => item.route && router.push(item.route)}
            >
              <FontAwesome6 name={item.icon as any} size={18} color="#6B7280" />
              <Text className="text-stone-700 text-sm ml-3 flex-1">{item.label}</Text>
              {item.badge && (
                <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: item.badgeColor + '15' }}>
                  <Text className="text-xs" style={{ color: item.badgeColor }}>{item.badge}</Text>
                </View>
              )}
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
