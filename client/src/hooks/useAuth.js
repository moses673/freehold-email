import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('freehold_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token and fetch user data
      fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => {
          if (r.ok) {
            return r.json();
          } else {
            // Token is invalid, clear it
            logout();
            return null;
          }
        })
        .then(data => {
          if (data) {
            setUser(data);
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  function login(newToken, userData) {
    localStorage.setItem('freehold_token', newToken);
    localStorage.setItem('freehold_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('freehold_token');
    localStorage.removeItem('freehold_user');
    setToken(null);
    setUser(null);
  }

  return {
    token,
    user,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };
}

export default useAuth;
