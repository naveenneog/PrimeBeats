import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type Props = {
  title?: string;
  right?: ReactNode;
  /** Use a downward chevron instead of a back arrow (for modal screens). */
  variant?: 'back' | 'close';
  onBack?: () => void;
};

/** Compact top bar with a back/close affordance, used by detail & modal screens. */
export function TopBar({ title, right, variant = 'back', onBack }: Props) {
  const navigation = useNavigation();
  const handle = onBack ?? (() => navigation.goBack());

  return (
    <View style={styles.bar}>
      <Pressable hitSlop={10} onPress={handle} style={styles.iconBtn}>
        <Ionicons name={variant === 'close' ? 'chevron-down' : 'arrow-back'} size={24} color={colors.text} />
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>
        {title ?? ''}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 52,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.xs,
  },
});
