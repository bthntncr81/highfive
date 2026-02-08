const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, token } = options;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Bir hata oluştu');
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Bağlantı hatası');
  }
}

export const api = {
  get: (endpoint: string, token?: string) => 
    request(endpoint, { token }),
  
  post: (endpoint: string, body: any, token?: string) => 
    request(endpoint, { method: 'POST', body, token }),
  
  put: (endpoint: string, body: any, token?: string) => 
    request(endpoint, { method: 'PUT', body, token }),
  
  patch: (endpoint: string, body: any, token?: string) => 
    request(endpoint, { method: 'PATCH', body, token }),
  
  delete: (endpoint: string, token?: string) => 
    request(endpoint, { method: 'DELETE', token }),
};

