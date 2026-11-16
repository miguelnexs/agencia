import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { API_URL } from '../constants/Config';

export interface UserPermissions {
  can_create_booking?: boolean;
  can_edit_booking?: boolean;
  can_delete_booking?: boolean;
  can_send_receipt?: boolean;
  can_view_stats?: boolean;
  can_manage_users?: boolean;
}

interface AuthContextType {
  token: string | null;
  role: string | null;
  username: string;
  permissions: UserPermissions | null;
  isLoading: boolean;
  signIn: (
    token: string,
    role: string,
    username?: string,
    permissions?: UserPermissions | null,
  ) => void;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  username: '',
  permissions: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedToken = window.localStorage.getItem('mobile_agency_token');
        const savedRole = window.localStorage.getItem('mobile_agency_role');
        const savedUser = window.localStorage.getItem('mobile_agency_username');
        const savedPerms = window.localStorage.getItem('mobile_agency_permissions');
        if (savedToken) setToken(savedToken);
        if (savedRole) setRole(savedRole);
        if (savedUser) setUsername(savedUser);
        if (savedPerms) setPermissions(JSON.parse(savedPerms));
      }
    } catch {
      // ignore storage errors on native
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = async (activeToken?: string | null) => {
    const tkn = activeToken ?? token;
    if (!tkn) return;
    try {
      const res = await fetch(`${API_URL}/users/api/auth/me/`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tkn}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.role) setRole(data.role);
      if (data.username) setUsername(data.username);
      if (data.permissions) setPermissions(data.permissions);
    } catch {
      // ignore network error
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile(token);
    }
  }, [token]);

  const signIn = (
    newToken: string,
    newRole: string,
    newUsername: string = '',
    newPermissions: UserPermissions | null = null,
  ) => {
    setToken(newToken);
    setRole(newRole);
    if (newUsername) setUsername(newUsername);
    if (newPermissions) setPermissions(newPermissions);

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('mobile_agency_token', newToken);
        window.localStorage.setItem('mobile_agency_role', newRole);
        if (newUsername) window.localStorage.setItem('mobile_agency_username', newUsername);
        if (newPermissions) {
          window.localStorage.setItem(
            'mobile_agency_permissions',
            JSON.stringify(newPermissions),
          );
        }
      }
    } catch {}

    router.replace('/(tabs)');
  };

  const signOut = () => {
    setToken(null);
    setRole(null);
    setUsername('');
    setPermissions(null);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('mobile_agency_token');
        window.localStorage.removeItem('mobile_agency_role');
        window.localStorage.removeItem('mobile_agency_username');
        window.localStorage.removeItem('mobile_agency_permissions');
      }
    } catch {}
    router.replace('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        username,
        permissions,
        isLoading,
        signIn,
        signOut,
        refreshProfile: () => refreshProfile(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
