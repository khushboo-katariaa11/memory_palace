import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadMemory, processMemory, detectFaces } from '../config/api';

export default function UploadScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [audio, setAudio] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos([...photos, ...result.assets]);
    }
  };

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVideo(result.assets[0]);
    }
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAudio(result.assets[0]);
    }
  };

  const handleUpload = async () => {
    if (photos.length === 0 && !video && !audio) {
      Alert.alert('No media', 'Please select at least one photo, video, or audio file');
      return;
    }

    setUploading(true);
    setProcessing(false);

    try {
      const formData = new FormData();

      photos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        });
      });

      if (video) {
        formData.append('video', {
          uri: video.uri,
          type: video.mimeType || 'video/mp4',
          name: video.name,
        });
      }

      if (audio) {
        formData.append('audio', {
          uri: audio.uri,
          type: audio.mimeType || 'audio/mpeg',
          name: audio.name,
        });
      }

      const uploadResponse = await uploadMemory(formData);
      const { memory_id } = uploadResponse.data;

      setUploading(false);
      setProcessing(true);

      await processMemory(memory_id);
      await detectFaces(memory_id);

      setProcessing(false);

      Alert.alert(
        'Success!',
        'Memory created successfully. Would you like to tag people in photos?',
        [
          {
            text: 'Later',
            onPress: () => navigation.navigate('Memories'),
          },
          {
            text: 'Tag Now',
            onPress: () => navigation.navigate('FaceTagging', { memoryId: memory_id }),
          },
        ]
      );
    } catch (error) {
      setUploading(false);
      setProcessing(false);
      Alert.alert('Error', error.message || 'Failed to upload memory');
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickPhotos}>
          <Text style={styles.uploadIcon}>📷</Text>
          <Text style={styles.uploadButtonText}>Select Photos</Text>
        </TouchableOpacity>
        {photos.length > 0 && (
          <View style={styles.previewContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removePhoto(index)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Video (Optional)</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
          <Text style={styles.uploadIcon}>🎥</Text>
          <Text style={styles.uploadButtonText}>
            {video ? video.name : 'Select Video'}
          </Text>
        </TouchableOpacity>
        {video && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setVideo(null)}
          >
            <Text style={styles.clearButtonText}>Remove Video</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio (Optional)</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={pickAudio}>
          <Text style={styles.uploadIcon}>🎵</Text>
          <Text style={styles.uploadButtonText}>
            {audio ? audio.name : 'Select Audio'}
          </Text>
        </TouchableOpacity>
        {audio && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setAudio(null)}
          >
            <Text style={styles.clearButtonText}>Remove Audio</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (uploading || processing) && styles.submitButtonDisabled]}
        onPress={handleUpload}
        disabled={uploading || processing}
      >
        {uploading || processing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.submitButtonText}>
              {uploading ? 'Uploading...' : 'Processing...'}
            </Text>
          </View>
        ) : (
          <Text style={styles.submitButtonText}>Create Memory</Text>
        )}
      </TouchableOpacity>

      {processing && (
        <View style={styles.processingInfo}>
          <Text style={styles.processingText}>
            AI is analyzing your media, detecting faces, and preparing your memory...
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E6ED',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  previewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  photoPreview: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clearButton: {
    marginTop: 8,
    padding: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#E74C3C',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingInfo: {
    backgroundColor: '#E8F4F8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  processingText: {
    color: '#2C3E50',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
