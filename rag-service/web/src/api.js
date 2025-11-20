import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthCheck = () => api.get('/health');

export const getStats = () => api.get('/stats');

export const ingestDocument = (data) => api.post('/ingest', data);

export const ingestBatch = (documents) => api.post('/ingest/batch', { documents });

export const ingestUrl = (url) => api.post('/ingest/url', { url });

export const queryRAG = (query, history = [], topK = null, temperature = null) => 
  api.post('/query', { query, history, top_k: topK, temperature });

export const clearDatabase = () => api.delete('/clear');

// New endpoints
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/upload/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const uploadFiles = (files) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  return api.post('/upload/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const listDocuments = () => api.get('/documents');

export const deleteDocument = (documentId) => api.delete(`/documents/${documentId}`);

export const searchDocuments = (query, limit = 10) => 
  api.post('/search', { query, limit });

// Q&A endpoints
export const addQAPair = (question, answer, category = null, tags = [], metadata = {}) =>
  api.post('/qa', { question, answer, category, tags, metadata });

export const addQABatch = (qaPairs) =>
  api.post('/qa/batch', { qa_pairs: qaPairs });

export const listQAPairs = () => api.get('/qa');

export const deleteQAPair = (qaId) => api.delete(`/qa/${qaId}`);

export default api;
