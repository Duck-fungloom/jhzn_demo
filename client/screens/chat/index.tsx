import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import SSE from 'react-native-sse';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

const ROLES = [
  { id: 'coach', name: 'Coach Alex', title: '教练', desc: '目标驱动，推动你突破', sub: '严格要求，聚焦结果', color: '#F97316', bg: '#FFF7ED', icon: 'dumbbell' as const },
  { id: 'mentor', name: 'Mentor Socra', title: '导师', desc: '知识渊博，解惑答疑', sub: '深度讲解，建立体系', color: '#3B82F6', bg: '#EFF6FF', icon: 'graduation-cap' as const },
  { id: 'partner', name: 'Partner Jamie', title: '陪练', desc: '并肩作战，共同成长', sub: '陪伴练习，互相鼓励', color: '#10B981', bg: '#ECFDF5', icon: 'handshake-angle' as const },
  { id: 'analyst', name: 'Analyst Sage', title: '分析师', desc: '精准诊断，数据说话', sub: '四维诊断，卡点定位', color: '#8B5CF6', bg: '#F5F3FF', icon: 'chart-column' as const },
];

interface ChatMessage {
  from: 'ai' | 'student';
  text: string;
  agent?: string;
  agentName?: string;
  agentColor?: string;
  agentIcon?: string;
  confidence?: number;
  isStreaming?: boolean;
  timestamp?: string;
}

// Agent avatar component
function AgentAvatar({ role, size = 'medium' }: { role: typeof ROLES[0]; size?: 'small' | 'medium' | 'large' }) {
  const sizeMap = { small: 32, medium: 44, large: 56 };
  const iconSizeMap = { small: 14, medium: 20, large: 24 };
  const s = sizeMap[size];
  const iconS = iconSizeMap[size];

  return (
    <View
      className="rounded-full items-center justify-center"
      style={{
        width: s,
        height: s,
        backgroundColor: role.bg,
        borderWidth: 2,
        borderColor: role.color + '30',
      }}
    >
      <FontAwesome6 name={role.icon} size={iconS} color={role.color} />
    </View>
  );
}

// Typing indicator animation
function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    };

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  const getStyle = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View className="flex-row items-center gap-1 px-2 py-1">
      {[dot1, dot2, dot3].map((anim, i) => (
        <Animated.View
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-stone-400"
          style={getStyle(anim)}
        />
      ))}
    </View>
  );
}

function RoleList() {
  const router = useSafeRouter();

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-4">
          <Text className="text-stone-900 font-bold text-2xl">AI 伙伴</Text>
          <Text className="text-stone-500 text-sm mt-1">选择一位 AI 伙伴开始对话</Text>
        </View>

        <View className="px-6 gap-3 pb-8">
          {ROLES.map((role) => (
            <TouchableOpacity
              key={role.id}
              className="bg-white rounded-2xl p-5 flex-row items-center border border-stone-100"
              onPress={() => router.push('/chat', { role: role.id })}
              activeOpacity={0.7}
            >
              <AgentAvatar role={role} size="large" />
              <View className="flex-1 ml-4">
                <View className="flex-row items-center gap-2">
                  <Text className="font-bold text-base text-stone-900">{role.name}</Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: role.color + '15' }}>
                    <Text className="text-xs font-medium" style={{ color: role.color }}>{role.title}</Text>
                  </View>
                </View>
                <Text className="text-stone-600 text-sm mt-1">{role.desc}</Text>
                <Text className="text-stone-400 text-xs mt-0.5">{role.sub}</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Info card */}
        <View className="mx-6 mb-8 bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <View className="flex-row items-center gap-2 mb-2">
            <FontAwesome6 name="circle-info" size={14} color="#2563EB" />
            <Text className="text-blue-700 text-sm font-medium">如何选择？</Text>
          </View>
          <Text className="text-stone-600 text-xs leading-5">
            需要动力和目标规划？找 Coach Alex{'\n'}
            有知识疑问需要解答？找 Mentor Socra{'\n'}
            想要陪伴式练习？找 Partner Jamie{'\n'}
            需要成绩分析？找 Analyst Sage
          </Text>
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
          const resp = await fetch(
            `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/${student.id}/chat/${role.id}/history`
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data.messages?.length > 0) {
              const historyMsgs: ChatMessage[] = data.messages.map(
                (m: { role: string; content: string; agent: string; created_at: string }) => ({
                  from: m.role === 'student' ? ('student' as const) : ('ai' as const),
                  text: m.content,
                  agent: m.agent,
                  timestamp: m.created_at,
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
    const studentMsg: ChatMessage = { from: 'student', text, timestamp: new Date().toISOString() };
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
      agentIcon: role.icon,
      isStreaming: true,
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    // Close previous SSE connection
    if (sseRef.current) {
      sseRef.current.close();
    }

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

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Screen>
      {/* Header */}
      <View
        className="px-4 pt-12 pb-4 flex-row items-center gap-3"
        style={{ backgroundColor: role.color }}
      >
        <TouchableOpacity
          className="w-10 h-10 rounded-full items-center justify-center bg-white/20"
          onPress={() => useSafeRouter().back()}
        >
          <FontAwesome6 name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <AgentAvatar role={role} size="medium" />
        <View className="flex-1">
          <Text className="text-white font-bold text-base">{role.name}</Text>
          <Text className="text-white/80 text-xs">{role.desc}</Text>
        </View>
        {isStreaming && (
          <View className="flex-row items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
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
          <View className="items-center justify-center py-16">
            <AgentAvatar role={role} size="large" />
            <Text className="text-stone-700 text-base font-medium mt-4">
              {role.name} 已准备好
            </Text>
            <Text className="text-stone-400 text-sm mt-2 text-center px-8">
              {role.id === 'coach' && '告诉我你的目标，我来帮你制定计划'}
              {role.id === 'mentor' && '有什么不懂的？我来用问题引导你思考'}
              {role.id === 'partner' && '嘿！今天想练什么？我们一起加油'}
              {role.id === 'analyst' && '提交你的练习，我来帮你精准诊断'}
            </Text>
            {/* Quick prompts */}
            <View className="flex-row flex-wrap gap-2 mt-6 justify-center">
              {[
                role.id === 'coach' ? '帮我制定学习计划' : null,
                role.id === 'mentor' ? '解释一下 CC 评分标准' : null,
                role.id === 'partner' ? '来一组口语练习' : null,
                role.id === 'analyst' ? '分析我的薄弱环节' : null,
                '我的目标分数是 7 分',
              ].filter(Boolean).map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  className="bg-white rounded-full px-4 py-2 border border-stone-200"
                  onPress={() => setInput(prompt!)}
                >
                  <Text className="text-stone-600 text-sm">{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View className="gap-4">
            {messages.map((msg, i) => {
              const showAgentInfo = msg.from === 'ai' && (
                i === 0 || messages[i - 1]?.from === 'student'
              );

              return (
                <View key={i}>
                  {msg.from === 'ai' ? (
                    <View className="flex-row items-start gap-2">
                      {/* Agent avatar - only show for first message in a sequence */}
                      {showAgentInfo ? (
                        <AgentAvatar role={role} size="small" />
                      ) : (
                        <View className="w-8" />
                      )}
                      <View className="flex-1 max-w-[85%]">
                        {/* Agent name */}
                        {showAgentInfo && (
                          <Text className="text-stone-500 text-xs mb-1 ml-1">
                            {msg.agentName || role.name}
                          </Text>
                        )}
                        {/* Message bubble */}
                        <View
                          className="rounded-2xl rounded-tl-sm px-4 py-3"
                          style={{
                            backgroundColor: role.bg,
                            borderLeftWidth: 3,
                            borderLeftColor: msg.agentColor || role.color,
                          }}
                        >
                          {msg.isStreaming && !msg.text ? (
                            <TypingIndicator />
                          ) : (
                            <Text className="text-stone-800 text-sm leading-6">
                              {msg.text}
                              {msg.isStreaming && (
                                <Text className="text-stone-400"> ▍</Text>
                              )}
                            </Text>
                          )}
                        </View>
                        {/* Timestamp */}
                        {msg.timestamp && !msg.isStreaming && (
                          <Text className="text-stone-400 text-[10px] mt-1 ml-1">
                            {formatTime(msg.timestamp)}
                          </Text>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View className="self-end max-w-[80%]">
                      <View className="bg-blue-500 rounded-2xl rounded-tr-sm px-4 py-3">
                        <Text className="text-white text-sm leading-6">{msg.text}</Text>
                      </View>
                      {msg.timestamp && (
                        <Text className="text-stone-400 text-[10px] mt-1 mr-1 text-right">
                          {formatTime(msg.timestamp)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View
        className="bg-white px-4 py-3 flex-row items-end gap-3"
        style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6' }}
      >
        <TextInput
          className="flex-1 bg-stone-100 rounded-2xl px-4 py-3 text-sm text-stone-800 max-h-32"
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
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: isStreaming || !input.trim() ? '#E5E7EB' : role.color,
          }}
          onPress={handleSend}
          disabled={isStreaming || !input.trim()}
        >
          <FontAwesome6
            name={isStreaming ? 'spinner' : 'paper-plane'}
            size={16}
            color={isStreaming || !input.trim() ? '#9CA3AF' : '#fff'}
            spin={isStreaming}
          />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

export default function ChatScreen() {
  const params = useSafeSearchParams<{ role?: string }>();
  return params.role ? <ChatView /> : <RoleList />;
}
