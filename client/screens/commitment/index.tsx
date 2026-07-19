import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

interface Commitment {
  id: string;
  title: string;
  description: string | null;
  target_frequency: number;
  completed_count: number;
  checkin_count: number;
  status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

// Commitment type presets
const COMMITMENT_PRESETS = [
  { title: '每日写作练习', description: '每天完成一篇写作练习', target_frequency: 7, icon: 'pen' as const },
  { title: '每周3次练习', description: '每周至少完成3次练习', target_frequency: 3, icon: 'calendar' as const },
  { title: '连续打卡7天', description: '连续7天完成学习目标', target_frequency: 7, icon: 'fire' as const },
  { title: '词汇积累', description: '每天学习20个新单词', target_frequency: 7, icon: 'book' as const },
];

export default function CommitmentScreen() {
  const { student } = useAuth();
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customFreq, setCustomFreq] = useState('7');
  const [submitting, setSubmitting] = useState(false);

  const fetchCommitments = async () => {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/${student?.id}/commitments`
      );
      const data = await response.json();
      setCommitments(data.commitments || []);
    } catch (error) {
      console.error('Failed to fetch commitments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCommitments();
    }, [student?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommitments();
  };

  const handleCreateCommitment = async () => {
    let title = customTitle;
    let description = customDesc;
    let targetFrequency = parseInt(customFreq) || 7;

    if (selectedPreset !== null) {
      const preset = COMMITMENT_PRESETS[selectedPreset];
      title = preset.title;
      description = preset.description;
      targetFrequency = preset.target_frequency;
    }

    if (!title.trim()) {
      alert('请输入承诺标题');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/${student?.id}/commitments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            target_frequency: targetFrequency,
          }),
        }
      );

      if (response.ok) {
        setModalVisible(false);
        resetForm();
        fetchCommitments();
      }
    } catch (error) {
      console.error('Failed to create commitment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckin = async (commitmentId: string) => {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/student/${student?.id}/commitments/${commitmentId}/checkin`,
        { method: 'POST' }
      );

      if (response.ok) {
        fetchCommitments();
      }
    } catch (error) {
      console.error('Failed to checkin:', error);
    }
  };

  const resetForm = () => {
    setSelectedPreset(null);
    setCustomTitle('');
    setCustomDesc('');
    setCustomFreq('7');
  };

  const getProgressPercent = (commitment: Commitment) => {
    if (commitment.target_frequency <= 0) return 0;
    return Math.min(100, Math.round((commitment.checkin_count / commitment.target_frequency) * 100));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4F46E5';
      case 'completed': return '#10B981';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '已失败';
      default: return status;
    }
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 bg-gray-50 items-center justify-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-4 text-gray-500">加载承诺中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-indigo-600 px-5 pt-12 pb-16">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-2xl font-bold">承诺追踪</Text>
              <Text className="text-indigo-200 text-sm mt-1">
                坚持你的学习目标
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="bg-white/20 px-4 py-2 rounded-full flex-row items-center"
            >
              <FontAwesome6 name="plus" size={14} color="#fff" />
              <Text className="text-white font-medium ml-2">新建承诺</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Summary */}
        <View className="mx-5 -mt-10 bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-indigo-600">
                {commitments.filter(c => c.status === 'active').length}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">进行中</Text>
            </View>
            <View className="w-px bg-gray-200" />
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">
                {commitments.filter(c => c.status === 'completed').length}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">已完成</Text>
            </View>
            <View className="w-px bg-gray-200" />
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-600">
                {commitments.reduce((sum, c) => sum + c.checkin_count, 0)}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">总打卡</Text>
            </View>
          </View>
        </View>

        {/* Commitments List */}
        <ScrollView
          className="flex-1 px-5 mt-4"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {commitments.length === 0 ? (
            <View className="items-center justify-center py-16">
              <FontAwesome6 name="handshake" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-4 text-center">
                还没有任何承诺{'\n'}点击上方按钮创建你的第一个承诺
              </Text>
            </View>
          ) : (
            commitments.map((commitment) => {
              const progress = getProgressPercent(commitment);
              const statusColor = getStatusColor(commitment.status);

              return (
                <View
                  key={commitment.id}
                  className="bg-white rounded-2xl p-4 mb-3 shadow-sm"
                >
                  {/* Header */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 mr-3">
                      <Text className="text-base font-semibold text-gray-900">
                        {commitment.title}
                      </Text>
                      {commitment.description && (
                        <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                          {commitment.description}
                        </Text>
                      )}
                    </View>
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${statusColor}15` }}
                    >
                      <Text className="text-xs font-medium" style={{ color: statusColor }}>
                        {getStatusText(commitment.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-xs text-gray-500">
                        打卡进度
                      </Text>
                      <Text className="text-xs font-medium text-gray-700">
                        {commitment.checkin_count} / {commitment.target_frequency}
                      </Text>
                    </View>
                    <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                    </View>
                    <Text className="text-xs text-gray-400 mt-1 text-right">
                      {progress}%
                    </Text>
                  </View>

                  {/* Footer */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
                    <Text className="text-xs text-gray-400">
                      开始于 {new Date(commitment.started_at).toLocaleDateString('zh-CN')}
                    </Text>
                    {commitment.status === 'active' && (
                      <TouchableOpacity
                        onPress={() => handleCheckin(commitment.id)}
                        className="bg-indigo-600 px-4 py-2 rounded-full flex-row items-center"
                      >
                        <FontAwesome6 name="check" size={12} color="#fff" />
                        <Text className="text-white text-sm font-medium ml-1">
                          打卡
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View className="h-6" />
        </ScrollView>

        {/* Create Commitment Modal */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setModalVisible(false);
            resetForm();
          }}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[85%]">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
                <Text className="text-lg font-bold text-gray-900">新建承诺</Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="px-5 py-4">
                {/* Preset Selection */}
                <Text className="text-sm font-medium text-gray-700 mb-3">
                  快速选择
                </Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {COMMITMENT_PRESETS.map((preset, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedPreset(index);
                        setCustomTitle('');
                        setCustomDesc('');
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        selectedPreset === index
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <View className="flex-row items-center">
                        <FontAwesome6
                          name={preset.icon}
                          size={12}
                          color={selectedPreset === index ? '#fff' : '#4F46E5'}
                        />
                        <Text
                          className={`text-sm font-medium ml-2 ${
                            selectedPreset === index ? 'text-white' : 'text-indigo-600'
                          }`}
                        >
                          {preset.title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Input */}
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  或自定义
                </Text>

                <View className="mb-4">
                  <Text className="text-xs text-gray-500 mb-1">标题 *</Text>
                  <TextInput
                    value={customTitle}
                    onChangeText={(text) => {
                      setCustomTitle(text);
                      setSelectedPreset(null);
                    }}
                    placeholder="例如：每天背50个单词"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-xs text-gray-500 mb-1">描述（可选）</Text>
                  <TextInput
                    value={customDesc}
                    onChangeText={(text) => {
                      setCustomDesc(text);
                      setSelectedPreset(null);
                    }}
                    placeholder="描述你的承诺内容"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                    className="bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900"
                    textAlignVertical="top"
                  />
                </View>

                <View className="mb-6">
                  <Text className="text-xs text-gray-500 mb-1">目标频次（天）</Text>
                  <View className="flex-row items-center gap-2">
                    {[3, 7, 14, 21, 30].map((days) => (
                      <TouchableOpacity
                        key={days}
                        onPress={() => {
                          setCustomFreq(String(days));
                          setSelectedPreset(null);
                        }}
                        className={`flex-1 py-3 rounded-xl items-center ${
                          customFreq === String(days)
                            ? 'bg-indigo-600'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            customFreq === String(days) ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {days}天
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleCreateCommitment}
                  disabled={submitting || (!selectedPreset && !customTitle.trim())}
                  className={`py-4 rounded-2xl items-center mb-4 ${
                    submitting || (!selectedPreset && !customTitle.trim())
                      ? 'bg-gray-200'
                      : 'bg-indigo-600'
                  }`}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      className={`text-base font-bold ${
                        submitting || (!selectedPreset && !customTitle.trim())
                          ? 'text-gray-400'
                          : 'text-white'
                      }`}
                    >
                      创建承诺
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}
