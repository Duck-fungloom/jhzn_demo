import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { useState } from 'react';

const ROLES = [
  { id: 'coach', name: 'Coach 教练', desc: '目标驱动，推动你突破', sub: '严格要求，聚焦结果', color: '#F97316', bg: '#FFF7ED', icon: 'dumbbell' },
  { id: 'mentor', name: 'Mentor 导师', desc: '知识渊博，解惑答疑', sub: '深度讲解，建立体系', color: '#3B82F6', bg: '#EFF6FF', icon: 'chalkboard-user' },
  { id: 'partner', name: 'Partner 陪练', desc: '并肩作战，共同成长', sub: '陪伴练习，互相鼓励', color: '#10B981', bg: '#ECFDF5', icon: 'handshake' },
  { id: 'companion', name: 'Companion 陪伴', desc: '情感支持，减压释怀', sub: '倾听理解，温暖陪伴', color: '#8B5CF6', bg: '#F5F3FF', icon: 'heart' },
];

const MOCK_MESSAGES: Record<string, { from: 'ai' | 'user'; text: string; confidence?: number }[]> = {
  coach: [
    { from: 'ai', text: '今天的 TR 练习成绩出来了——Band 5.5。距离目标还有 1 分。我们来分析你的弱点，制定本周冲刺计划。', confidence: 88 },
    { from: 'user', text: '好的，我觉得主要是论点展开不够' },
    { from: 'ai', text: '对。你的问题在于每个论点只写 2-3 句就结束了。今晚的任务：针对你刚才的作文，把第二段重新扩展到 80 词以上。现在开始。', confidence: 92 },
  ],
  mentor: [
    { from: 'ai', text: '你提到了"technology makes life complex"——这个论点很好。但你能具体说说，是哪些技术让生活变复杂了吗？', confidence: 85 },
    { from: 'user', text: '比如社交媒体，让人花太多时间' },
    { from: 'ai', text: '很好！这就是一个具体的例子。现在试着用"for instance"或"take...as an example"来组织这个论点。', confidence: 90 },
  ],
  partner: [
    { from: 'ai', text: '嘿！今天状态怎么样？上次你说 CC 维度比较弱，我们一起练练段落衔接吧？', confidence: 80 },
    { from: 'user', text: '好呀，我总是不知道怎么连接段落' },
    { from: 'ai', text: '没关系！我们先从最简单的开始——试试用"Furthermore"和"However"各造一个句子？', confidence: 85 },
  ],
  companion: [
    { from: 'ai', text: '最近备考压力是不是有点大？我注意到你昨晚学习到了很晚。', confidence: 78 },
    { from: 'user', text: '嗯，感觉怎么都提不了分' },
    { from: 'ai', text: '我理解这种感觉。但你看，你的 TR 从 5.0 升到了 5.5，这已经是进步了。给自己一点时间。', confidence: 92 },
  ],
};

function RoleList() {
  const router = useSafeRouter();

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-4">
          <Text className="text-stone-900 font-bold text-2xl">AI 对话</Text>
          <Text className="text-stone-500 text-sm mt-1">选择一位 AI 伙伴开始对话</Text>
        </View>

        <View className="px-6 gap-3 pb-8">
          {ROLES.map(role => (
            <TouchableOpacity
              key={role.id}
              className="bg-white rounded-2xl p-5 flex-row items-center"
              style={{ shadowColor: role.color, shadowOpacity: 0.08, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: role.color + '20' }}
              onPress={() => router.push('/chat', { role: role.id })}
            >
              <View className="w-14 h-14 rounded-full items-center justify-center mr-4" style={{ backgroundColor: role.bg }}>
                <Text className="text-2xl">{role.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-lg" style={{ color: role.color }}>{role.name}</Text>
                <Text className="text-stone-700 text-sm mt-0.5">{role.desc}</Text>
                <Text className="text-stone-400 text-xs mt-0.5">{role.sub}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function ChatView() {
  const params = useSafeSearchParams<{ role?: string }>();
  const role = ROLES.find(r => r.id === params.role) || ROLES[0];
  const messages = MOCK_MESSAGES[role.id] || [];
  const [input, setInput] = useState('');

  return (
    <Screen>
      {/* Header */}
      <View className="px-6 pt-12 pb-4 flex-row items-center gap-3" style={{ backgroundColor: role.color }}>
        <Text className="text-2xl">{role.icon}</Text>
        <View>
          <Text className="text-white font-bold text-lg">{role.name}</Text>
          <Text className="text-white/80 text-xs">{role.desc}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView className="flex-1 bg-stone-50 px-4 py-4" showsVerticalScrollIndicator={false}>
        <View className="gap-4">
          {messages.map((msg, i) => (
            <View key={i}>
              {msg.from === 'ai' ? (
                <View>
                  <View className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3" style={{ backgroundColor: role.bg, borderLeftWidth: 3, borderLeftColor: role.color }}>
                    <Text className="text-stone-800 text-sm leading-5">{msg.text}</Text>
                  </View>
                  {msg.confidence && (
                    <View className="flex-row items-center gap-1 mt-1.5 ml-1">
                      <FontAwesome6 name="robot" size={12} color="#9CA3AF" />
                      <Text className="text-stone-400 text-xs">AI 生成 · 置信度 {msg.confidence}%</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="self-end max-w-[85%]">
                  <View className="bg-blue-50 rounded-2xl rounded-tr-sm px-4 py-3">
                    <Text className="text-stone-800 text-sm leading-5">{msg.text}</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Input */}
      <View className="bg-white px-4 py-3 flex-row items-center gap-3" style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
        <TextInput
          className="flex-1 bg-stone-100 rounded-xl px-4 py-2.5 text-sm text-stone-800"
          placeholder="输入消息..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: role.color }}>
          <FontAwesome6 name="paper-plane" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

export default function ChatScreen() {
  const params = useSafeSearchParams<{ role?: string }>();
  return params.role ? <ChatView /> : <RoleList />;
}
