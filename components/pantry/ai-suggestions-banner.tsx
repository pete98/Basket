import { RECIPE_SUGGESTIONS } from '@/constants/pantry';
import { usePantry } from '@/contexts/pantry-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function AISuggestionsBanner() {
  const router = useRouter();
  const { state } = usePantry();

  const suggestion = useMemo(() => {
    if (state.items.length === 0) {
      return 'Add items to your pantry to get recipe suggestions';
    }

    // Get a random recipe suggestion
    const randomRecipe = RECIPE_SUGGESTIONS[Math.floor(Math.random() * RECIPE_SUGGESTIONS.length)];
    const itemNames = state.items.slice(0, 3).map((item) => item.name).join(', ');
    return `You can cook ${randomRecipe} with what you have.`;
  }, [state.items]);

  const handlePress = () => {
    // Open AI modal - user can ask about pantry items
    router.push('/ai-modal');
  };

  if (state.items.length === 0) {
    return null;
  }

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <View style={styles.gradient}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={24} color="#fff" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>AI Suggestions</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {suggestion}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.arrow} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gradient: {
    padding: 16,
    backgroundColor: '#FF8E53',
    // Gradient effect using background color
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  arrow: {
    marginLeft: 8,
  },
});

