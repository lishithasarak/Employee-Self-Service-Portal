import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../utils/api';

const statusStyle = (status) => ({
  padding: '0.3rem 0.6rem', borderRadius: '6px',
  background: status === 'PENDING' ? '#fef3c7' : status === 'APPROVED' ? '#d1fae5' : '#fee2e2',
  color: status === 'PENDING' ? '#b45309' : status === 'APPROVED' ? '#065f46' : '#991b1b', fontSize: '0.85rem',
});

const ManagerLeavesPage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [decidingId, setDecidingId] = useState(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true); setError('');
      const data = await apiGet('/leaves/team');
      setLeaveRequests(data.leaveRequests || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleDecision = async (id, status) => {
    const rejectionReason = status === 'REJECTED' ? window.prompt('Reason for rejection:') : null;
    if (status === 'REJECTED' && !rejectionReason?.trim()) return;
    try {
      setDecidingId(id); setError('');
      const data = await apiPut(`/leaves/${id}/decision`, { status, ...(rejectionReason ? { rejection_reason: rejectionReason.trim() } : {}) });
      setSuccess(data.message); setTimeout(() => setSuccess(''), 3000);
      await fetchLeaves();
    } catch (err) { setError(err.message); }
    finally { setDecidingId(null); }
  };

  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading leave requests...</div>;
  const pendingRequests = leaveRequests.filter((request) => request.status === 'PENDING');
  const approvedRequests = leaveRequests.filter((request) => request.status === 'APPROVED').length;

  return (
    <div className="page-section">
      <div className="page-header"><div><p className="eyebrow">Leave Approvals</p><h2>Approve Team Leave Requests</h2></div></div>
      {error && <div className="card panel error-box">{error}</div>}
      {success && <div className="card panel success-box">{success}</div>}

      <div className="card panel">
        <h3>Leave Requests Overview</h3>
        <div className="metric-grid">
          <div className="metric-card card"><div className="label">Pending</div><div className="value">{pendingRequests.length}</div></div>
          <div className="metric-card card"><div className="label">Approved</div><div className="value">{approvedRequests}</div></div>
          <div className="metric-card card"><div className="label">Total Requests</div><div className="value">{leaveRequests.length}</div></div>
        </div>
      </div>

      <div className="card panel">
        <h3>Pending Approvals</h3>
        {pendingRequests.length === 0 ? <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>No pending leave requests</p> : (
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            {pendingRequests.map((request) => (
              <div key={request.id} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', background: '#fffbf0' }}>
                <h4 style={{ margin: 0 }}>{request.employee_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({request.employee_code})</span></h4>
                <p style={{ color: 'var(--muted)', margin: '0.3rem 0', fontSize: '0.9rem' }}>{request.leave_type} • {request.start_date} to {request.end_date} ({request.total_days} days)</p>
                <p style={{ color: 'var(--text)', margin: '0.5rem 0' }}><strong>Reason:</strong> {request.reason}</p>
                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <button className="primary-btn small" onClick={() => handleDecision(request.id, 'APPROVED')} disabled={decidingId === request.id}>{decidingId === request.id ? 'Saving...' : 'Approve'}</button>
                  <button className="secondary-btn small" onClick={() => handleDecision(request.id, 'REJECTED')} disabled={decidingId === request.id} style={{ background: '#fee2e2', color: '#991b1b' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card panel">
        <h3>All Leave Requests</h3>
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}><table className="data-table">
          <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>{leaveRequests.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No leave requests from your team.</td></tr> : leaveRequests.map((request) => (
            <tr key={request.id}><td><strong>{request.employee_name}</strong></td><td>{request.leave_type}</td><td>{request.start_date} to {request.end_date}</td><td>{request.total_days}</td><td>{request.reason}</td><td><span style={statusStyle(request.status)}>{request.status}</span></td></tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
};

export default ManagerLeavesPage;
