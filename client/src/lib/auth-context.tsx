import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "./queryClient";
import type { User } from "@shared/schema";

interface ImpersonationInfo {
  isImpersonating: boolean;
  impersonatorId?: string;
  impersonatedUserId?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  impersonation: ImpersonationInfo;
  isProfileComplete: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

function checkProfileComplete(user: User | null): boolean {
  if (!user) return false;
  return !!(
    user.firstName &&
    user.lastName &&
    user.email &&
    user.company &&
    user.phoneNumber
  );
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationInfo>({ isImpersonating: false });
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      
      if (data.isAuthenticated && data.user) {
        setUser(data.user);
        setImpersonation(data.impersonation || { isImpersonating: false });
        setIsProfileComplete(checkProfileComplete(data.user));
      } else {
        setUser(null);
        setImpersonation({ isImpersonating: false });
        setIsProfileComplete(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setImpersonation({ isImpersonating: false });
      setIsProfileComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", {
      email,
      password,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || "Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    setIsProfileComplete(checkProfileComplete(data.user));
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      setUser(null);
      setImpersonation({ isImpersonating: false });
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  const refetchUser = async () => {
    await checkAuth();
  };

  const stopImpersonation = async () => {
    try {
      const response = await apiRequest("POST", "/api/impersonation/stop", {});
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
        setImpersonation({ isImpersonating: false });
      }
    } catch (error) {
      console.error("Failed to stop impersonation:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, impersonation, isProfileComplete, login, logout, refetchUser, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
