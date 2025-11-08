import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Memory Palace</Text>
        <Text style={styles.subtitle}>
          Preserve precious memories for those who need gentle reminders
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={() => navigation.navigate('Upload')}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📸</Text>
          </View>
          <Text style={styles.cardTitle}>Create Memory</Text>
          <Text style={styles.cardDescription}>
            Upload photos, videos, or audio to create a new memory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.secondaryCard]}
          onPress={() => navigation.navigate('Memories')}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🏠</Text>
          </View>
          <Text style={styles.cardTitle}>View Memories</Text>
          <Text style={styles.cardDescription}>
            Browse and relive all saved memories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.accentCard]}
          onPress={() => navigation.navigate('Search')}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔍</Text>
          </View>
          <Text style={styles.cardTitle}>Search</Text>
          <Text style={styles.cardDescription}>
            Find memories by people or moments
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          🔒 All memories are processed locally and never leave your device
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 24,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F4F8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  cardContainer: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  primaryCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  secondaryCard: {
    backgroundColor: '#FFFFFF',
  },
  accentCard: {
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
    lineHeight: 20,
  },
});
