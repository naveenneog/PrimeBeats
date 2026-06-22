import { type ReactElement, Fragment } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { selectCurrentTrack, usePlayerStore } from '../store/playerStore';
import { spacing } from '../theme';
import type { Track } from '../types';
import { TrackRow } from './TrackRow';
import { useTrackActions } from './TrackActionsSheet';

type Props = {
  tracks: Track[];
  onPressTrack: (index: number) => void;
  /** Custom row-menu handler. When omitted, a standard actions sheet is shown. */
  onTrackMenu?: (track: Track) => void;
  ListHeaderComponent?: ReactElement | null;
  ListEmptyComponent?: ReactElement | null;
  bottomPadding?: number;
};

/** Reusable, virtualized list of tracks with active-track highlighting. */
export function TrackList({
  tracks,
  onPressTrack,
  onTrackMenu,
  ListHeaderComponent,
  ListEmptyComponent,
  bottomPadding = spacing.xxl,
}: Props) {
  const currentTrack = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const trackActions = useTrackActions();
  const handleMenu = onTrackMenu ?? trackActions.open;

  return (
    <Fragment>
      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        renderItem={({ item, index }) => (
          <TrackRow
            track={item}
            index={index}
            isActive={currentTrack?.id === item.id}
            isPlaying={isPlaying}
            onPress={() => onPressTrack(index)}
            onMenu={() => handleMenu(item)}
          />
        )}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        initialNumToRender={14}
        windowSize={11}
        removeClippedSubviews
      />
      {onTrackMenu ? null : trackActions.sheet}
    </Fragment>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
