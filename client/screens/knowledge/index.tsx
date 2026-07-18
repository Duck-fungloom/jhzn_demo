import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

const KNOWLEDGE_POINTS = [
  { id: 'k1', name: '论点提出', dimension: 'TR', mastery: 0.6, category: 'cognitive' },
  { id: 'k2', name: '论点展开', dimension: 'TR', mastery: 0.35, category: 'cognitive' },
  { id: 'k3', name: '逻辑连接', dimension: 'CC', mastery: 0.45, category: 'cognitive' },
  { id: 'k4', name: '段落结构', dimension: 'CC', mastery: 0.55, category: 'cognitive' },
  { id: 'k5', name: '词汇多样性', dimension: 'LR', mastery: 0.5, category: 'cognitive' },
  { id: 'k6', name: '词汇准确性', dimension: 'LR', mastery: 0.4, category: 'cognitive' },
  { id: 'k7', name: '语法复杂度', dimension: 'GR', mastery: 0.3, category: 'cognitive' },
  { id: 'k8', name: '语法准确性', dimension: 'GR', mastery: 0.45, category: 'cognitive' },
];

export default function KnowledgeScreen() {
  const { student } = useAuth();
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const [selectedDim, setSelectedDim] = useState<string | null>(null);
  const [knowledgePoints, setKnowledgePoints] = useState(KNOWLEDGE_POINTS);

  useFocusEffect(() => {
    if (!student) return;
    fetch(`${BASE_URL}/api/v1/student/${student.id}/knowledge-map`)
      .then(r => r.json())
      .then(data => {
        if (data.knowledge_points) {
          setKnowledgePoints(data.knowledge_points);
        }
      })
      .catch(console.error);
  });

  const filtered = selectedDim
    ? knowledgePoints.filter(kp => kp.dimension === selectedDim)
    : knowledgePoints;

  const dimensions = ['TR', 'CC', 'LR', 'GR'];
  const dimColors: Record<string, string> = { TR: '#6366f1', CC: '#059669', LR: '#d97706', GR: '#7c3aed' };

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-6">
          <Text className="text-stone-800 text-2xl font-bold mb-2">知识图谱</Text>
          <Text className="text-stone-500 text-sm mb-6">查看各维度知识点掌握情况</Text>

          {/* Dimension filter */}
          <View className="flex-row gap-2 mb-6">
            <TouchableOpacity
              onPress={() => setSelectedDim(null)}
              className={`px-4 py-2 rounded-full ${!selectedDim ? 'bg-indigo-500' : 'bg-white'}`}
            >
              <Text className={!selectedDim ? 'text-white text-sm font-medium' : 'text-stone-600 text-sm'}>全部</Text>
            </TouchableOpacity>
            {dimensions.map(dim => (
              <TouchableOpacity
                key={dim}
                onPress={() => setSelectedDim(selectedDim === dim ? null : dim)}
                className={`px-4 py-2 rounded-full ${selectedDim === dim ? 'bg-indigo-500' : 'bg-white'}`}
              >
                <Text className={selectedDim === dim ? 'text-white text-sm font-medium' : 'text-stone-600 text-sm'}>{dim}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Knowledge points */}
          <View className="gap-3">
            {filtered.map(kp => (
              <View key={kp.id} className="bg-white rounded-2xl p-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: (dimColors[kp.dimension] || '#6366f1') + '15' }}>
                      <FontAwesome6 name="brain" size={12} color={dimColors[kp.dimension] || '#6366f1'} />
                    </View>
                    <View>
                      <Text className="text-stone-800 font-semibold text-sm">{kp.name}</Text>
                      <Text className="text-stone-400 text-xs">{kp.dimension}</Text>
                    </View>
                  </View>
                  <Text className="text-stone-800 font-bold text-sm">{Math.round(kp.mastery * 100)}%</Text>
                </View>
                <View className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${kp.mastery * 100}%`,
                      backgroundColor: kp.mastery >= 0.7 ? '#059669' : kp.mastery >= 0.4 ? '#d97706' : '#ef4444',
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
