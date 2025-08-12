import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import ContentLake from './pages/ContentLake';
import Generate from './pages/Generate';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen">
        <Navigation />
        <Routes>
          <Route path="/" element={<Navigate to="/content-lake" replace />} />
          <Route path="/content-lake" element={<ContentLake />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/schedule" element={
            <div className="flex-1 bg-zinc-50 p-8">
              <h1 className="text-3xl font-bold text-zinc-900">Schedule</h1>
              <p className="text-zinc-600 mt-1">Coming soon...</p>
            </div>
          } />
          <Route path="/analytics" element={
            <div className="flex-1 bg-zinc-50 p-8">
              <h1 className="text-3xl font-bold text-zinc-900">Analytics</h1>
              <p className="text-zinc-600 mt-1">Coming soon...</p>
            </div>
          } />
          <Route path="/clients" element={
            <div className="flex-1 bg-zinc-50 p-8">
              <h1 className="text-3xl font-bold text-zinc-900">Clients</h1>
              <p className="text-zinc-600 mt-1">Coming soon...</p>
            </div>
          } />
          <Route path="/settings" element={
            <div className="flex-1 bg-zinc-50 p-8">
              <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
              <p className="text-zinc-600 mt-1">Coming soon...</p>
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;