import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ImageUploader from './components/ImageUploader';
import Albums from './pages/Albums';
import AlbumDetail from './pages/AlbumDetail';
import DashboardLayout from './components/DashboardLayout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminLoginPage from './pages/AdminLoginPage';
import Settings from './pages/Settings';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/admin-auth" element={<AdminLoginPage />} />
          
          {/* Main Photo Gallery / Overview */}
          <Route 
            path="/cloudinary" 
            element={
              <ProtectedRoute>
                <DashboardLayout><ImageUploader /></DashboardLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Main Photo Library */}
          <Route 
            path="/local" 
            element={
              <ProtectedRoute>
                <DashboardLayout><ImageUploader /></DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* Album Management */}
          <Route 
            path="/albums" 
            element={
              <ProtectedRoute>
                <DashboardLayout><Albums /></DashboardLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Album Detail View */}
          <Route 
            path="/albums/:id" 
            element={
              <ProtectedRoute>
                <DashboardLayout><AlbumDetail /></DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* User Settings */}
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <DashboardLayout><Settings /></DashboardLayout>
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Dashboard */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute adminOnly={true}>
                <DashboardLayout><AdminDashboard /></DashboardLayout>
              </ProtectedRoute>
            } 
          />
          
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}

export default App;
