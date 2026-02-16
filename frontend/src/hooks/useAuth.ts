import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';
import { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getCurrentUser()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await authAPI.login(usernameOrEmail, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await authAPI.register(username, email, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, loading, login, register, logout };
}
