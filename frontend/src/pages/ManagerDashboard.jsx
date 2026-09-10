import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Manager';
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet('/team/summary')
      .then((data) => setSummary(data.summary))
      .catch((err) => setError(err.message));
  }, []);

  const metrics = summary ? [
    { label: 'Team Members', value: summary.totalMembers },
    { label: 'Present Today', value: summary.presentToday },
    { label: 'Absent Today', value: summary.absentToday },
    { label: 'On Leave', value: summary.onLeave },
    { label: 'Pending Leaves', value: summary.pendingLeaves },
    { label: 'Pending Reimbursements', value: summary.pendingReimbursements },
  ] : [];

  return (
    <div className="page-section">
      <div className="page-header"><div><p className="eyebrow">MANAGER Dashboard</p><h2>Welcome back, {userName}</h2></div></div>
      {error && <div className="card panel error-box">Unable to load dashboard: {error}</div>}
      {!summary && !error ? <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard...</div> : (
        <>
          <div className="metric-grid">{metrics.map((metric) => <div className="card metric-card" key={metric.label}><div className="label">{metric.label}</div><div className="value">{metric.value}</div></div>)}</div>
          <div className="card panel">
            <h3>Quick Actions</h3>
            <div className="action-list">
              <button className="secondary-btn" onClick={() => navigate('/manager/team')}>View Team</button>
              <button className="secondary-btn" onClick={() => navigate('/manager/attendance')}>Attendance</button>
              <button className="secondary-btn" onClick={() => navigate('/manager/leaves')}>Leave Approvals</button>
              <button className="secondary-btn" onClick={() => navigate('/manager/reimbursements')}>Reimbursements</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ManagerDashboard;
