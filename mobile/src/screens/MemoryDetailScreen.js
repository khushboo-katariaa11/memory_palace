import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { getMemory, generateStory, narrateStory, API_BASE_URL } from '../config/api';

export default function MemoryDetailScreen({ route, navigation }) {
  const { memoryId } = route.params;
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadMemory();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadMemory = async () => {
    try {
      const response = await getMemory(memoryId);
      setMemory(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load memory details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStory = async () => {
    setGenerating(true);
    try {
      await generateStory(memoryId);
      await narrateStory(memoryId);
      await loadMemory();
      Alert.alert('Success', 'Story generated and narrated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to generate story');
    } finally {
      setGenerating(false);
    }
  };

  const playAudio = async () => {
    if (!memory?.audio_url) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `${API_BASE_URL}${memory.audio_url}` },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync();
      setIsPlaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {memory?.images && memory.images.length > 0 && (
        <View style={styles.imagesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {memory.images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: `${API_BASE_URL}${img}` }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.content}>
        {memory?.story ? (
          <View style={styles.storyContainer}>
            <Text style={styles.storyTitle}>Your Memory</Text>
            <Text style={styles.storyText}>{memory.story}</Text>

            {memory.audio_url && (
              <TouchableOpacity
                style={styles.playButton}
                onPress={isPlaying ? stopAudio : playAudio}
              >
                <Text style={styles.playIcon}>{isPlaying ? '⏸️' : '▶️'}</Text>
                <Text style={styles.playButtonText}>
                  {isPlaying ? 'Stop Narration' : 'Play Narration'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noStoryContainer}>
            <Text style={styles.noStoryIcon}>✨</Text>
            <Text style={styles.noStoryText}>
              Generate an AI story from this memory
            </Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateStory}
              disabled={generating}
            >
              {generating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.generateButtonText}>Generating...</Text>
                </View>
              ) : (
                <Text style={styles.generateButtonText}>Generate Story</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.tagButton}
          onPress={() => navigation.navigate('FaceTagging', { memoryId })}
        >
          <Text style={styles.tagButtonText}>👥 Tag People in Photos</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  imagesContainer: {
    height: 300,
    backgroundColor: '#2C3E50',
  },
  image: {
    width: 300,
    height: 300,
    marginRight: 8,
  },
  content: {
    padding: 16,
  },
  storyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  storyText: {
    fontSize: 16,
    color: '#34495E',
    lineHeight: 24,
    marginBottom: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  playIcon: {
    fontSize: 20,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noStoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  noStoryIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noStoryText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#27AE60',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  tagButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
});
