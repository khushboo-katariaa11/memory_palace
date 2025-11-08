import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { searchMemories, API_BASE_URL } from '../config/api';

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [person, setPerson] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setSearching(true);
    setSearched(false);
    try {
      const response = await searchMemories(
        query,
        person.trim() || null,
        6
      );
      setResults(response.data.results || []);
      setSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const renderResult = ({ item }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => navigation.navigate('MemoryDetail', { memoryId: item.memory_id })}
    >
      {item.thumbnail ? (
        <Image
          source={{ uri: `${API_BASE_URL}${item.thumbnail}` }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
          <Text style={styles.placeholderIcon}>📷</Text>
        </View>
      )}
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.memory_id}</Text>
        <Text style={styles.resultScore}>
          Match: {Math.round(item.score * 100)}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.label}>Search for memories</Text>
        <TextInput
          style={styles.input}
          placeholder="E.g., birthday party, beach trip..."
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />

        <Text style={styles.label}>Filter by person (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="E.g., Mom, Ravi..."
          value={person}
          onChangeText={setPerson}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />

        <TouchableOpacity
          style={[styles.searchButton, searching && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.searchButtonText}>🔍 Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {searching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Searching memories...</Text>
        </View>
      )}

      {!searching && searched && results.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            Try a different search term or remove filters
          </Text>
        </View>
      )}

      {!searching && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderResult}
          keyExtractor={(item) => item.memory_id}
          contentContainerStyle={styles.resultsContainer}
        />
      )}

      {!searching && !searched && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💭</Text>
          <Text style={styles.emptyTitle}>Search Your Memories</Text>
          <Text style={styles.emptyText}>
            Enter keywords to find special moments
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  label: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E6ED',
    marginBottom: 16,
  },
  searchButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7F8C8D',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  resultsContainer: {
    padding: 16,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: {
    width: 100,
    height: 100,
  },
  placeholderThumbnail: {
    backgroundColor: '#E0E6ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
  },
  resultContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 14,
    color: '#27AE60',
  },
});
