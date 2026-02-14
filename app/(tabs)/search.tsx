import { GlassView } from 'expo-glass-effect';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[
        styles.container,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom,
          backgroundColor: '#f7f7f9',
        },
      ]}
      contentContainerStyle={styles.contentContainer}>
      <Text style={styles.label}>Search</Text>
      <GlassView
        glassEffectStyle="regular"
        tintColor="rgba(255,255,255,0.25)"
        style={styles.glass}
      >
        <TextInput
          style={[
            styles.input,
            { color: '#222', backgroundColor: 'transparent' },
          ]}
          placeholder="Type to search..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          accessible
          accessibilityLabel="Search input"
        />
      </GlassView>
      <View style={{ marginTop: 32, alignSelf: 'stretch' }}>
        <Text
          selectable
          style={styles.results}
          accessibilityRole="text"
          accessibilityLabel={
            query.length > 0
              ? `No results for ${query}`
              : 'No search started'
          }
        >
          {query.length > 0 ? `No results for "${query}"` : 'No search started'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    minHeight: '100%',
  },
  label: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    letterSpacing: 0.5,
    alignSelf: 'flex-start',
    color: '#18181a',
  },
  glass: {
    width: '100%',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignSelf: 'center',
  },
  input: {
    height: 48,
    fontSize: 18,
    fontWeight: '400',
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  results: {
    fontSize: 16,
    textAlign: 'left',
    opacity: 0.7,
    color: '#333',
  },
});

export default SearchScreen;
