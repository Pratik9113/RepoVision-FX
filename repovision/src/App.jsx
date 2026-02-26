import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RepoVisionPage from './repo-vision/RepoVisionPage';
import ThreeDGraphPage from './repo-vision/ThreeDGraphPage';
import AgentDashboard from './agent-ui/AgentDashboard';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RepoVisionPage />}></Route>
      <Route path="/3d" element={<ThreeDGraphPage />}></Route>
      <Route path="/agent" element={<AgentDashboard />}></Route>
    </Routes>
  )
}

export default function App() {
  return (
    <Router basename="/">
      <AppRoutes />
    </Router>
  );
}
