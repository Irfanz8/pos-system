import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from './api';

interface User { id: string; name: string; email: string; role: string; outletId?: string; }
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('cashier_token');
    const u = localStorage.getItem('cashier_user');
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token: t, user: u } = res.data;
    localStorage.setItem('cashier_token', t);
    localStorage.setItem('cashier_user', JSON.stringify(u));
    setToken(t); setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('cashier_token');
    localStorage.removeItem('cashier_user');
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
