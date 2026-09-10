import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';

const Topbar = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Employee';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    apiGet('/notifications').then((data) => setUnreadCount(data.unreadCount || 0)).catch(() => setUnreadCount(0));
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userName');
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="topbar" aria-label="User account header">
      <div>
        <p className="eyebrow">Welcome back</p>
        <h2>{userName}</h2>
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="secondary-btn small"
          onClick={() => navigate('/notifications')}
          aria-label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          Notifications{unreadCount ? ` (${unreadCount})` : ''}
        </button>
        <button
          type="button"
          className="secondary-btn small"
          onClick={handleLogout}
          aria-label="Log out of the application"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
