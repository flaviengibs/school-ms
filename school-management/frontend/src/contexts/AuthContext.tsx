import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

interface User {
  id: number; email: string; firstName: string; lastName: string;
  role: "OWNER" | "SUPER_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  schoolId: number | null;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeSchoolId: number | null; // for OWNER acting in a school context
  activeSchoolName: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  enterSchool: (schoolId: number, schoolName: string) => Promise<void>;
  exitSchool: () => void;
  effectiveSchoolId: number | null; // schoolId to use for API calls
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeSchoolId, setActiveSchoolId] = useState<number | null>(null);
  const [activeSchoolName, setActiveSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("accessToken");
    const u = localStorage.getItem("user");
    const sid = localStorage.getItem("activeSchoolId");
    const sname = localStorage.getItem("activeSchoolName");
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    if (sid) { setActiveSchoolId(Number(sid)); setActiveSchoolName(sname); }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      await api.post("/auth/logout", { refreshToken });
    } catch {}
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("activeSchoolId");
    localStorage.removeItem("activeSchoolName");
    setToken(null); setUser(null);
    setActiveSchoolId(null); setActiveSchoolName(null);
  }, []);

  // Owner enters a school context — gets a scoped token
  const enterSchool = async (schoolId: number, schoolName: string) => {
    const { data } = await api.post("/auth/switch-school", { schoolId });
    localStorage.setItem("activeSchoolId", String(schoolId));
    localStorage.setItem("activeSchoolName", schoolName);
    // Store context token separately — used for school-scoped requests
    localStorage.setItem("contextToken", data.contextToken);
    setActiveSchoolId(schoolId);
    setActiveSchoolName(schoolName);
  };

  const exitSchool = () => {
    localStorage.removeItem("activeSchoolId");
    localStorage.removeItem("activeSchoolName");
    localStorage.removeItem("contextToken");
    setActiveSchoolId(null);
    setActiveSchoolName(null);
  };

  const effectiveSchoolId = user?.role === "OWNER" ? activeSchoolId : user?.schoolId ?? null;

  return (
    <AuthContext.Provider value={{ user, token, activeSchoolId, activeSchoolName, login, logout, loading, enterSchool, exitSchool, effectiveSchoolId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
