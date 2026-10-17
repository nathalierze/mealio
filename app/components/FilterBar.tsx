import { ScrollView, StyleSheet } from 'react-native';
import Chip from './Chip';
import { spacing } from '../lib/theme';

export default function FilterBar({
  tags,
  activeFilter,
  onSelect,
}: {
  tags: string[];
  activeFilter: string;
  onSelect: (tag: string) => void;
}) {
  const chips = ['Alle', ...tags];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >
      {chips.map((tag) => (
        <Chip key={tag} label={tag} variant="filter" active={tag === activeFilter} onPress={() => onSelect(tag)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    height: 58,
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    height: 58,
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
});
