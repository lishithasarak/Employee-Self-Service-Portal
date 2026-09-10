import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../utils/api';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const userName = localStorage.getItem('userName') || 'Employee';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [attendance, leaves, balances, reimbursements] = await Promise.all([apiGet('/attendance'), apiGet('/leaves'), apiGet('/leaves/balance/me'), apiGet('/reimbursements')]);
        
        const presentDays = attendance.attendance.filter((item) => item.status === 'PRESENT').length;
        const workingHours = attendance.attendance.reduce((total, item) => total + Number(item.working_hours || 0), 0);
        
        setMetrics({
          presentDays,
          workingHours: workingHours.toFixed(2),
          pendingRequests: (leaves.leaveRequests || []).filter((item) => item.status === 'PENDING').length + (reimbursements.reimbursements || []).filter((item) => item.status === 'PENDING').length,
          leaveBalance: (balances.balances || []).reduce((total, item) => total + Number(item.remaining_days || 0), 0),
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const metricsData = metrics || {
    presentDays: '--',
    workingHours: '--',
    pendingRequests: '--',
    leaveBalance: '--',
  };

  const metricCards = [
    { label: 'Attendance', value: `${metricsData.presentDays} days` },
    { label: 'Leave Balance', value: `${metricsData.leaveBalance} days` },
    { label: 'Pending Requests', value: metricsData.pendingRequests },
    { label: 'Working Hours', value: `${metricsData.workingHours}h` },
  ];

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">EMPLOYEE Dashboard</p>
          <h2>Welcome back, {userName}</h2>
        </div>
      </div>

      {error && <div className="card panel error-box">{error}</div>}

      <div className="metric-grid">
        {metricCards.map((metric) => (
          <div className="card metric-card" key={metric.label}>
            <div className="label">{metric.label}</div>
            <div className="value">{loading ? 'Loading...' : metric.value}</div>
          </div>
        ))}
      </div>

      <div className="card panel">
        <h3>Quick Actions</h3>
        <div className="action-list">
          <button className="secondary-btn" onClick={() => navigate('/employee/leaves')}>Apply Leave</button>
          <button className="secondary-btn" onClick={() => navigate('/employee/payroll')}>View Payslips</button>
          <button className="secondary-btn" onClick={() => navigate('/employee/tickets')}>Raise Ticket</button>
          <button className="secondary-btn" onClick={() => navigate('/employee/profile')}>Update Profile</button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
