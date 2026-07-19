import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

interface Student {
  id: string;
  phone: string;
  name: string;
  onboarded: boolean;
  target_band?: number;
  exam_date?: string;
}

interface Portrait {
  id: string;
  student_id: string;
  current_moment: string;
  five_dimensions: Record<string, number>;
  anxiety_level: number;
  band_history: Array<{ date: string; band: number }>;
}

interface AuthContextType {
  student: Student | null;
  portrait: Portrait | null;
  isLoading: boolean;
  login: (phone: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  student: null,
  portrait: null,
  isLoading: true,
  login: async (_phone: string, _name?: string) => { /* provided by AuthProvider */ },
  logout: () => { /* provided by AuthProvider */ },
  refreshProfile: async () => { /* provided by AuthProvider */ },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (studentId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/student/${studentId}/profile`);
      const data = await res.json();
      if (data.portrait) {
        setPortrait(data.portrait);
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    }
  }, [BASE_URL]);

  useEffect(() => {
    const init = async () => {
      try {
        const phone = await AsyncStorage.getItem('user_phone');
        if (phone) {
          const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
          });
          const data = await res.json();
          if (data.student) {
            setStudent(data.student);
            await fetchProfile(data.student.id);
          }
        }
      } catch (e) {
        console.error('Init auth error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [BASE_URL, fetchProfile]);

  const login = useCallback(async (phone: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (data.student) {
        setStudent(data.student);
        await AsyncStorage.setItem('user_phone', phone);
        await fetchProfile(data.student.id);
      }
    } catch (e) {
      console.error('Login failed:', e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [BASE_URL, fetchProfile]);

  const logout = useCallback(() => {
    setStudent(null);
    setPortrait(null);
    AsyncStorage.removeItem('user_phone');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (student) {
      await fetchProfile(student.id);
    }
  }, [student, fetchProfile]);

  return (
    <AuthContext.Provider value={{ student, portrait, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
