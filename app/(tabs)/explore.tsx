import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Explore</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});
