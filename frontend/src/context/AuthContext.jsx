/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

function getStoredUser() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const userId = localStorage.getItem('userId');
  return token && username ? { token, username, userId } : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const loading = false;

  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('userId', data.userId);
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
