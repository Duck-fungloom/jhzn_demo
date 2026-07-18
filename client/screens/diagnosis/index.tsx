import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

const DIMENSIONS = [
  { key: 'task_response', label: 'Task Response', short: 'TR', band: 5.5, color: '#6366f1', strength: '能回应题目要求', weakness: '论点展开不够充分' },
  { key: 'coherence_cohesion', label: 'Coherence & Cohesion', short: 'CC', band: 5.0, color: '#059669', strength: '有基本的段落意识', weakness: '连接手段单一' },
  { key: 'lexical_resource', label: 'Lexical Resource', short: 'LR', band: 6.0, color: '#d97706', strength: '词汇量较好', weakness: '搭配不够精准' },
  { key: 'grammatical_range', label: 'Grammatical Range', short: 'GR', band: 5.5, color: '#7c3aed', strength: '能使用复合句', weakness: '错误率偏高' },
];

export default function DiagnosisScreen() {
  const router = useSafeRouter();
  const { sessionId } = useSafeSearchParams<{ sessionId: string }>();
  const [showBottleneck, setShowBottleneck] = useState(false);

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-12 pb-4">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <FontAwesome6 name="arrow-left" size={20} color="#44403c" />
            </TouchableOpacity>
            <Text className="text-stone-800 text-xl font-bold">诊断报告</Text>
          </View>
        </View>

        {/* Score overview - NO total score! */}
        <View className="px-6 mb-6">
          <View className="bg-white rounded-2xl p-5" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
            <Text className="text-stone-500 text-xs mb-3">四维分项评分</Text>
            <View className="flex-row flex-wrap gap-3">
              {DIMENSIONS.map(dim => (
                <View key={dim.key} className="flex-1 min-w-[70px] items-center">
                  <Text className="text-xs text-stone-400 mb-1">{dim.short}</Text>
                  <Text className="text-2xl font-bold" style={{ color: dim.color }}>{dim.band}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Dimension details */}
        <View className="px-6 mb-6 gap-3">
          {DIMENSIONS.map(dim => (
            <View key={dim.key} className="bg-white rounded-2xl p-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-stone-800 font-semibold text-sm">{dim.label}</Text>
                <Text className="text-lg font-bold" style={{ color: dim.color }}>Band {dim.band}</Text>
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-emerald-600 text-xs font-medium mb-1">优势</Text>
                  <Text className="text-stone-600 text-xs">{dim.strength}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-red-500 text-xs font-medium mb-1">待提升</Text>
                  <Text className="text-stone-600 text-xs">{dim.weakness}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Bottleneck */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={() => setShowBottleneck(!showBottleneck)}
            className="bg-white rounded-2xl p-4"
            style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-red-50 items-center justify-center mr-3">
                  <FontAwesome6 name="triangle-exclamation" size={14} color="#ef4444" />
                </View>
                <Text className="text-stone-800 font-semibold text-sm">卡点分析</Text>
              </View>
              <FontAwesome6 name={showBottleneck ? 'chevron-up' : 'chevron-down'} size={14} color="#a8a29e" />
            </View>
            {showBottleneck && (
              <View className="mt-3 pt-3 border-t border-stone-100">
                <Text className="text-stone-600 text-sm leading-5">
                  你的主要卡点在 CC 维度的「连接手段」子技能。当前掌握度 45%，这是阻碍你从 Band 5.5 提升到 Band 6.0 的关键瓶颈。
                </Text>
                <TouchableOpacity className="bg-indigo-50 rounded-xl py-2 px-4 mt-3 self-start">
                  <Text className="text-indigo-600 text-sm font-medium">开始专项练习</Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Recommended actions */}
        <View className="px-6 mb-8">
          <View className="bg-indigo-500 rounded-2xl p-5">
            <Text className="text-white font-bold text-base mb-2">推荐下一步</Text>
            <Text className="text-indigo-100 text-sm leading-5 mb-4">
              建议先做 1 次 CC 衔接手段专项练习，精准突破卡点。
            </Text>
            <TouchableOpacity className="bg-white rounded-xl py-3 items-center">
              <Text className="text-indigo-600 font-semibold">开始练习</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
