import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import ContentLake from './pages/ContentLake';
import Generate from './pages/Generate';
import Ideation from './pages/Ideation';
import Clients from './pages/Clients';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="flex h-screen">
                <Navigation />
                <Routes>
                  <Route path="/" element={<Navigate to="/content-lake" replace />} />
                  <Route path="/content-lake" element={<ContentLake />} />
                  <Route path="/ideation" element={<Ideation />} />
                  <Route path="/generate" element={<Generate />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;