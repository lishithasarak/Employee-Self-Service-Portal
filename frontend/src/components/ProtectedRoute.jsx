import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  const routeRole = location.pathname.split('/')[1]?.toUpperCase();
  if (['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(routeRole) && routeRole !== role) {
    const dashboard = role === 'ADMIN' ? '/admin' : role === 'MANAGER' ? '/manager' : '/employee';
    return <Navigate to={dashboard} replace />;
  }

  return children;
};

export default ProtectedRoute;
