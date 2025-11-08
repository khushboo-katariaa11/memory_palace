import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { detectFaces, tagFaces, API_BASE_URL } from '../config/api';

export default function FaceTaggingScreen({ route, navigation }) {
  const { memoryId } = route.params;
  const [faces, setFaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFaces();
  }, []);

  const loadFaces = async () => {
    try {
      const response = await detectFaces(memoryId);
      setFaces(response.data.faces || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to detect faces');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateLabel = (index, label) => {
    const updated = [...faces];
    updated[index].label = label;
    setFaces(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = faces
        .filter((f) => f.label && f.label.trim())
        .map((f) => ({ crop_file: f.crop_file, label: f.label }));

      await tagFaces(memoryId, tags);
      Alert.alert('Success', 'People tagged successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save tags');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Detecting faces...</Text>
      </View>
    );
  }

  if (faces.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>👤</Text>
        <Text style={styles.emptyTitle}>No Faces Detected</Text>
        <Text style={styles.emptyText}>
          No faces were found in the uploaded photos
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tag People</Text>
          <Text style={styles.headerSubtitle}>
            Help identify the people in your photos
          </Text>
        </View>

        {faces.map((face, index) => (
          <View key={index} style={styles.faceCard}>
            <Image
              source={{ uri: face.url }}
              style={styles.faceImage}
              resizeMode="contain"
            />
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Who is this?</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name (e.g., Mom, Ravi)"
                value={face.label || ''}
                onChangeText={(text) => updateLabel(index, text)}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Tags</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
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
    padding: 24,
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7F8C8D',
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
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E6ED',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  faceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  faceImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#F5F7FA',
  },
  inputContainer: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E0E6ED',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E6ED',
  },
  saveButton: {
    backgroundColor: '#27AE60',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
