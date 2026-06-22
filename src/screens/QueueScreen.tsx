import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReorderableQueue } from '../components/ReorderableQueue';
import { EmptyState } from '../components/States';
import { TopBar } from '../components/TopBar';
import { usePlayerStore } from '../store/playerStore';
import { colors, spacing } from '../theme';

export function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const skipToIndex = usePlayerStore((s) => s.skipToIndex);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);
  const radioMode = usePlayerStore((s) => s.radioMode);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopBar variant="close" title={radioMode ? 'Smart Radio queue' : 'Up Next'} />
      {queue.length === 0 ? (
        <EmptyState icon="list" title="Queue is empty" message="Play something to build a queue." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          <ReorderableQueue
            tracks={queue}
            currentIndex={currentIndex}
            onJump={(index) => skipToIndex(index)}
            onMove={(from, to) => reorderQueue(from, to)}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
