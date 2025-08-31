import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClientSwitchProvider } from './contexts/ClientSwitchContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import PortalSwitcher from './components/PortalSwitcher';
import Login from './pages/Login';
import ContentLake from './pages/ContentLake';
import Generate from './pages/Generate';
import Ideation from './pages/Ideation';
import Clients from './pages/Clients';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import EnvTest from './pages/EnvTest';
import Approval from './pages/Approval';
import ClientFeedback from './pages/ClientFeedback';
import ContentCalendar from './pages/ContentCalendar';
import Prompts from './pages/Prompts';
import SlackSettings from './pages/SlackSettings';
// import AdminClientAuth from './pages/AdminClientAuth'; // Removed - functionality consolidated into Clients page

// Start background processor for search jobs
import './services/background-processor.service';

// Wrapper component to provide ClientSwitchProvider with authenticated user
const AppWithClientSwitch = () => {
  const { user } = useAuth();
  
  // Use a default admin ID when not authenticated (development mode)
  const adminUserId = user?.id || 'default-admin';

  // For development, skip login requirement
  // if (!user) {
  //   return <Navigate to="/login" replace />;
  // }

  return (
    <ClientSwitchProvider adminUserId={adminUserId}>
      <div className="flex h-screen">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/content-lake" replace />} />
          <Route path="/content-lake" element={<ContentLake />} />
          <Route path="/ideation" element={<Ideation />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/approval" element={<Approval />} />
          <Route path="/client-feedback" element={<ClientFeedback />} />
          <Route path="/calendar" element={<ContentCalendar />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/slack-settings" element={<SlackSettings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/env-test" element={<EnvTest />} />
        </Routes>
        <PortalSwitcher />
      </div>
    </ClientSwitchProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#18181b',
              color: '#fafafa',
              border: '1px solid #27272a',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fafafa',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fafafa',
              },
            },
          }}
        />
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes with client switching */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppWithClientSwitch />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;