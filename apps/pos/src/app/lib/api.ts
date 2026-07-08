const API_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, token } = options;
  
  const headers: HeadersInit = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

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
      // Hesap askıda (deneme bitti / ödeme yok) → sahibi her zaman ödemeye
      // ulaşabilmeli: abonelik sayfasına yönlendir (platform endpoint'leri
      // kilitten muaf olduğu için orası çalışır).
      if (response.status === 402 && data?.code === 'TENANT_SUSPENDED') {
        const base = (import.meta as any).env?.BASE_URL || '/';
        const target = `${base}billing`;
        if (!window.location.pathname.endsWith('/billing')) {
          window.location.href = target;
        }
      }
      // Preserve the full response body on the thrown Error so callers can
      // surface structured backend hints (ör. unpaidOrders + canForce on
      // table status conflicts).
      const err: any = new Error(data.error || 'Bir hata oluştu');
      err.data = data;
      err.status = response.status;
      throw err;
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

  // File upload - uses FormData instead of JSON
  upload: async (endpoint: string, file: File, token?: string) => {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type - browser will set it with boundary

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Yükleme hatası');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Bağlantı hatası');
    }
  },
};

