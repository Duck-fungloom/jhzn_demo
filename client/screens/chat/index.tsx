import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

const AI_ROLES = [
  { id: 'coach', name: 'Alex', title: '教练', desc: '规划 + 激励 + 承诺追踪', icon: 'bullhorn' as const, color: '#D97706', bg: '#FFFBEB' },
  { id: 'mentor', name: 'Socra', title: '导师', desc: '苏格拉底式引导', icon: 'graduation-cap' as const, color: '#4F46E5', bg: '#EEF2FF' },
  { id: 'partner', name: 'Jamie', title: '陪练', desc: '口语陪练 + 考前陪伴', icon: 'handshake' as const, color: '#059669', bg: '#F0FDF4' },
  { id: 'analyst', name: 'Sage', title: '分析师', desc: '四维诊断 + 卡点定位', icon: 'chart-bar' as const, color: '#7C3AED', bg: '#F5F3FF' },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const { student } = useAuth();
  const router = useSafeRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  // Load chat history when role is selected
  useEffect(() => {
    if (!student || !selectedRole) return;
    fetch(`${BASE_URL}/api/v1/student/${student.id}/chat/${selectedRole}/history`)
      .then(r => r.json())
      .then(data => {
        if (data.conversations) {
          setChatHistory(data.conversations);
          // Load latest conversation messages
          if (data.conversations.length > 0) {
            const latest = data.conversations[0];
            if (latest.messages) {
              setMessages(latest.messages.map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: new Date(m.created_at),
              })));
            }
          }
        }
      })
      .catch(console.error);
  }, [student, selectedRole]);

  const sendMessage = async () => {
    if (!inputText.trim() || !student || !selectedRole) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/v1/student/${student.id}/chat/with-memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputText.trim(),
          conversation_id: selectedRole,
          current_moment: 'practice_plateau',
          role: selectedRole,
        }),
      });
      const data = await res.json();

      if (data.reply) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (e) {
      console.error('Chat failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const currentRole = AI_ROLES.find(r => r.id === selectedRole);

  // Role selection view
  if (!selectedRole) {
    return (
      <Screen>
        <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-12 pb-8">
            <Text className="text-stone-800 text-2xl font-bold mb-2">AI 对话</Text>
            <Text className="text-stone-500 text-sm mb-6">选择你的 AI 伙伴</Text>

            {AI_ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                onPress={() => setSelectedRole(role.id)}
                className="bg-white rounded-2xl p-5 mb-3 flex-row items-center"
                style={{ shadowColor: role.color, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
              >
                <View className="w-14 h-14 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: role.bg }}>
                  <FontAwesome6 name={role.icon} size={24} color={role.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-stone-800 font-bold text-base mr-2">{role.name}</Text>
                    <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: role.bg }}>
                      <Text className="text-xs font-semibold" style={{ color: role.color }}>{role.title}</Text>
                    </View>
                  </View>
                  <Text className="text-stone-500 text-sm">{role.desc}</Text>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color="#A8A29E" />
              </TouchableOpacity>
            ))}

            {/* Teacher messages entry */}
            <TouchableOpacity
              onPress={() => undefined}
              className="bg-white rounded-2xl p-5 flex-row items-center mt-4 border border-amber-100"
              style={{ shadowColor: '#D97706', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}
            >
              <View className="w-14 h-14 rounded-2xl bg-amber-50 items-center justify-center mr-4">
                <FontAwesome6 name="chalkboard-user" size={24} color="#D97706" />
              </View>
              <View className="flex-1">
                <Text className="text-stone-800 font-bold text-base">教师消息</Text>
                <Text className="text-stone-500 text-sm">查看老师的反馈和建议</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#A8A29E" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // Chat view
  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1 bg-stone-50" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View className="flex-row items-center px-6 pt-12 pb-4 bg-white border-b border-stone-100">
          <TouchableOpacity onPress={() => setSelectedRole(null)} className="mr-4">
            <FontAwesome6 name="chevron-left" size={18} color="#44403C" />
          </TouchableOpacity>
          <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: currentRole?.bg }}>
            <FontAwesome6 name={currentRole?.icon as any} size={18} color={currentRole?.color} />
          </View>
          <View>
            <Text className="text-stone-800 font-bold text-base">{currentRole?.name}</Text>
            <Text className="text-stone-400 text-xs">{currentRole?.title}</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          renderItem={({ item }) => (
            <View className={`mb-3 ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
              <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${item.role === 'user' ? 'bg-indigo-600' : 'bg-white'}`}
                style={item.role === 'assistant' ? { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 } : undefined}>
                <Text className={`text-sm leading-5 ${item.role === 'user' ? 'text-white' : 'text-stone-700'}`}>
                  {item.content}
                </Text>
              </View>
              <Text className="text-stone-400 text-[10px] mt-1 mx-1">
                {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: currentRole?.bg }}>
                <FontAwesome6 name={currentRole?.icon as any} size={24} color={currentRole?.color as string} />
              </View>
              <Text className="text-stone-500 text-sm text-center">
                你好！我是 {currentRole?.name}，{currentRole?.desc}。{'\n'}有什么可以帮你的？
              </Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View className="px-4 pb-2 items-start">
            <View className="bg-white rounded-2xl px-4 py-3" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
              <Text className="text-stone-400 text-sm">{currentRole?.name} 正在思考...</Text>
            </View>
          </View>
        )}

        {/* Input */}
        <View className="bg-white border-t border-stone-100 px-4 py-3 pb-6">
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 bg-stone-100 rounded-xl px-4 py-3 text-stone-800 text-sm"
              placeholder={`向 ${currentRole?.name} 提问...`}
              placeholderTextColor="#A8A29E"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim()}
              className={`w-10 h-10 rounded-xl items-center justify-center ${inputText.trim() ? 'bg-indigo-600' : 'bg-stone-200'}`}
            >
              <FontAwesome6 name="paper-plane" size={14} color={inputText.trim() ? 'white' : '#A8A29E'} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
