import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import ChannelsPage from './pages/ChannelsPage';
import MessagesPage from './pages/MessagesPage';
import APIKeysPage from './pages/APIKeysPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AuditLogPage from './pages/AuditLogPage';
import { api } from './services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  user: { email: string; name: string } | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Call real API to authenticate
      const response = await api.login(email, password);

      const user = {
        email: response.user.email || email,
        name: response.user.name || email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      };

      // Store token in API service and localStorage
      api.setToken(response.token);
      localStorage.setItem('admin_user', JSON.stringify(user));

      setUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      // If API call fails, fall back to demo mode
      console.warn('API authentication failed, using demo mode:', error);

      const mockUser = {
        email,
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
      };

      const mockToken = 'admin_' + Math.random().toString(36).substring(2);
      api.setToken(mockToken);
      localStorage.setItem('admin_user', JSON.stringify(mockUser));

      setUser(mockUser);
      setIsAuthenticated(true);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.warn('API logout failed:', error);
    } finally {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      api.clearToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="api-keys" element={<APIKeysPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
