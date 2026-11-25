import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [accessibleSoftware, setAccessibleSoftware] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSoftwareList = useCallback(async (authToken) => {
    if (!authToken) {
      setAccessibleSoftware([]);
      return;
    }
    try {
      const res = await apiRequest('/software');
      if (res.success) {
        setAccessibleSoftware(res.software || []);
      }
    } catch (err) {
      console.error('Failed to load accessible software:', err.message);
      setAccessibleSoftware([]);
    }
  }, []);

  const refreshUserSession = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setAccessibleSoftware([]);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest('/auth/me');
      if (data.success) {
        setUser(data.user);
        setToken(savedToken);
        await loadSoftwareList(savedToken);
      } else {
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setAccessibleSoftware([]);
      }
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setToken(null);
      setAccessibleSoftware([]);
    } finally {
      setLoading(false);
    }
  }, [loadSoftwareList]);

  useEffect(() => {
    refreshUserSession();
  }, [refreshUserSession]);

  const login = async (email, password, selectedRole) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: selectedRole }),
      });

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      await loadSoftwareList(data.token);

      return { success: true, message: data.message, user: data.user };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const register = async (fullName, email, password, confirmPassword) => {
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
        }),
      });
      return {
        success: true,
        message: data.message || 'Account created successfully! Please log in.',
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'Registration failed.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAccessibleSoftware([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        accessibleSoftware,
        refreshSoftware: () => loadSoftwareList(token),
        refreshUserSession,
        login,
        register,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
