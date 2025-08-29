import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  // Kullanıcı giriş yapmışsa, altındaki route'ları (children) render et.
  // Giriş yapmamışsa, /login sayfasına yönlendir.
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
