/**
 * 写作编辑器 — 生产性失败完整流程
 * Phase: try → stuck → scaffold → revise → submitted
 *
 * 服务端文件: server/src/routes/student.ts
 * 接口:
 *   PUT  /api/v1/student/:id/practice-sessions/:sessionId/content
 *     Body: { phase: string, content: string, word_count: number }
 *   PUT  /api/v1/student/:id/practice-sessions/:sessionId/phase
 *     Body: { status: string }
 *   POST /api/v1/student/:id/practice-sessions/:sessionId/submit
 *   POST /api/v1/student/:id/chat/with-memory (SSE)
 *     Body: { message: string, selected_role: string, practice_session_id: string, current_moment: string }
 *   GET  /api/v1/student/:id/practice-sessions/:sessionId/comparison
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Dimensions, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventSource from 'react-native-sse';

const { width: SCREEN_W } = Dimensions.get('window');
const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

// 写作题目
const TASK = {
  title: 'Some people believe that technology has made our lives more complex. To what extent do you agree or disagree?',
  type: 'Task 2 · 议论文',
  band: '目标 Band 6.5+',
  time: 40,
  tips: [
    '明确你的立场（同意/不同意/部分同意）',
    '每个段落一个核心论点 + 解释 + 举例',
    '使用衔接词连接观点（However, Furthermore, For instance）',
    '结尾段总结立场并给出建议',
  ],
};

type Phase = 'try' | 'stuck' | 'scaffold' | 'revise' | 'submitted';

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  scaffoldLevel?: number;
}

export default function WritingScreen() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const [sessionId, setSessionId] = useState(id || 'demo-session-1');
  const studentId = 'test-student';

  // Phase state machine
  const [phase, setPhase] = useState<Phase>('try');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TASK.time * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scaffold chat
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeScaffoldLevel, setActiveScaffoldLevel] = useState(0);

  // Auto-save
  const draftKey = `draft_${studentId}_${sessionId}`;
  const lastSaveRef = useRef(0);

  // Create session on mount
  useEffect(() => {
    let cancelled = false;
    const createSession = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/student/${studentId}/practice-sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: 'task-writing-1', task_type: 'writing' }),
        });
        const data = await res.json();
        if (!cancelled && data.id) {
          setSessionId(data.id);
        }
      } catch (e) {
        console.warn('Failed to create session:', e);
      }
    };
    createSession();
    return () => { cancelled = true; };
  }, []);

  // Timer
  useEffect(() => {
    if (isPaused || phase === 'submitted') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, phase]);

  // Word count
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [content]);

  // Auto-save draft every 30s
  useEffect(() => {
    if (phase !== 'try' && phase !== 'revise') return;
    const interval = setInterval(async () => {
      if (content.trim().length === 0) return;
      const now = Date.now();
      if (now - lastSaveRef.current < 25000) return;
      lastSaveRef.current = now;
      try {
        await AsyncStorage.setItem(draftKey, JSON.stringify({
          content, phase, timestamp: now, studentId, sessionId,
        }));
        // Also save to backend
        await fetch(`${API_BASE}/api/v1/student/${studentId}/practice-sessions/${sessionId}/content`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phase, content, word_count: wordCount }),
        }).catch((e) => console.warn('Auto-save to backend failed:', e));
      } catch (e) {
        console.warn('Auto-save failed:', e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [content, phase, wordCount, draftKey, sessionId]);

  // Load draft on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(draftKey);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.content) {
            setContent(draft.content);
            setPhase(draft.phase || 'try');
          }
        }
      } catch (e) {
        console.warn('Load draft failed:', e);
      }
    })();
  }, [draftKey]);

  // Format time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isTimeLow = timeLeft < 120; // < 2 min

  // Submit essay → go to scaffold
  const handleSubmitEssay = useCallback(async () => {
    if (content.trim().length < 20) return;
    setIsSubmitting(true);
    setOriginalContent(content);
    try {
      await fetch(`${API_BASE}/api/v1/student/${studentId}/practice-sessions/${sessionId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'try', content, word_count: wordCount }),
      });
      await fetch(`${API_BASE}/api/v1/student/${studentId}/practice-sessions/${sessionId}/phase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'stuck' }),
      });
      // Clear draft
      await AsyncStorage.removeItem(draftKey);
      setPhase('stuck');
      // Auto-transition to scaffold after brief pause
      setTimeout(() => setPhase('scaffold'), 800);
    } catch (e) {
      console.warn('Submit failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  }, [content, wordCount, sessionId, draftKey]);

  // "I'm stuck" button
  const handleStuck = useCallback(() => {
    setOriginalContent(content);
    setPhase('stuck');
    setTimeout(() => setPhase('scaffold'), 500);
  }, [content]);

  // Send message to Mentor Agent (Scaffold chat)
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isStreaming) return;
    const userMsg = inputText.trim();
    setInputText('');

    const userChatMsg: ChatMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMsg,
    };
    setMessages(prev => [...prev, userChatMsg]);
    setIsStreaming(true);

    const assistantMsg: ChatMsg = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      scaffoldLevel: activeScaffoldLevel || undefined,
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const es = new EventSource(
        `${API_BASE}/api/v1/student/${studentId}/chat/with-memory`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg,
            selected_role: 'mentor',
            practice_session_id: sessionId,
            current_moment: 'practice_plateau',
            conversation_id: `scaffold-${sessionId}`,
          }),
        } as any
      );

      let fullContent = '';

      es.addEventListener('message', (event) => {
        if (event.data === '[DONE]') {
          es.close();
          setIsStreaming(false);
          setActiveScaffoldLevel(0);
          return;
        }
        try {
          const parsed = JSON.parse(event.data || '{}');
          if (parsed.type === 'chunk' && parsed.content) {
            fullContent += parsed.content;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsg.id ? { ...m, content: fullContent } : m
              )
            );
          }
        } catch (_e) {
          // skip non-JSON lines
        }
      });

      es.addEventListener('error', () => {
        es.close();
        if (!fullContent) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id
                ? { ...m, content: '网络异常，请重试。' }
                : m
            )
          );
        }
        setIsStreaming(false);
        setActiveScaffoldLevel(0);
      });
    } catch (e) {
      console.warn('SSE error:', e);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: '网络异常，请重试。' }
            : m
        )
      );
      setIsStreaming(false);
      setActiveScaffoldLevel(0);
    }
  }, [inputText, isStreaming, activeScaffoldLevel, sessionId]);

  // Request scaffold at specific level
  const handleScaffoldRequest = useCallback(async (level: number) => {
    setActiveScaffoldLevel(level);
    const prompts: Record<number, string> = {
      1: '请给我一个方向性的提示，让我自己想想怎么改。',
      2: '我确实卡住了，请给我更具体的提示和思路。',
      3: '请给我一个完整的示范，我来学习结构。',
    };
    setInputText('');
    setIsStreaming(true);

    const userMsg: ChatMsg = {
      id: `user-scaffold-${Date.now()}`,
      role: 'user',
      content: prompts[level],
      scaffoldLevel: level,
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsg: ChatMsg = {
      id: `assistant-scaffold-${Date.now()}`,
      role: 'assistant',
      content: '',
      scaffoldLevel: level,
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const es = new EventSource(
        `${API_BASE}/api/v1/student/${studentId}/chat/with-memory`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompts[level],
            selected_role: 'mentor',
            practice_session_id: sessionId,
            current_moment: 'practice_plateau',
            conversation_id: `scaffold-${sessionId}`,
            scaffold_level: level,
          }),
        } as any
      );

      let fullContent = '';

      es.addEventListener('message', (event) => {
        if (event.data === '[DONE]') {
          es.close();
          setIsStreaming(false);
          setActiveScaffoldLevel(0);
          return;
        }
        try {
          const parsed = JSON.parse(event.data || '{}');
          if (parsed.type === 'chunk' && parsed.content) {
            fullContent += parsed.content;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsg.id ? { ...m, content: fullContent } : m
              )
            );
          }
        } catch (_e) {
          // skip
        }
      });

      es.addEventListener('error', () => {
        es.close();
        if (!fullContent) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id
                ? { ...m, content: '网络异常，请重试。' }
                : m
            )
          );
        }
        setIsStreaming(false);
        setActiveScaffoldLevel(0);
      });
    } catch (e) {
      console.warn('Scaffold SSE error:', e);
      setIsStreaming(false);
      setActiveScaffoldLevel(0);
    }
  }, [sessionId]);

  // Go to REVISE phase
  const handleGoToRevise = useCallback(() => {
    setPhase('revise');
  }, []);

  // Final submit
  const handleFinalSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await fetch(`${API_BASE}/api/v1/student/${studentId}/practice-sessions/${sessionId}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase: 'revise', content, word_count: wordCount }),
      });
      await fetch(`${API_BASE}/api/v1/student/${studentId}/practice-sessions/${sessionId}/submit`, {
        method: 'POST',
      });
      await AsyncStorage.removeItem(draftKey);
      setPhase('submitted');
      // Navigate to comparison page
      setTimeout(() => {
        router.push('/comparison', { sessionId });
      }, 1000);
    } catch (e) {
      console.warn('Final submit failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  }, [content, wordCount, sessionId, draftKey, router]);

  // Phase indicator
  const phases = [
    { key: 'try', label: 'TRY', desc: '初稿写作' },
    { key: 'stuck', label: 'STUCK', desc: '遇到困难' },
    { key: 'scaffold', label: 'SCAFFOLD', desc: '支架引导' },
    { key: 'revise', label: 'REVISE', desc: '修改提升' },
  ];
  const currentPhaseIndex = phases.findIndex(p => p.key === phase);

  // ============ RENDER ============

  // Phase indicator bar
  const renderPhaseIndicator = () => (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-stone-100">
      {phases.map((p, idx) => {
        const isActive = idx === currentPhaseIndex;
        const isDone = idx < currentPhaseIndex;
        return (
          <View key={p.key} className="flex-1 items-center">
            <View className="flex-row items-center w-full">
              {idx > 0 && (
                <View className={`h-0.5 flex-1 ${isDone || isActive ? 'bg-indigo-500' : 'bg-stone-200'}`} />
              )}
              <View
                className={`w-7 h-7 rounded-full items-center justify-center ${
                  isDone ? 'bg-indigo-500' : isActive ? 'bg-indigo-500' : 'bg-stone-200'
                }`}
              >
                {isDone ? (
                  <FontAwesome6 name="check" size={12} color="#fff" />
                ) : (
                  <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-stone-400'}`}>
                    {idx + 1}
                  </Text>
                )}
              </View>
              {idx < phases.length - 1 && (
                <View className={`h-0.5 flex-1 ${isDone ? 'bg-indigo-500' : 'bg-stone-200'}`} />
              )}
            </View>
            <Text className={`text-[10px] mt-1 font-medium ${isActive ? 'text-indigo-600' : isDone ? 'text-indigo-400' : 'text-stone-400'}`}>
              {p.label}
            </Text>
          </View>
        );
      })}
    </View>
  );

  // Timer display
  const renderTimer = () => (
    <View className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full ${isTimeLow ? 'bg-red-50' : 'bg-stone-50'}`}>
      <FontAwesome6
        name={isPaused ? 'pause' : 'clock'}
        size={14}
        color={isTimeLow ? '#EF4444' : '#78716C'}
      />
      <Text className={`text-sm font-mono font-bold ${isTimeLow ? 'text-red-500' : 'text-stone-600'}`}>
        {formatTime(timeLeft)}
      </Text>
      <TouchableOpacity onPress={() => setIsPaused(!isPaused)} className="ml-1">
        <FontAwesome6
          name={isPaused ? 'play' : 'pause'}
          size={12}
          color="#78716C"
        />
      </TouchableOpacity>
    </View>
  );

  // TRY Phase - Writing Editor
  const renderTryPhase = () => (
    <View className="flex-1">
      {/* Task prompt card */}
      <View className="mx-4 mt-4 bg-indigo-50 rounded-2xl p-4">
        <View className="flex-row items-center gap-2 mb-2">
          <FontAwesome6 name="pen-to-square" size={14} color="#4F46E5" />
          <Text className="text-indigo-700 font-bold text-sm">{TASK.type}</Text>
          <View className="ml-auto px-2 py-0.5 bg-indigo-100 rounded-full">
            <Text className="text-indigo-600 text-xs font-medium">{TASK.band}</Text>
          </View>
        </View>
        <Text className="text-stone-800 text-sm leading-5 mb-3">{TASK.title}</Text>
        <View className="gap-1.5">
          {TASK.tips.map((tip, idx) => (
            <View key={idx} className="flex-row items-start gap-2">
              <FontAwesome6 name="lightbulb" size={10} color="#D97706" />
              <Text className="text-stone-500 text-xs flex-1">{tip}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Text area */}
      <View className="flex-1 mx-4 mt-4">
        <TextInput
          className="flex-1 bg-white rounded-2xl p-4 text-stone-800 text-sm leading-6 text-align-vertical top"
          placeholder="在这里开始你的写作..."
          placeholderTextColor="#A8A29E"
          multiline
          value={content}
          onChangeText={setContent}
          style={{ minHeight: 200 }}
        />
      </View>

      {/* Bottom bar: word count + actions */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-t border-stone-100">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <FontAwesome6 name="font" size={12} color="#78716C" />
            <Text className="text-stone-500 text-sm font-medium">{wordCount} words</Text>
          </View>
          {renderTimer()}
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200"
            onPress={handleStuck}
          >
            <Text className="text-amber-700 text-sm font-bold">我卡住了</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-xl ${content.trim().length >= 20 ? 'bg-indigo-500' : 'bg-stone-200'}`}
            onPress={handleSubmitEssay}
            disabled={content.trim().length < 20 || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className={`text-sm font-bold ${content.trim().length >= 20 ? 'text-white' : 'text-stone-400'}`}>
                提交版本
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // STUCK Phase - Transition
  const renderStuckPhase = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-4">
        <FontAwesome6 name="lightbulb" size={28} color="#D97706" />
      </View>
      <Text className="text-stone-800 font-bold text-lg text-center mb-2">遇到困难？没关系！</Text>
      <Text className="text-stone-500 text-sm text-center leading-5">
        每个人在写作中都会遇到瓶颈。让 Mentor Socra 来引导你，她会用提问的方式帮你自己找到答案。
      </Text>
      <ActivityIndicator size="small" color="#4F46E5" className="mt-6" />
      <Text className="text-indigo-500 text-sm mt-2">正在准备支架引导...</Text>
    </View>
  );

  // SCAFFOLD Phase - Chat with Mentor
  const renderScaffoldPhase = () => (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Scaffold info */}
      <View className="mx-4 mt-3 bg-amber-50 rounded-xl p-3">
        <View className="flex-row items-center gap-2 mb-1">
          <FontAwesome6 name="graduation-cap" size={14} color="#D97706" />
          <Text className="text-amber-800 font-bold text-sm">Mentor Socra 来帮你</Text>
        </View>
        <Text className="text-amber-700 text-xs">
          她不会直接给你答案，而是通过提问帮你自己想出来。选择支架级别或自由提问。
        </Text>
      </View>

      {/* Scaffold level buttons */}
      <View className="flex-row gap-2 px-4 mt-3">
        {[
          { level: 1, label: '试试自己改', icon: 'pencil', color: '#10B981', bg: '#ECFDF5' },
          { level: 2, label: '给提示', icon: 'compass', color: '#F59E0B', bg: '#FFFBEB' },
          { level: 3, label: '看示范', icon: 'eye', color: '#8B5CF6', bg: '#F5F3FF' },
        ].map(s => (
          <TouchableOpacity
            key={s.level}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
            style={{ backgroundColor: s.bg, borderWidth: 1, borderColor: s.color + '30' }}
            onPress={() => handleScaffoldRequest(s.level)}
            disabled={isStreaming}
          >
            <FontAwesome6 name={s.icon} size={12} color={s.color} />
            <Text className="text-xs font-bold" style={{ color: s.color }}>L{s.level}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat messages */}
      <ScrollView
        className="flex-1 mt-3 px-4"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <View
            key={msg.id}
            className={`mb-3 max-w-[85%] ${msg.role === 'user' ? 'self-end' : 'self-start'}`}
          >
            {msg.role === 'assistant' && msg.scaffoldLevel && (
              <View className="flex-row items-center gap-1 mb-1">
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: msg.scaffoldLevel === 1 ? '#ECFDF5' : msg.scaffoldLevel === 2 ? '#FFFBEB' : '#F5F3FF' }}
                >
                  <Text className="text-[10px] font-bold" style={{
                    color: msg.scaffoldLevel === 1 ? '#10B981' : msg.scaffoldLevel === 2 ? '#F59E0B' : '#8B5CF6'
                  }}>
                    L{msg.scaffoldLevel}
                  </Text>
                </View>
              </View>
            )}
            <View
              className={`rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-indigo-500 rounded-br-md'
                  : 'bg-white rounded-bl-md'
              }`}
              style={msg.role === 'assistant' ? {
                shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
              } : {}}
            >
              <Text className={`text-sm leading-5 ${msg.role === 'user' ? 'text-white' : 'text-stone-700'}`}>
                {msg.content || (isStreaming ? '...' : '')}
              </Text>
            </View>
          </View>
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
          <View className="self-start bg-white rounded-2xl rounded-bl-md px-4 py-3"
            style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
            <View className="flex-row gap-1">
              {[0, 200, 400].map(delay => (
                <View key={delay} className="w-2 h-2 rounded-full bg-indigo-300" />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View className="flex-row items-end gap-2 px-4 py-3 bg-white border-t border-stone-100">
        <TextInput
          className="flex-1 bg-stone-50 rounded-2xl px-4 py-3 text-sm text-stone-800"
          placeholder="输入你的想法..."
          placeholderTextColor="#A8A29E"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          editable={!isStreaming}
          onSubmitEditing={handleSendMessage}
        />
        <TouchableOpacity
          className={`w-10 h-10 rounded-full items-center justify-center ${inputText.trim() && !isStreaming ? 'bg-indigo-500' : 'bg-stone-200'}`}
          onPress={handleSendMessage}
          disabled={!inputText.trim() || isStreaming}
        >
          <FontAwesome6 name="arrow-up" size={16} color={inputText.trim() && !isStreaming ? '#fff' : '#A8A29E'} />
        </TouchableOpacity>
      </View>

      {/* Go to revise button */}
      {messages.length >= 2 && (
        <TouchableOpacity
          className="mx-4 mb-3 py-3 rounded-xl bg-indigo-500"
          onPress={handleGoToRevise}
        >
          <Text className="text-white text-center font-bold text-sm">
            我已经理解了，进入修改阶段
          </Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );

  // REVISE Phase
  const renderRevisePhase = () => (
    <View className="flex-1">
      {/* Info banner */}
      <View className="mx-4 mt-3 bg-green-50 rounded-xl p-3">
        <View className="flex-row items-center gap-2">
          <FontAwesome6 name="pen" size={14} color="#059669" />
          <Text className="text-green-800 font-bold text-sm">修改阶段</Text>
        </View>
        <Text className="text-green-700 text-xs mt-1">
          根据 Mentor 的引导，修改你的文章。点击上方标签切换原文/新稿。
        </Text>
      </View>

      {/* Tab switcher */}
      <View className="flex-row mx-4 mt-3 gap-2">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-xl items-center ${activeScaffoldLevel === 0 ? 'bg-indigo-500' : 'bg-stone-100'}`}
          onPress={() => setActiveScaffoldLevel(0)}
        >
          <Text className={`text-sm font-bold ${activeScaffoldLevel === 0 ? 'text-white' : 'text-stone-500'}`}>
            我的新稿
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-xl items-center ${activeScaffoldLevel === 1 ? 'bg-indigo-500' : 'bg-stone-100'}`}
          onPress={() => setActiveScaffoldLevel(1)}
        >
          <Text className={`text-sm font-bold ${activeScaffoldLevel === 1 ? 'text-white' : 'text-stone-500'}`}>
            查看原文
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content area */}
      <View className="flex-1 mx-4 mt-3">
        {activeScaffoldLevel === 0 ? (
          <TextInput
            className="flex-1 bg-white rounded-2xl p-4 text-stone-800 text-sm leading-6 text-align-vertical top"
            placeholder="在这里修改你的文章..."
            placeholderTextColor="#A8A29E"
            multiline
            value={content}
            onChangeText={setContent}
            style={{ minHeight: 200 }}
          />
        ) : (
          <ScrollView className="flex-1 bg-stone-50 rounded-2xl p-4">
            <Text className="text-stone-600 text-sm leading-6">{originalContent || '暂无原文内容'}</Text>
          </ScrollView>
        )}
      </View>

      {/* Bottom bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-t border-stone-100">
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <FontAwesome6 name="font" size={12} color="#78716C" />
            <Text className="text-stone-500 text-sm font-medium">{wordCount} words</Text>
          </View>
          {renderTimer()}
        </View>
        <TouchableOpacity
          className={`px-5 py-2.5 rounded-xl ${content.trim().length >= 20 ? 'bg-indigo-500' : 'bg-stone-200'}`}
          onPress={handleFinalSubmit}
          disabled={content.trim().length < 20 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className={`text-sm font-bold ${content.trim().length >= 20 ? 'text-white' : 'text-stone-400'}`}>
              提交最终版
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // SUBMITTED Phase
  const renderSubmittedPhase = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center mb-4">
        <FontAwesome6 name="check" size={28} color="#059669" />
      </View>
      <Text className="text-stone-800 font-bold text-lg text-center mb-2">提交成功！</Text>
      <Text className="text-stone-500 text-sm text-center leading-5">
        正在生成诊断报告，稍后可在首页查看结果。
      </Text>
      <ActivityIndicator size="small" color="#4F46E5" className="mt-6" />
    </View>
  );

  return (
    <Screen>
      <View className="flex-1 bg-stone-50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-2 pb-3 bg-white border-b border-stone-100">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <FontAwesome6 name="arrow-left" size={18} color="#44403C" />
          </TouchableOpacity>
          <Text className="text-stone-900 font-bold text-base">写作练习</Text>
          <View className="w-10" />
        </View>

        {/* Phase indicator */}
        {renderPhaseIndicator()}

        {/* Phase content */}
        {phase === 'try' && renderTryPhase()}
        {phase === 'stuck' && renderStuckPhase()}
        {phase === 'scaffold' && renderScaffoldPhase()}
        {phase === 'revise' && renderRevisePhase()}
        {phase === 'submitted' && renderSubmittedPhase()}
      </View>
    </Screen>
  );
}
