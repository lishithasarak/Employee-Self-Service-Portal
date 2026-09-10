import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../utils/api';

const LeavePage = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [leaves, types, bals] = await Promise.all([
        apiGet('/leaves'),
        apiGet('/leaves/types/all'),
        apiGet('/leaves/balance/me'),
      ]);

      setLeaveRequests(leaves.leaveRequests || []);
      setLeaveTypes(types.leaveTypes || []);
      setBalances(bals.balances || []);

      // Set default leave type if available
      if (types.leaveTypes && types.leaveTypes.length > 0) {
        setFormData((prev) => ({ ...prev, leave_type_id: types.leaveTypes[0].id }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.leave_type_id || !formData.start_date || !formData.end_date || !formData.reason) {
      setError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await apiPost('/leaves', {
        leave_type_id: parseInt(formData.leave_type_id),
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
      });
      setSuccess('Leave request submitted successfully!');
      const defaultTypeId = leaveTypes.length > 0 ? leaveTypes[0].id : '';
      setFormData({ leave_type_id: defaultTypeId, start_date: '', end_date: '', reason: '' });
      setIsFormVisible(false);
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      setError('');
      await apiPut(`/leaves/${id}`, { status: 'CANCELLED' });
      setSuccess('Leave request cancelled');
      setTimeout(() => setSuccess(''), 3000);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading leave data...</div>;

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Leave Management</p>
          <h2>Manage Your Leaves</h2>
        </div>
        <button className="primary-btn" onClick={() => setIsFormVisible(!isFormVisible)}>
          {isFormVisible ? 'Cancel' : 'Apply Leave'}
        </button>
      </div>

      {error && <div className="card panel error-box">{error}</div>}
      {success && <div className="card panel success-box">{success}</div>}

      {isFormVisible && (
        <div className="card panel">
          <h3>Apply for Leave</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label><strong>Leave Type</strong></label>
              <select name="leave_type_id" value={formData.leave_type_id} onChange={handleInputChange} required>
                <option value="">Select a leave type...</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label><strong>Start Date</strong></label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} required />
              </div>
              <div>
                <label><strong>End Date</strong></label>
                <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} required />
              </div>
            </div>
            <div>
              <label><strong>Reason</strong></label>
              <textarea 
                name="reason" 
                value={formData.reason} 
                onChange={handleInputChange} 
                placeholder="Enter reason for leave"
                style={{ width: '100%', minHeight: '100px' }}
                required 
              />
            </div>
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      <div className="card panel">
        <h3>Leave Balance ({balances.length > 0 ? `Year: ${balances[0].year}` : 'N/A'})</h3>
        {balances.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>No leave balances found</p>
        ) : (
          <div className="metric-grid">
            {balances.map((balance) => (
              <div className="metric-card card" key={balance.id}>
                <div className="label">{balance.leave_type_name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                  <p><strong>Remaining:</strong> {balance.remaining_days} days</p>
                  <p><strong>Used:</strong> {balance.used_days} / {balance.total_days} days</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card panel">
        <h3>Leave Requests</h3>
        {leaveRequests.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>No leave requests yet</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.leave_type}</strong></td>
                    <td>{item.start_date} to {item.end_date}</td>
                    <td>{item.total_days}</td>
                    <td>{item.reason}</td>
                    <td>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', 
                        borderRadius: '6px', 
                        background: item.status === 'PENDING' ? '#fef3c7' : item.status === 'APPROVED' ? '#d1fae5' : '#fee2e2',
                        color: item.status === 'PENDING' ? '#b45309' : item.status === 'APPROVED' ? '#065f46' : '#991b1b',
                        fontSize: '0.85rem' 
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.status === 'PENDING' && (
                        <button 
                          className="secondary-btn small" 
                          onClick={() => handleCancelRequest(item.id)}
                        >
                          Cancel
                        </button>
                      )}
                      {item.status !== 'PENDING' && <span style={{ color: 'var(--muted)' }}>--</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeavePage;
