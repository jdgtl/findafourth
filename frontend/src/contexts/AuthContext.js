import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.getMe();
          setPlayer(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('player');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { access_token, player: playerData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('player', JSON.stringify(playerData));
    setPlayer(playerData);
    setIsAuthenticated(true);
    return playerData;
  };

  const register = async (email, password) => {
    const response = await authAPI.register(email, password);
    const { access_token, player: playerData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('player', JSON.stringify(playerData));
    setPlayer(playerData);
    setIsAuthenticated(true);
    return playerData;
  };

  const completeProfile = async (profileData) => {
    const response = await authAPI.completeProfile(profileData);
    const updatedPlayer = response.data;
    localStorage.setItem('player', JSON.stringify(updatedPlayer));
    setPlayer(updatedPlayer);
    return updatedPlayer;
  };

  const updatePlayer = (updatedPlayer) => {
    localStorage.setItem('player', JSON.stringify(updatedPlayer));
    setPlayer(updatedPlayer);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('player');
    setPlayer(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        player,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        completeProfile,
        updatePlayer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
