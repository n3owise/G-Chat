import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import ContactsPage from './pages/ContactsPage';
import GroupsPage from './pages/GroupsPage';
import ProfilePage from './pages/ProfilePage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminMessages from './pages/admin/AdminMessages';

// Future page stubs
const ConversationPage = () => (
  <div className="p-8 text-center text-gray-500">Individual chat route — coming soon</div>
);
const GroupChatPage = () => (
  <div className="p-8 text-center text-gray-500">Group chat — Prompt 3.1</div>
);
const UserProfilePage = () => (
  <div className="p-8 text-center text-gray-500">User profile — Prompt 4.2</div>
);
const HierarchyPage = () => (
  <div className="p-8 text-center text-gray-500">Hierarchy — Prompt 4.1</div>
);

// Admin Protected Route Component
const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  return isAuthenticated ? children : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AdminAuthProvider>
            <div className="app-container">
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected — Main Tabs */}
                <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

                {/* Protected — Sub-routes */}
                <Route path="/chat/:uid" element={<ProtectedRoute><ConversationPage /></ProtectedRoute>} />
                <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChatPage /></ProtectedRoute>} />
                <Route path="/profile/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
                <Route path="/profile/:uid" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                <Route path="/hierarchy" element={<ProtectedRoute><HierarchyPage /></ProtectedRoute>} />

                {/* Default */}
                <Route path="/" element={<Navigate to="/chat" />} />
                <Route path="*" element={<Navigate to="/chat" />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
                <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
                <Route path="/admin/messages" element={<AdminProtectedRoute><AdminMessages /></AdminProtectedRoute>} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" />} />
              </Routes>
            </div>
          </AdminAuthProvider>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
