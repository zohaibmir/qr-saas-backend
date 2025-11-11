import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BlogPostsPage from './pages/content/BlogPostsPage';
import BlogPostEditor from './pages/content/BlogPostEditor';
import MediaLibrary from './pages/content/MediaLibrary';
import IPManagement from './pages/settings/IPManagement';
import './App.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DashboardPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/content/*"
                element={
                  <ProtectedRoute requiredPermission="content_management">
                    <DashboardLayout>
                      <Routes>
                        <Route index element={<Navigate to="/content/posts" replace />} />
                        <Route path="posts" element={<BlogPostsPage />} />
                        <Route path="posts/create" element={<BlogPostEditor />} />
                        <Route path="posts/:id/edit" element={<BlogPostEditor />} />
                        <Route path="posts/:id/preview" element={<div>Preview Post - Coming Soon</div>} />
                        <Route path="pages" element={<div>Pages Management - Coming Soon</div>} />
                        <Route path="media" element={<MediaLibrary />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredPermission="user_management">
                    <DashboardLayout>
                      <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <h2>User Management</h2>
                        <p>User management features coming soon...</p>
                      </div>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute requiredPermission="analytics_view">
                    <DashboardLayout>
                      <div style={{ textAlign: 'center', padding: '100px 0' }}>
                        <h2>Analytics</h2>
                        <p>Analytics dashboard coming soon...</p>
                      </div>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredPermission="system_settings">
                    <DashboardLayout>
                      <Routes>
                        <Route index element={<Navigate to="/settings/ip-management" replace />} />
                        <Route path="ip-management" element={<IPManagement />} />
                        <Route path="general" element={<div>General Settings - Coming Soon</div>} />
                        <Route path="security" element={<div>Security Settings - Coming Soon</div>} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
};

export default App;
