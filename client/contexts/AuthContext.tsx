/**
 * 认知伙伴认证上下文
 *
 * 管理学生登录状态和学生信息
 */
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Student {
  id: string;
  name: string;
  phone: string;
  target_band?: number;
  exam_date?: string;
  current_moment?: string;
}

interface AuthContextType {
  student: Student | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshStudent: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STUDENT_STORAGE_KEY = 'cognitive_companion_student';
const TOKEN_STORAGE_KEY = 'cognitive_companion_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 AsyncStorage 加载学生信息
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedStudent = await AsyncStorage.getItem(STUDENT_STORAGE_KEY);
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (storedStudent) {
          setStudent(JSON.parse(storedStudent));
        }
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Failed to load stored auth data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredData();
  }, []);

  // 登录
  const login = useCallback(async (phone: string, name?: string) => {
    setIsLoading(true);
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
      const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      const studentData: Student = {
        id: data.student.id,
        name: data.student.name || name || '学生',
        phone: data.student.phone || phone,
        target_band: data.student.target_band,
        exam_date: data.student.exam_date,
        current_moment: data.student.current_moment,
      };

      setStudent(studentData);
      setToken(data.token || 'demo-token');
      
      // 存储到 AsyncStorage
      await AsyncStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(studentData));
      if (data.token) {
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      }
    } catch (error) {
      console.error('Login error:', error);
      // 如果后端登录失败，使用本地模拟登录（用于 Demo）
      const demoStudent: Student = {
        id: 'demo-student',
        name: name || '小明',
        phone: phone,
        target_band: 7.0,
        exam_date: new Date(Date.now() + 86400000).toISOString(),
        current_moment: 'entry_confusion',
      };
      setStudent(demoStudent);
      setToken('demo-token');
      await AsyncStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(demoStudent));
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, 'demo-token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    setStudent(null);
    setToken(null);
    await AsyncStorage.removeItem(STUDENT_STORAGE_KEY);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  // 刷新学生信息
  const refreshStudent = useCallback(async () => {
    if (!student?.id) return;
    try {
      const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
      const response = await fetch(`${BASE_URL}/api/v1/student/${student.id}`);
      if (response.ok) {
        const data = await response.json();
        const updatedStudent: Student = {
          ...student,
          ...data.student,
        };
        setStudent(updatedStudent);
        await AsyncStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(updatedStudent));
      }
    } catch (error) {
      console.error('Failed to refresh student:', error);
    }
  }, [student]);

  const value: AuthContextType = {
    student,
    token,
    isAuthenticated: !!student,
    isLoading,
    login,
    logout,
    refreshStudent,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
