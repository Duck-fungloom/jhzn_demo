import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { FontAwesome6 } from '@expo/vector-icons';

const TASKS = [
  { id: '1', title: 'Task 2: 教育类议论文', type: 'writing', difficulty: 'medium', duration: 40 },
  { id: '2', title: 'Task 1: 柱状图描述', type: 'writing', difficulty: 'easy', duration: 20 },
  { id: '3', title: 'Part 2: 描述一个地方', type: 'speaking', difficulty: 'medium', duration: 2 },
];

export default function PracticeScreen() {
  const { student } = useAuth();
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isWriting, setIsWriting] = useState(false);
  const [scaffoldLevel, setScaffoldLevel] = useState(0);

  const handleTextChange = (text: string) => {
    setContent(text);
    setWordCount(text.split(/\s+/).filter(w => w.length > 0).length);
  };

  const handleSubmit = async () => {
    if (!student || !selectedTask || !content.trim()) return;
    try {
      const res = await fetch(`${BASE_URL}/api/v1/student/${student.id}/practice-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: selectedTask, content }),
      });
      const data = await res.json();
      if (data.session) {
        // Navigate to diagnosis
      }
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  if (isWriting && selectedTask) {
    return (
      <Screen>
        <View className="flex-1 bg-stone-50">
          {/* Writing header */}
          <View className="px-6 pt-12 pb-4 bg-white border-b border-stone-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setIsWriting(false)}>
                <FontAwesome6 name="arrow-left" size={20} color="#44403c" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center gap-1">
                  <FontAwesome6 name="clock" size={12} color="#78716c" />
                  <Text className="text-stone-600 text-sm">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</Text>
                </View>
                <Text className="text-stone-600 text-sm">{wordCount} 词</Text>
              </View>
            </View>
          </View>

          {/* Writing area */}
          <ScrollView className="flex-1 px-6 py-4">
            <View className="bg-white rounded-2xl p-4 mb-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
              <Text className="text-stone-800 font-bold text-base mb-2">
                {TASKS.find(t => t.id === selectedTask)?.title}
              </Text>
              <Text className="text-stone-500 text-sm">
                Some people believe that technology has made our lives more complex. To what extent do you agree or disagree?
              </Text>
            </View>

            <TextInput
              style={styles.editor}
              multiline
              placeholder="Start writing here..."
              placeholderTextColor="#a8a29e"
              value={content}
              onChangeText={handleTextChange}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Scaffold panel */}
          <View className="px-6 py-4 bg-white border-t border-stone-200">
            <Text className="text-stone-500 text-xs mb-2">需要帮助？</Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setScaffoldLevel(1)}
                className="flex-1 bg-amber-50 rounded-xl py-2 items-center"
              >
                <Text className="text-amber-700 text-xs font-medium">给提示</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setScaffoldLevel(2)}
                className="flex-1 bg-indigo-50 rounded-xl py-2 items-center"
              >
                <Text className="text-indigo-700 text-xs font-medium">看示范</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                className="flex-1 bg-indigo-500 rounded-xl py-2 items-center"
              >
                <Text className="text-white text-xs font-medium">提交</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-6">
          <Text className="text-stone-800 text-2xl font-bold mb-2">练习</Text>
          <Text className="text-stone-500 text-sm mb-6">选择一项练习开始</Text>

          {/* Task list */}
          <View className="gap-3">
            {TASKS.map(task => (
              <TouchableOpacity
                key={task.id}
                className="bg-white rounded-2xl p-4"
                style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}
                onPress={() => {
                  setSelectedTask(task.id);
                  setIsWriting(true);
                }}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center mr-3">
                    <FontAwesome6 name={task.type === 'writing' ? 'pen' : 'microphone'} size={16} color="#6366f1" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-stone-800 font-semibold text-sm">{task.title}</Text>
                    <View className="flex-row items-center gap-3 mt-1">
                      <Text className="text-stone-400 text-xs">{task.duration} 分钟</Text>
                      <Text className="text-stone-400 text-xs">
                        难度: {task.difficulty === 'easy' ? '简单' : task.difficulty === 'medium' ? '中等' : '困难'}
                      </Text>
                    </View>
                  </View>
                  <FontAwesome6 name="chevron-right" size={14} color="#a8a29e" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  editor: {
    minHeight: 300,
    fontSize: 16,
    lineHeight: 24,
    color: '#1c1917',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
