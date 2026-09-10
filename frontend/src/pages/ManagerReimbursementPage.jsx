import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '../utils/api';

const ManagerReimbursementPage = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [decidingId, setDecidingId] = useState(null);

  const load = async () => {
    try { setLoading(true); setError(''); const data = await apiGet('/reimbursements/team'); setReimbursements(data.reimbursements || []); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    const comments = status === 'REJECTED' ? window.prompt('Reason for rejection:') : null;
    if (status === 'REJECTED' && !comments?.trim()) return;
    try {
      setDecidingId(id); setError('');
      const data = await apiPut(`/reimbursements/${id}/decision`, { status, ...(comments ? { comments: comments.trim() } : {}) });
      setSuccess(data.message); setTimeout(() => setSuccess(''), 3000); await load();
    } catch (err) { setError(err.message); } finally { setDecidingId(null); }
  };

  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading reimbursements...</div>;
  const pending = reimbursements.filter((item) => item.status === 'PENDING');
  const money = (amount) => `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return <div className="page-section">
    <div className="page-header"><div><p className="eyebrow">Reimbursements</p><h2>Approve Employee Reimbursements</h2></div></div>
    {error && <div className="card panel error-box">{error}</div>}
    {success && <div className="card panel success-box">{success}</div>}
    <div className="card panel"><h3>Reimbursement Summary</h3><div className="metric-grid">
      <div className="metric-card card"><div className="label">Pending</div><div className="value">{pending.length}</div></div>
      <div className="metric-card card"><div className="label">Pending Amount</div><div className="value">{money(pending.reduce((sum, item) => sum + Number(item.amount), 0))}</div></div>
      <div className="metric-card card"><div className="label">Total Amount</div><div className="value">{money(reimbursements.reduce((sum, item) => sum + Number(item.amount), 0))}</div></div>
    </div></div>
    <div className="card panel"><h3>Pending Reimbursements</h3>
      {pending.length === 0 ? <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>No pending reimbursements</p> : <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
        {pending.map((item) => <div key={item.id} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', background: '#fffbf0' }}>
          <h4 style={{ margin: 0 }}>{item.employee_name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({item.employee_code})</span></h4>
          <p style={{ color: 'var(--muted)', margin: '0.3rem 0' }}>{item.category} • {item.expense_date} • {money(item.amount)}</p>
          <p><strong>Description:</strong> {item.description}</p>{item.receipt_url && <a href={item.receipt_url} target="_blank" rel="noreferrer">View receipt</a>}
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}><button className="primary-btn small" disabled={decidingId === item.id} onClick={() => decide(item.id, 'APPROVED')}>{decidingId === item.id ? 'Saving...' : 'Approve'}</button><button className="secondary-btn small" disabled={decidingId === item.id} onClick={() => decide(item.id, 'REJECTED')} style={{ background: '#fee2e2', color: '#991b1b' }}>Reject</button></div>
        </div>)}
      </div>}
    </div>
    <div className="card panel"><h3>All Reimbursements</h3><div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Employee</th><th>Category</th><th>Date</th><th>Amount</th><th>Description</th><th>Status</th></tr></thead><tbody>
      {reimbursements.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No reimbursement requests from your team.</td></tr> : reimbursements.map((item) => <tr key={item.id}><td>{item.employee_name}</td><td>{item.category}</td><td>{item.expense_date}</td><td>{money(item.amount)}</td><td>{item.description}</td><td>{item.status}</td></tr>)}
    </tbody></table></div></div>
  </div>;
};

export default ManagerReimbursementPage;
