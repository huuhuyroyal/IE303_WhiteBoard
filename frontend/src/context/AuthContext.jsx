/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function getStoredUser() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const userId = localStorage.getItem('userId');
  const avatarUrl = localStorage.getItem('avatarUrl');
  const displayName = localStorage.getItem('displayName');
  return token && username ? { token, username, userId, avatarUrl, displayName } : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const loading = false;

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('userId', data.userId);
    if (data.avatarUrl) {
      localStorage.setItem('avatarUrl', data.avatarUrl);
    } else {
      localStorage.removeItem('avatarUrl');
    }
    if (data.displayName) {
      localStorage.setItem('displayName', data.displayName);
    } else {
      localStorage.removeItem('displayName');
    }
    setUser(data);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      if (next.avatarUrl) {
        localStorage.setItem('avatarUrl', next.avatarUrl);
      }
      if (next.username) {
        localStorage.setItem('username', next.username);
      }
      if (next.displayName !== undefined) {
        localStorage.setItem('displayName', next.displayName);
      }
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('avatarUrl');
    localStorage.removeItem('displayName');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
