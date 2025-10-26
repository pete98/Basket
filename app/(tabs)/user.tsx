import React from 'react';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';

export default function UserProfile() {
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <Image
        source={{
          uri: 'https://randomuser.me/api/portraits/men/41.jpg',
        }}
        style={styles.avatar}
      />
      <Text style={styles.name}>John Doe</Text>
      <Text style={styles.email}>john.doe@example.com</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    color: '#888',
  },
});
