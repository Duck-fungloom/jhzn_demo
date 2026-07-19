import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import Svg, { Polygon, Polyline, Circle, Line, Path, Text as SvgText } from 'react-native-svg';

const DIMENSIONS = [
  { name: '认知', value: 65, angle: -90 },
  { name: '元认知', value: 45, angle: -18 },
  { name: '行为', value: 72, angle: 54 },
  { name: '知识', value: 58, angle: 126 },
  { name: '情感', value: 38, angle: 198 },
];

const METRICS = [
  { label: 'Band 分数', from: '5', to: '6.5', color: '#3B82F6', trend: 'up' as const },
  { label: '支架依赖', from: '2.1', to: '1.4', color: '#8B5CF6', trend: 'down' as const },
  { label: '表达信心', from: '45', to: '58', color: '#10B981', trend: 'up' as const },
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

// SVG Radar Chart
function RadarChart() {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 85;
  const levels = 5;

  const getPoint = (angle: number, ratio: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + maxR * ratio * Math.cos(rad), y: cy + maxR * ratio * Math.sin(rad) };
  };

  // Generate grid polygon points
  const getGridPoints = (level: number) => {
    return DIMENSIONS.map(d => {
      const p = getPoint(d.angle, (level + 1) / levels);
      return `${p.x},${p.y}`;
    }).join(' ');
  };

  // Generate data polygon points
  const dataPoints = DIMENSIONS.map(d => {
    const p = getPoint(d.angle, d.value / 100);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <View className="items-center">
      <Svg width={size} height={size}>
        {/* Grid levels */}
        {Array.from({ length: levels }, (_, i) => (
          <Polygon
            key={`grid-${i}`}
            points={getGridPoints(i)}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
            opacity={0.5}
          />
        ))}

        {/* Axes */}
        {DIMENSIONS.map((d, i) => {
          const end = getPoint(d.angle, 1);
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="#E5E7EB"
              strokeWidth="1"
              opacity={0.5}
            />
          );
        })}

        {/* Data polygon fill */}
        <Polygon
          points={dataPoints}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="none"
        />

        {/* Data polygon stroke */}
        <Polygon
          points={dataPoints}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="2"
        />

        {/* Data points */}
        {DIMENSIONS.map((d, i) => {
          const p = getPoint(d.angle, d.value / 100);
          return (
            <Circle
              key={`point-${i}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#3B82F6"
              stroke="#fff"
              strokeWidth="2"
            />
          );
        })}

        {/* Labels */}
        {DIMENSIONS.map((d, i) => {
          const labelPos = getPoint(d.angle, 1.25);
          return (
            <SvgText
              key={`label-${i}`}
              x={labelPos.x}
              y={labelPos.y}
              fill="#6B7280"
              fontSize={12}
              fontWeight="500"
              textAnchor="middle"
            >
              {d.name}
            </SvgText>
          );
        })}

        {/* Value labels */}
        {DIMENSIONS.map((d, i) => {
          const valuePos = getPoint(d.angle, d.value / 100 + 0.12);
          return (
            <SvgText
              key={`value-${i}`}
              x={valuePos.x}
              y={valuePos.y}
              fill="#3B82F6"
              fontSize={10}
              fontWeight="600"
              textAnchor="middle"
            >
              {`${d.value}%`}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

// SVG Line Chart for anxiety curve
function AnxietyChart() {
  const width = 300;
  const height = 100;
  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const max = Math.max(...ANXIETY_DATA.map(d => d.value));
  const min = Math.min(...ANXIETY_DATA.map(d => d.value));
  const range = max - min || 1;

  const points = ANXIETY_DATA.map((d, i) => ({
    x: padding + (i / (ANXIETY_DATA.length - 1)) * chartWidth,
    y: padding + chartHeight - ((d.value - min) / range) * chartHeight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  // Area fill path
  const areaPath = `${pathD} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`;

  return (
    <View className="items-center">
      <Svg width={width} height={height}>
        {/* Reference lines */}
        <Line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#FCA5A5" strokeWidth="1" strokeDasharray="4,4" opacity={0.5} />
        <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#FCD34D" strokeWidth="1" strokeDasharray="4,4" opacity={0.5} />

        {/* Area fill */}
        <Path d={areaPath} fill="rgba(59, 130, 246, 0.1)" />

        {/* Line */}
        <Polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3B82F6" strokeWidth="2" />

        {/* Data points */}
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r="4" fill="#3B82F6" stroke="#fff" strokeWidth="2" />
        ))}

        {/* X-axis labels */}
        {ANXIETY_DATA.map((d, i) => (
          <SvgText
            key={i}
            x={points[i].x}
            y={height - 5}
            fill="#9CA3AF"
            fontSize="10"
            textAnchor="middle"
          >
            {d.label}
          </SvgText>
        ))}
      </Svg>
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
      if (data.portrait) setProfile(data);
    } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { fetchProfile(); }, [fetchProfile]));

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 pt-14 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-bold text-2xl">我的</Text>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <FontAwesome6 name="gear" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center border-2 border-white/30">
              <FontAwesome6 name="user" size={28} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-xl">{profile?.portrait?.name || '李同学'}</Text>
              <Text className="text-blue-200 text-sm mt-0.5">备考雅思 · 第 8 周</Text>
              <View className="flex-row gap-2 mt-2">
                <View className="bg-white/20 rounded-full px-3 py-1">
                  <Text className="text-white text-xs">目标 Band 7</Text>
                </View>
                <View className="bg-white/20 rounded-full px-3 py-1">
                  <Text className="text-white text-xs">当前 6.5</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Radar */}
        <View className="mx-6 -mt-4 bg-white rounded-2xl p-5 border border-stone-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-stone-900 font-bold text-base">五维学习画像</Text>
            <View className="bg-blue-50 px-2 py-1 rounded-full">
              <Text className="text-blue-600 text-xs font-medium">综合 56%</Text>
            </View>
          </View>
          <RadarChart />
          {/* Legend */}
          <View className="flex-row flex-wrap gap-3 mt-4 justify-center">
            {DIMENSIONS.map(d => (
              <View key={d.name} className="flex-row items-center gap-1.5">
                <View className="w-2 h-2 rounded-full bg-blue-500" />
                <Text className="text-stone-500 text-xs">{d.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Metrics */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border border-stone-100">
          <Text className="text-stone-900 font-bold text-base mb-4">可观测指标</Text>
          <View className="flex-row gap-3">
            {METRICS.map(m => (
              <View key={m.label} className="flex-1 bg-stone-50 rounded-xl p-3 border border-stone-100">
                <Text className="text-stone-500 text-xs mb-2">{m.label}</Text>
                <View className="flex-row items-center justify-center gap-1 h-8">
                  <Text className="text-stone-400 text-sm line-through">{m.from}</Text>
                  <FontAwesome6
                    name={m.trend === 'up' ? 'arrow-right' : 'arrow-right'}
                    size={10}
                    color="#9CA3AF"
                  />
                  <Text className="font-bold text-base" style={{ color: m.color }}>{m.to}</Text>
                </View>
                <View className="flex-row items-center justify-center gap-1 mt-1">
                  <FontAwesome6
                    name={m.trend === 'up' ? 'arrow-trend-up' : 'arrow-trend-down'}
                    size={10}
                    color={m.color}
                  />
                  <Text className="text-xs" style={{ color: m.color }}>
                    {m.trend === 'up' ? '进步' : '改善'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Anxiety curve */}
        <View className="mx-6 mt-4 bg-white rounded-2xl p-5 border border-stone-100">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-stone-900 font-bold text-base">焦虑曲线</Text>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-green-400" />
              <Text className="text-stone-500 text-xs">趋势向好</Text>
            </View>
          </View>
          <AnxietyChart />
          <View className="flex-row gap-4 mt-3 justify-center">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <Text className="text-stone-500 text-xs">高焦虑 &gt;80</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <Text className="text-stone-500 text-xs">中焦虑 50-80</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <Text className="text-stone-500 text-xs">低焦虑 &lt;50</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <Text className="text-stone-900 font-bold text-base px-6 mt-6 mb-3">设置</Text>
        <View className="mx-6 mb-8 bg-white rounded-2xl overflow-hidden border border-stone-100">
          {[
            { icon: 'moon', label: '考前夜模式', desc: '放松陪伴，缓解焦虑', badge: '今晚可用', badgeColor: '#8B5CF6', route: '/night' as const },
            { icon: 'bell', label: '提醒设置', desc: '管理每日提醒时间', route: '/settings' as const },
            { icon: 'clipboard-list', label: '备考承诺', desc: '查看你的学习承诺', route: '/commitment' as const },
            { icon: 'chart-line', label: '学习进度', desc: '查看详细学习数据', route: '/progress' as const },
          ].map((item, i) => (
            <TouchableOpacity
              key={item.label}
              className={`px-5 py-4 flex-row items-center ${i > 0 ? 'border-t border-stone-100' : ''}`}
              onPress={() => item.route && router.push(item.route)}
            >
              <View className="w-10 h-10 rounded-xl bg-stone-50 items-center justify-center mr-3">
                <FontAwesome6 name={item.icon as any} size={18} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-stone-700 text-sm font-medium">{item.label}</Text>
                <Text className="text-stone-400 text-xs mt-0.5">{item.desc}</Text>
              </View>
              {item.badge && (
                <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: item.badgeColor + '15' }}>
                  <Text className="text-xs font-medium" style={{ color: item.badgeColor }}>{item.badge}</Text>
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
