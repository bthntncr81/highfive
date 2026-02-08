import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import { storage } from '../lib/storage';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  pinLogin: (pin: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedToken = storage.get<string>('token');
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      const response = await api.get('/api/auth/me', authToken);
      if (response.user) {
        setUser(response.user);
      } else {
        // Invalid token
        storage.remove('token');
        setToken(null);
      }
    } catch (error) {
      storage.remove('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    
    if (response.token && response.user) {
      storage.set('token', response.token);
      setToken(response.token);
      setUser(response.user);
    } else {
      throw new Error(response.error || 'Giriş başarısız');
    }
  };

  const pinLogin = async (pin: string) => {
    const response = await api.post('/api/auth/pin-login', { pin });
    
    if (response.token && response.user) {
      storage.set('token', response.token);
      setToken(response.token);
      setUser(response.user);
    } else {
      throw new Error(response.error || 'Giriş başarısız');
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await api.post('/api/auth/logout', {}, token);
      } catch (error) {
        // Ignore logout errors
      }
    }
    
    storage.remove('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        pinLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

