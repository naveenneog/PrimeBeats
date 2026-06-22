import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../components/States';
import { TopBar } from '../components/TopBar';
import { TrackList } from '../components/TrackList';
import { usePlayerStore } from '../store/playerStore';
import { colors, spacing } from '../theme';

export function QueueScreen() {
  const queue = usePlayerStore((s) => s.queue);
  const skipToIndex = usePlayerStore((s) => s.skipToIndex);
  const radioMode = usePlayerStore((s) => s.radioMode);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopBar variant="close" title={radioMode ? 'Smart Radio queue' : 'Up Next'} />
      <TrackList
        tracks={queue}
        onPressTrack={(index) => skipToIndex(index)}
        bottomPadding={spacing.xxl}
        ListEmptyComponent={
          <EmptyState icon="list" title="Queue is empty" message="Play something to build a queue." />
        }
      />
    </SafeAreaView>
  );
}
