import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

const NODES = [
  { id: 'K1', name: '写作任务理...', mastery: 0.88, status: 'mastered' as const, row: 0, col: 0 },
  { id: 'K2', name: '论点生成', mastery: 0.76, status: 'mastered' as const, row: 0, col: 1 },
  { id: 'K3', name: '论点展开', mastery: 0.31, status: 'weak' as const, row: 0, col: 2 },
  { id: 'K4', name: '反驳结构', mastery: 0, status: 'locked' as const, row: 0, col: 3 },
  { id: 'K5', name: '开头写法', mastery: 0.82, status: 'mastered' as const, row: 1, col: 0 },
  { id: 'K6', name: '段落衔接', mastery: 0.52, status: 'learning' as const, row: 1, col: 1 },
  { id: 'K7', name: '结尾总结', mastery: 0.28, status: 'weak' as const, row: 1, col: 2 },
  { id: 'K8', name: '词汇多样', mastery: 0, status: 'locked' as const, row: 1, col: 3 },
];

const EDGES = [
  ['K1', 'K2'], ['K2', 'K3'], ['K3', 'K4'],
  ['K1', 'K5'], ['K2', 'K6'], ['K3', 'K7'],
  ['K5', 'K6'], ['K6', 'K7'], ['K7', 'K8'],
];

const STATUS_COLORS: Record<string, string> = {
  mastered: '#10B981',
  learning: '#F59E0B',
  weak: '#EF4444',
  locked: '#D1D5DB',
};

const STATUS_LABELS: Record<string, string> = {
  mastered: '已掌握',
  learning: '学习中',
  weak: '薄弱',
  locked: '未解锁',
};

const NODE_W = 72;
const NODE_H = 56;
const GAP_X = 20;
const GAP_Y = 30;
const PAD_X = 24;

export default function KnowledgeScreen() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const getNodePos = (row: number, col: number) => ({
    x: PAD_X + col * (NODE_W + GAP_X),
    y: 20 + row * (NODE_H + GAP_Y),
  });

  const svgW = PAD_X * 2 + 4 * NODE_W + 3 * GAP_X;
  const svgH = 20 * 2 + 2 * NODE_H + GAP_Y + 20;

  const selected = NODES.find(n => n.id === selectedNode);
  const mastered = NODES.filter(n => n.status === 'mastered').length;
  const learning = NODES.filter(n => n.status === 'learning').length;
  const weak = NODES.filter(n => n.status === 'weak').length;

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-12 pb-4">
          <Text className="text-stone-900 text-xl font-bold">知识地图</Text>
        </View>

        {/* Legend */}
        <View className="flex-row flex-wrap px-6 gap-x-4 gap-y-2 mb-4">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <View key={key} className="flex-row items-center gap-1.5">
              <View className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[key] }} />
              <Text className="text-stone-500 text-xs">{label}</Text>
            </View>
          ))}
          <View className="flex-row items-center gap-1.5">
            <View className="w-6 h-0.5 bg-stone-300" />
            <Text className="text-stone-500 text-xs">依赖关系</Text>
          </View>
        </View>

        {/* SVG Node Network */}
        <View className="mx-6 bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
          <View style={{ width: svgW, height: svgH }}>
            {/* Edges */}
            {EDGES.map(([from, to], i) => {
              const fromNode = NODES.find(n => n.id === from)!;
              const toNode = NODES.find(n => n.id === to)!;
              const fp = getNodePos(fromNode.row, fromNode.col);
              const tp = getNodePos(toNode.row, toNode.col);
              const x1 = fp.x + NODE_W / 2;
              const y1 = fp.y + NODE_H / 2;
              const x2 = tp.x + NODE_W / 2;
              const y2 = tp.y + NODE_H / 2;
              const isDashed = fromNode.status === 'locked' || toNode.status === 'locked';
              return (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: Math.min(x1, x2),
                    top: Math.min(y1, y2),
                    width: Math.abs(x2 - x1) || 1,
                    height: Math.abs(y2 - y1) || 1,
                  }}
                >
                  <View style={{
                    position: 'absolute',
                    backgroundColor: '#D1D5DB',
                    ...(x1 === x2
                      ? { left: 0, top: 0, width: 1.5, height: '100%' }
                      : { left: 0, top: 0, width: '100%', height: 1.5 }),
                    opacity: isDashed ? 0.4 : 0.6,
                  }} />
                </View>
              );
            })}

            {/* Nodes */}
            {NODES.map(node => {
              const pos = getNodePos(node.row, node.col);
              const isSelected = selectedNode === node.id;
              return (
                <TouchableOpacity
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                  onPress={() => setSelectedNode(isSelected ? null : node.id)}
                >
                  <View style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: isSelected ? 2 : 1.5,
                    borderColor: isSelected ? '#2563EB' : STATUS_COLORS[node.status],
                    backgroundColor: node.status === 'weak' ? '#FEF2F2' : node.status === 'learning' ? '#FFFBEB' : node.status === 'locked' ? '#F9FAFB' : '#F0FDF4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                  }}>
                    <Text className="font-bold text-xs text-stone-700">{node.id}</Text>
                    <Text className="text-stone-500 text-[10px] text-center leading-tight mt-0.5" numberOfLines={1}>{node.name}</Text>
                    {/* Status dot */}
                    <View style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: STATUS_COLORS[node.status],
                      borderWidth: 2,
                      borderColor: '#fff',
                    }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row px-6 gap-3 mb-6">
          {[
            { num: mastered, label: '已掌握', color: '#10B981' },
            { num: learning, label: '学习中', color: '#F59E0B' },
            { num: weak, label: '薄弱点', color: '#EF4444' },
          ].map(s => (
            <View key={s.label} className="flex-1 bg-white rounded-2xl p-4 items-center" style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
              <Text className="font-bold text-2xl" style={{ color: s.color }}>{s.num}</Text>
              <Text className="text-stone-400 text-xs mt-1">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Knowledge point details */}
        <Text className="text-stone-900 font-bold text-base px-6 mb-3">知识点详情</Text>
        <View className="px-6 pb-8 gap-2">
          {NODES.filter(n => n.status !== 'locked').map(node => (
            <TouchableOpacity
              key={node.id}
              className="bg-white rounded-2xl p-4 flex-row items-center justify-between"
              style={{ shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 }}
              onPress={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[node.status] }} />
                <View>
                  <Text className="text-stone-900 font-bold text-sm">{node.id} · {node.name}</Text>
                  <Text className="text-stone-400 text-xs">
                    掌握度：{node.mastery} · 下次复习：7月{18 + (node.id.charCodeAt(0) % 10)}日
                  </Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom sheet for selected node */}
        {selected && (
          <View className="px-6 pb-8">
            <View className="bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 }}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[selected.status] }} />
                  <Text className="text-stone-900 font-bold text-base">{selected.id} · {selected.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedNode(null)}>
                  <FontAwesome6 name="xmark" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <Text className="text-stone-500 text-sm mb-4">
                掌握度：{selected.mastery} · 状态：{STATUS_LABELS[selected.status]}
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity className="flex-1 bg-blue-600 rounded-xl py-3 items-center">
                  <Text className="text-white font-medium text-sm">开始练习</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-stone-100 rounded-xl py-3 items-center">
                  <Text className="text-stone-600 font-medium text-sm">查看详情</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
