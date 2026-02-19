
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface QueryRequest {
  query: string;
  top_k?: number;
  namespace: string;  
}

export interface Source {
  source_num: number;   
  document: string;
  page: number | null;
  source: string;
  excerpt: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

export interface UploadResult {
  filename: string;
  status: 'success' | 'error';
  chunks_created?: number;
  message?: string;
}

export interface UploadResponse {
  message: string;
  total_chunks: number;
  results: UploadResult[];
}

export const uploadContract = async (file: File, namespace: string): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('files', file);
  
  const response = await api.post<UploadResponse>('/upload-contract', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Namespace': namespace,  
    },
  });
  
  return response.data;
};

export const uploadMultipleContracts = async (files: File[], namespace: string): Promise<UploadResponse> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });
  
  const response = await api.post<UploadResponse>('/upload-contract', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'X-Namespace': namespace,  
    },
  });
  
  return response.data;
};

export const queryContracts = async (
  query: string,
  namespace: string,  
  topK: number = 10
): Promise<QueryResponse> => {
  const response = await api.post<QueryResponse>('/query', {
    query,
    top_k: topK,
    namespace: namespace,  
  });
  
  return response.data;
};

export default api;