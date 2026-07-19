import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import SSE from 'react-native-sse';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

const ROLES = [
  { id: 'coach', name: 'Coach 教练', desc: '目标驱动，推动你突破', sub: '严格要求，聚焦结果', color: '#F97316', bg: '#FFF7ED', icon: 'dumbbell' as const },
  { id: 'mentor', name: 'Mentor 导师', desc: '知识渊博，解惑答疑', sub: '深度讲解，建立体系', color: '#3B82F6', bg: '#EFF6FF', icon: 'chalkboard-student' as const },
  { id: 'partner', name: 'Partner 陪练', desc: '并肩作战，共同成长', sub: '陪伴练习，互相鼓励', color: '#10B981', bg: '#ECFDF5', icon: 'handshake' as const },
  { id: 'analyst', name: 'Analyst 分析师', desc: '精准诊断，数据说话', sub: '四维诊断，卡点定位', color: '#8B5CF6', bg: '#F5F3FF', icon: 'chart-bar' as const },
];

interface ChatMessage {
  from: 'ai' | 'student';
  text: string;
  agent?: string;
  agentName?: string;
  agentColor?: string;
  confidence?: number;
  isStreaming?: boolean;
}

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
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              className="bg-white rounded-2xl p-5 flex-row items-center"
              style={{
                shadowColor: role.color,
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 2,
                borderWidth: 1,
                borderColor: role.color + '20',
              }}
              onPress={() => router.push('/chat', { role: role.id })}
            >
              <View
                className="w-14 h-14 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: role.bg }}
              >
                <FontAwesome6 name={role.icon} size={24} color={role.color} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-lg" style={{ color: role.color }}>
                  {role.name}
                </Text>
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
  const role = ROLES.find((r) => r.id === params.role) || ROLES[0];
  const { student } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const sseRef = useRef<SSE | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const conversationIdRef = useRef(`conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  // Load chat history
  useFocusEffect(
    useCallback(() => {
      const loadHistory = async () => {
        if (!student?.id) return;
        setIsLoadingHistory(true);
        try {
          /**
           * 服务端文件：server/src/routes/student.ts
           * 接口：GET /api/v1/student/:id/chat/:role/history
           * Path 参数：id: string (student_id), role: string (coach/mentor/partner/analyst)
           */
          const resp = await fetch(
            `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/${student.id}/chat/${role.id}/history`
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data.messages?.length > 0) {
              const historyMsgs: ChatMessage[] = data.messages.map(
                (m: { role: string; content: string; agent: string }) => ({
                  from: m.role === 'student' ? ('student' as const) : ('ai' as const),
                  text: m.content,
                  agent: m.agent,
                })
              );
              setMessages(historyMsgs.reverse());
            }
          }
        } catch (err) {
          console.warn('Failed to load chat history:', err);
        } finally {
          setIsLoadingHistory(false);
        }
      };
      loadHistory();
    }, [student?.id, role.id])
  );

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming || !student?.id) return;

    // Add student message
    const studentMsg: ChatMessage = { from: 'student', text };
    setMessages((prev) => [...prev, studentMsg]);
    setInput('');
    setIsStreaming(true);

    // Add placeholder AI message
    const aiPlaceholder: ChatMessage = {
      from: 'ai',
      text: '',
      agent: role.id,
      agentName: role.name,
      agentColor: role.color,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    // Close previous SSE connection
    if (sseRef.current) {
      sseRef.current.close();
    }

    /**
     * 服务端文件：server/src/routes/student.ts
     * 接口：POST /api/v1/student/:id/chat/with-memory (SSE)
     * Path 参数：id: string (student_id)
     * Body 参数：
     *   message: string - 用户消息
     *   conversation_id: string - 对话ID
     *   current_moment: string - 当前时刻
     *   selected_role: string - 选择的角色 (coach/mentor/partner/analyst)
     */
    const sse = new SSE(
      `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/${student.id}/chat/with-memory`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationIdRef.current,
          selected_role: role.id,
        }),
      }
    );

    sseRef.current = sse;
    let accumulatedText = '';

    sse.addEventListener('message', (event) => {
      if (event.data === '[DONE]') {
        sse.close();
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
        );
        return;
      }

      try {
        if (!event.data) return;
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'chunk') {
          accumulatedText += parsed.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.isStreaming ? { ...m, text: accumulatedText } : m
            )
          );
        } else if (parsed.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.isStreaming
                ? {
                    ...m,
                    isStreaming: false,
                    agent: parsed.agent,
                    agentName: parsed.agent_name,
                    agentColor: parsed.agent_color,
                  }
                : m
            )
          );
        } else if (parsed.type === 'error') {
          setMessages((prev) =>
            prev.map((m) =>
              m.isStreaming
                ? { ...m, text: `抱歉，出现错误：${parsed.message}`, isStreaming: false }
                : m
            )
          );
        }
      } catch (e) {
        console.warn('SSE parse error:', e);
      }
    });

    sse.addEventListener('error', (event) => {
      console.warn('SSE connection error:', event);
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((m) =>
          m.isStreaming
            ? { ...m, text: m.text || '连接失败，请检查网络后重试', isStreaming: false }
            : m
        )
      );
    });
  }, [input, isStreaming, student?.id, role]);

  return (
    <Screen>
      {/* Header */}
      <View
        className="px-6 pt-12 pb-4 flex-row items-center gap-3"
        style={{ backgroundColor: role.color }}
      >
        <View className="w-10 h-10 rounded-full items-center justify-center bg-white/20">
          <FontAwesome6 name={role.icon} size={18} color="#fff" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg">{role.name}</Text>
          <Text className="text-white/80 text-xs">{role.desc}</Text>
        </View>
        {isStreaming && (
          <View className="flex-row items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
            <ActivityIndicator size="small" color="#fff" />
            <Text className="text-white/90 text-xs">思考中</Text>
          </View>
        )}
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-stone-50 px-4 py-4"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {isLoadingHistory ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={role.color} />
            <Text className="text-stone-400 text-sm mt-3">加载对话历史...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View className="items-center justify-center py-20">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: role.bg }}
            >
              <FontAwesome6 name={role.icon} size={28} color={role.color} />
            </View>
            <Text className="text-stone-600 text-base font-medium text-center">
              {role.name} 已准备好
            </Text>
            <Text className="text-stone-400 text-sm mt-1 text-center px-8">
              {role.id === 'coach' && '告诉我你的目标，我来帮你制定计划'}
              {role.id === 'mentor' && '有什么不懂的？我来用问题引导你思考'}
              {role.id === 'partner' && '嘿！今天想练什么？我们一起加油'}
              {role.id === 'analyst' && '提交你的练习，我来帮你精准诊断'}
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {messages.map((msg, i) => (
              <View key={i}>
                {msg.from === 'ai' ? (
                  <View>
                    <View
                      className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3"
                      style={{
                        backgroundColor: role.bg,
                        borderLeftWidth: 3,
                        borderLeftColor: msg.agentColor || role.color,
                      }}
                    >
                      <Text className="text-stone-800 text-sm leading-5">
                        {msg.text || (msg.isStreaming ? '...' : '')}
                        {msg.isStreaming && msg.text ? (
                          <Text className="text-stone-400"> |</Text>
                        ) : null}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 mt-1.5 ml-1">
                      <FontAwesome6 name="robot" size={12} color="#9CA3AF" />
                      <Text className="text-stone-400 text-xs">
                        {msg.agentName || role.name}
                        {msg.isStreaming ? ' · 正在输入...' : ''}
                      </Text>
                    </View>
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
        )}
      </ScrollView>

      {/* Input */}
      <View
        className="bg-white px-4 py-3 flex-row items-center gap-3"
        style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6' }}
      >
        <TextInput
          className="flex-1 bg-stone-100 rounded-xl px-4 py-2.5 text-sm text-stone-800"
          placeholder="输入消息..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!isStreaming}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{
            backgroundColor: isStreaming ? '#D1D5DB' : role.color,
          }}
          onPress={handleSend}
          disabled={isStreaming || !input.trim()}
        >
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
