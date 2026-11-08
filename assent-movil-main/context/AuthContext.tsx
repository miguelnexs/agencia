import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';

interface AuthContextType {
  token: string | null;
  role: string | null;
  isLoading: boolean;
  signIn: (token: string, role: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token here if persistence is needed
    // For now, we start as not logged in
    setIsLoading(false);
  }, []);

  const signIn = (newToken: string, newRole: string) => {
    setToken(newToken);
    setRole(newRole);
    router.replace('/(tabs)');
  };

  const signOut = () => {
    setToken(null);
    setRole(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ token, role, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
