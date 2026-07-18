import { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
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

  useFocusEffect(() => {
    if (!student) return;
    fetch(`${BASE_URL}/api/v1/student/${student.id}/notification-prefs`)
      .then(r => r.json())
      .then(data => {
        if (data.prefs) setPrefs({ ...prefs, ...data.prefs });
      })
      .catch((e) => console.warn("Settings error:", e));
  });

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

  const slots = [
    { key: 'morning_enabled' as const, label: '早间计划', time: prefs.morning_time, icon: 'sun' as const },
    { key: 'afternoon_enabled' as const, label: '上午练习', time: prefs.afternoon_time, icon: 'cloud-sun' as const },
    { key: 'evening_enabled' as const, label: '晚间回顾', time: prefs.evening_time, icon: 'moon' as const },
  ];

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-6">
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <FontAwesome6 name="arrow-left" size={20} color="#44403c" />
            </TouchableOpacity>
            <Text className="text-stone-800 text-xl font-bold">提醒设置</Text>
          </View>

          {/* Notification slots */}
          <View className="bg-white rounded-2xl p-4 mb-6" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
            <Text className="text-stone-500 text-xs mb-4">每日提醒</Text>
            {slots.map((slot, idx) => (
              <View key={slot.key} className={`flex-row items-center justify-between py-3 ${idx > 0 ? 'border-t border-stone-100' : ''}`}>
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center mr-3">
                    <FontAwesome6 name={slot.icon} size={14} color="#d97706" />
                  </View>
                  <View>
                    <Text className="text-stone-800 text-sm font-medium">{slot.label}</Text>
                    <Text className="text-stone-400 text-xs">{slot.time}</Text>
                  </View>
                </View>
                <Switch
                  value={prefs[slot.key] as boolean}
                  onValueChange={(v) => togglePref(slot.key, v)}
                  trackColor={{ true: '#6366f1', false: '#d6d3d1' }}
                />
              </View>
            ))}
          </View>

          {/* Weekend mode */}
          <View className="bg-white rounded-2xl p-4 mb-6" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
            <Text className="text-stone-500 text-xs mb-4">周末模式</Text>
            {[
              { value: 'same', label: '照常' },
              { value: 'delay_1h', label: '推迟 1 小时' },
              { value: 'evening_only', label: '仅晚间' },
            ].map(mode => (
              <TouchableOpacity
                key={mode.value}
                onPress={() => togglePref('weekend_mode', mode.value)}
                className="flex-row items-center py-2"
              >
                <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${prefs.weekend_mode === mode.value ? 'border-indigo-500' : 'border-stone-300'}`}>
                  {prefs.weekend_mode === mode.value && <View className="w-3 h-3 rounded-full bg-indigo-500" />}
                </View>
                <Text className="text-stone-700 text-sm">{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
