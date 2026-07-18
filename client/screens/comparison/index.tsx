import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

export default function ComparisonScreen() {
  const router = useSafeRouter();
  const { sessionId } = useSafeSearchParams<{ sessionId: string }>();

  return (
    <Screen>
      <ScrollView className="flex-1 bg-stone-50" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-12 pb-6">
          <View className="flex-row items-center mb-6">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <FontAwesome6 name="arrow-left" size={20} color="#44403c" />
            </TouchableOpacity>
            <Text className="text-stone-800 text-xl font-bold">对比展示</Text>
          </View>

          {/* Phase 1 */}
          <View className="mb-6">
            <Text className="text-stone-500 text-xs mb-2">第一次尝试 (Phase 1)</Text>
            <View className="bg-white rounded-2xl p-4" style={{ shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
              <Text className="text-stone-600 text-sm leading-6">
                I think technology has made our lives more complex. Because we have to use many devices every day. 
                For example, smartphones and computers. They are very useful but also make us tired.
              </Text>
              <View className="flex-row items-center mt-3 pt-3 border-t border-stone-100">
                <Text className="text-stone-400 text-xs">42 词 | Band 5.0</Text>
              </View>
            </View>
          </View>

          {/* Arrow */}
          <View className="items-center mb-6">
            <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center">
              <FontAwesome6 name="arrow-down" size={16} color="#6366f1" />
            </View>
            <Text className="text-indigo-500 text-xs mt-2">经过支架引导后</Text>
          </View>

          {/* Phase 4 */}
          <View className="mb-6">
            <Text className="text-stone-500 text-xs mb-2">修改后 (Phase 4)</Text>
            <View className="bg-white rounded-2xl p-4 border-2 border-indigo-200" style={{ shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 }}>
              <Text className="text-stone-600 text-sm leading-6">
                While technology undeniably offers convenience, I would argue that it has simultaneously increased the complexity of daily life. 
                For instance, the proliferation of digital devices means that individuals are now expected to manage multiple communication channels, 
                which can lead to information overload and reduced productivity.
              </Text>
              <View className="flex-row items-center mt-3 pt-3 border-t border-stone-100">
                <Text className="text-stone-400 text-xs">68 词 | Band 6.5</Text>
                <View className="ml-auto bg-emerald-50 rounded-full px-3 py-1">
                  <Text className="text-emerald-600 text-xs font-medium">+1.5</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Improvement summary */}
          <View className="bg-indigo-500 rounded-2xl p-5">
            <Text className="text-white font-bold text-base mb-3">进步总结</Text>
            {[
              { label: '论点展开', from: '只提观点', to: '观点+解释+例证' },
              { label: '连接手段', from: '简单并列', to: '对比/因果/递进' },
              { label: '词汇多样性', from: '基础词汇', to: '学术词汇' },
            ].map((item, i) => (
              <View key={i} className="flex-row items-center py-2">
                <Text className="text-indigo-200 text-xs w-20">{item.label}</Text>
                <Text className="text-indigo-300/60 text-xs flex-1">{item.from}</Text>
                <FontAwesome6 name="arrow-right" size={10} color="#a5b4fc" />
                <Text className="text-white text-xs flex-1 ml-2">{item.to}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
