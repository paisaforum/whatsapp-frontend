import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import SubmitProof from './SubmitProof';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminUserProfile from './AdminUserProfile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/submit-proof" element={<SubmitProof />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/user/:userId" element={<AdminUserProfile />} />
      </Routes>
    </Router>
  );
}

export default App;