import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ThreeDGraphPage from './repo-vision/ThreeDGraphPage';
import AgentDashboard from './agent-ui/AgentDashboard';
import IncidentsDashboard from './agent-ui/IncidentsDashboard';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

import ProtectedRoute from './components/auth/ProtectedRoute';
import HomePage from "./HomePage";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />}></Route>
      <Route path="/3d" element={<ThreeDGraphPage />}></Route>
      <Route path="/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>}></Route>
      <Route path="/incidents" element={<ProtectedRoute><IncidentsDashboard /></ProtectedRoute>}></Route>
      <Route path="/login" element={<LoginPage />}></Route>
      <Route path="/signup" element={<SignupPage />}></Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router basename="/">
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
