import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadMemory = async (formData) => {
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const processMemory = async (memoryId) => {
  return api.post(`/process/${memoryId}`);
};

export const detectFaces = async (memoryId) => {
  return api.post(`/faces/${memoryId}/detect`);
};

export const tagFaces = async (memoryId, tags) => {
  return api.post(`/faces/${memoryId}/tag`, tags);
};

export const generateStory = async (memoryId) => {
  return api.post(`/generate_story/${memoryId}`);
};

export const narrateStory = async (memoryId) => {
  return api.post(`/narrate/${memoryId}`);
};

export const getMemories = async () => {
  return api.get('/memories');
};

export const getMemory = async (memoryId) => {
  return api.get(`/memory/${memoryId}`);
};

export const searchMemories = async (query, person = null, k = 6) => {
  return api.post('/search', { q: query, person, k });
};

export const embedMemory = async (memoryId) => {
  return api.post(`/embed/${memoryId}`);
};

export { API_BASE_URL };
