import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Modal, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

interface NotifPrefs {
  morning_enabled: boolean;
  afternoon_enabled: boolean;
  evening_enabled: boolean;
  morning_time: string;
  afternoon_time: string;
  evening_time: string;
  weekend_mode: string;
}

// Time picker modal
function TimePickerModal({
  visible,
  currentTime,
  onConfirm,
  onCancel,
  title,
}: {
  visible: boolean;
  currentTime: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  title: string;
}) {
  const [selectedHour, setSelectedHour] = useState(parseInt(currentTime.split(':')[0]) || 8);
  const [selectedMinute, setSelectedMinute] = useState(parseInt(currentTime.split(':')[1]) || 0);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-stone-100">
            <TouchableOpacity onPress={onCancel}>
              <Text className="text-stone-500 text-base">取消</Text>
            </TouchableOpacity>
            <Text className="text-stone-900 font-semibold text-base">{title}</Text>
            <TouchableOpacity onPress={() => {
              const time = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
              onConfirm(time);
            }}>
              <Text className="text-blue-600 font-semibold text-base">确定</Text>
            </TouchableOpacity>
          </View>

          {/* Time selection */}
          <View className="flex-row items-center justify-center py-8">
            {/* Hours */}
            <ScrollView className="h-48 w-24" showsVerticalScrollIndicator={false}>
              <View className="h-16" />
              {hours.map(h => (
                <TouchableOpacity
                  key={h}
                  className="py-3 items-center"
                  onPress={() => setSelectedHour(h)}
                >
                  <Text
                    className="text-2xl"
                    style={{
                      color: selectedHour === h ? '#2563EB' : '#78716C',
                      fontWeight: selectedHour === h ? '700' : '400',
                    }}
                  >
                    {h.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
              <View className="h-16" />
            </ScrollView>

            <Text className="text-stone-900 text-2xl font-light mx-4">:</Text>

            {/* Minutes */}
            <ScrollView className="h-48 w-24" showsVerticalScrollIndicator={false}>
              <View className="h-16" />
              {minutes.map(m => (
                <TouchableOpacity
                  key={m}
                  className="py-3 items-center"
                  onPress={() => setSelectedMinute(m)}
                >
                  <Text
                    className="text-2xl"
                    style={{
                      color: selectedMinute === m ? '#2563EB' : '#78716C',
                      fontWeight: selectedMinute === m ? '700' : '400',
                    }}
                  >
                    {m.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
              <View className="h-16" />
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { student } = useAuth();
  const router = useSafeRouter();
  const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  const [prefs, setPrefs] = useState<NotifPrefs>({
    morning_enabled: true,
    afternoon_enabled: true,
    evening_enabled: true,
    morning_time: '07:00',
    afternoon_time: '10:00',
    evening_time: '20:00',
    weekend_mode: 'evening_only',
  });
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<'morning' | 'afternoon' | 'evening' | null>(null);

  useFocusEffect(useCallback(() => {
    if (!student) return;
    fetch(`${BASE_URL}/api/v1/student/${student.id}/notification-prefs`)
      .then(r => r.json())
      .then(data => {
        if (data.prefs) setPrefs(prev => ({ ...prev, ...data.prefs }));
      })
      .catch((e) => console.warn("Settings error:", e));
  }, [student?.id]));

  const togglePref = async (key: keyof NotifPrefs, value: boolean | string) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    if (!student) return;
    try {
      await fetch(`${BASE_URL}/api/v1/student/${student.id}/notification-prefs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Update prefs error:', err);
    }
  };

  const openTimePicker = (slot: 'morning' | 'afternoon' | 'evening') => {
    setEditingSlot(slot);
    setTimePickerVisible(true);
  };

  const handleTimeConfirm = (time: string) => {
    if (editingSlot) {
      togglePref(`${editingSlot}_time` as keyof NotifPrefs, time);
    }
    setTimePickerVisible(false);
    setEditingSlot(null);
  };

  const getTimeForSlot = (slot: 'morning' | 'afternoon' | 'evening') => {
    switch (slot) {
      case 'morning': return prefs.morning_time;
      case 'afternoon': return prefs.afternoon_time;
      case 'evening': return prefs.evening_time;
    }
  };

  const getEnabledForSlot = (slot: 'morning' | 'afternoon' | 'evening') => {
    switch (slot) {
      case 'morning': return prefs.morning_enabled;
      case 'afternoon': return prefs.afternoon_enabled;
      case 'evening': return prefs.evening_enabled;
    }
  };

  const slots = [
    { key: 'morning' as const, label: '早间计划', desc: '开启美好的一天', icon: 'sun' as const, color: '#F59E0B', bgColor: '#FFFBEB' },
    { key: 'afternoon' as const, label: '上午练习', desc: '专注学习时间', icon: 'cloud-sun' as const, color: '#3B82F6', bgColor: '#EFF6FF' },
    { key: 'evening' as const, label: '晚间回顾', desc: '总结今日收获', icon: 'moon' as const, color: '#8B5CF6', bgColor: '#F5F3FF' },
  ];

  const weekendModes = [
    { value: 'same', label: '照常提醒', desc: '和工作日一样的提醒时间', icon: 'calendar-check' as const },
    { value: 'delay_1h', label: '推迟 1 小时', desc: '睡个懒觉，晚点开始', icon: 'clock' as const },
    { value: 'evening_only', label: '仅晚间提醒', desc: '只在晚上提醒你回顾', icon: 'moon' as const },
    { value: 'off', label: '关闭提醒', desc: '周末完全不打扰', icon: 'bell-slash' as const },
  ];

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-8">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2">
              <FontAwesome6 name="arrow-left" size={20} color="#44403c" />
            </TouchableOpacity>
            <Text className="text-stone-800 text-xl font-bold">提醒设置</Text>
          </View>

          {/* Daily reminders */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-6 h-6 rounded-full bg-amber-100 items-center justify-center">
                <FontAwesome6 name="bell" size={10} color="#D97706" />
              </View>
              <Text className="text-stone-700 font-semibold text-sm">每日提醒</Text>
            </View>

            <View className="bg-white rounded-2xl overflow-hidden border border-stone-100">
              {slots.map((slot, idx) => {
                const isEnabled = getEnabledForSlot(slot.key);
                const time = getTimeForSlot(slot.key);
                return (
                  <View
                    key={slot.key}
                    className={`flex-row items-center justify-between px-4 py-4 ${idx > 0 ? 'border-t border-stone-100' : ''}`}
                  >
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: slot.bgColor }}
                      >
                        <FontAwesome6 name={slot.icon} size={16} color={slot.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-stone-800 text-sm font-medium">{slot.label}</Text>
                        <Text className="text-stone-400 text-xs">{slot.desc}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-3">
                      {isEnabled && (
                        <TouchableOpacity
                          className="bg-stone-100 px-3 py-1.5 rounded-full"
                          onPress={() => openTimePicker(slot.key)}
                        >
                          <Text className="text-stone-600 text-sm font-medium">{time}</Text>
                        </TouchableOpacity>
                      )}
                      <Switch
                        value={isEnabled}
                        onValueChange={(v) => togglePref(`${slot.key}_enabled` as keyof NotifPrefs, v)}
                        trackColor={{ true: '#6366f1', false: '#d6d3d1' }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Weekend mode */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-6 h-6 rounded-full bg-indigo-100 items-center justify-center">
                <FontAwesome6 name="calendar-week" size={10} color="#4F46E5" />
              </View>
              <Text className="text-stone-700 font-semibold text-sm">周末模式</Text>
            </View>

            <View className="bg-white rounded-2xl overflow-hidden border border-stone-100">
              {weekendModes.map((mode, idx) => {
                const isSelected = prefs.weekend_mode === mode.value;
                return (
                  <TouchableOpacity
                    key={mode.value}
                    onPress={() => togglePref('weekend_mode', mode.value)}
                    className={`flex-row items-center px-4 py-4 ${idx > 0 ? 'border-t border-stone-100' : ''}`}
                    style={{ backgroundColor: isSelected ? '#EEF2FF' : 'transparent' }}
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                      style={{ backgroundColor: isSelected ? '#C7D2FE' : '#F5F5F4' }}
                    >
                      <FontAwesome6
                        name={mode.icon}
                        size={16}
                        color={isSelected ? '#4F46E5' : '#78716C'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-medium"
                        style={{ color: isSelected ? '#4F46E5' : '#374151' }}
                      >
                        {mode.label}
                      </Text>
                      <Text className="text-stone-400 text-xs mt-0.5">{mode.desc}</Text>
                    </View>
                    <View
                      className="w-5 h-5 rounded-full border-2 items-center justify-center"
                      style={{
                        borderColor: isSelected ? '#4F46E5' : '#D6D3D1',
                        backgroundColor: isSelected ? '#4F46E5' : 'transparent',
                      }}
                    >
                      {isSelected && (
                        <View className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Info card */}
          <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <View className="flex-row items-center gap-2 mb-2">
              <FontAwesome6 name="circle-info" size={14} color="#2563EB" />
              <Text className="text-blue-700 text-sm font-medium">温馨提示</Text>
            </View>
            <Text className="text-stone-600 text-xs leading-5">
              提醒会帮助你保持学习节奏，但不会强制打扰你。你可以随时调整或关闭提醒。
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Time picker modal */}
      <TimePickerModal
        visible={timePickerVisible}
        currentTime={editingSlot ? getTimeForSlot(editingSlot) : '08:00'}
        onConfirm={handleTimeConfirm}
        onCancel={() => {
          setTimePickerVisible(false);
          setEditingSlot(null);
        }}
        title="设置提醒时间"
      />
    </Screen>
  );
}
