import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RepoVisionPage from './repo-vision/RepoVisionPage'

function AppRoutes() {

  return (
    <Routes>
      <Route path = "/" element={<RepoVisionPage/>}></Route>
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
