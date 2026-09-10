import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../utils/api';

const initialForm = { category: 'TRAVEL', amount: '', expense_date: '', description: '', receipt_url: '' };

const ReimbursementPage = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    try { setLoading(true); setError(''); const data = await apiGet('/reimbursements'); setReimbursements(data.reimbursements || []); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0 || !form.expense_date || !form.description.trim()) { setError('Complete all required fields and enter a positive amount.'); return; }
    try {
      setSubmitting(true); setError('');
      const data = await apiPost('/reimbursements', { ...form, amount: Number(form.amount), description: form.description.trim(), receipt_url: form.receipt_url.trim() });
      setSuccess(`${data.requestCode} submitted successfully.`); setForm(initialForm); setShowForm(false); setTimeout(() => setSuccess(''), 3000); await load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading reimbursements...</div>;
  const money = (amount) => `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  return <div className="page-section">
    <div className="page-header"><div><p className="eyebrow">Reimbursements</p><h2>Manage Your Expense Claims</h2></div><button className="primary-btn" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : 'Submit Reimbursement'}</button></div>
    {error && <div className="card panel error-box">{error}</div>}
    {success && <div className="card panel success-box">{success}</div>}
    {showForm && <div className="card panel"><h3>New Reimbursement Request</h3><form onSubmit={submit} style={{ display: 'grid', gap: '1rem' }}>
      <div><label><strong>Category</strong></label><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="TRAVEL">Travel</option><option value="FOOD">Food</option><option value="MEDICAL">Medical</option><option value="OTHER">Other</option></select></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}><div><label><strong>Amount (₹)</strong></label><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required /></div><div><label><strong>Expense Date</strong></label><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} required /></div></div>
      <div><label><strong>Description</strong></label><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ width: '100%', minHeight: '100px' }} required /></div>
      <div><label><strong>Receipt URL (optional)</strong></label><input type="url" placeholder="https://..." value={form.receipt_url} onChange={(event) => setForm({ ...form, receipt_url: event.target.value })} /></div>
      <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</button>
    </form></div>}
    <div className="card panel"><h3>Request History</h3><div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Request</th><th>Category</th><th>Expense Date</th><th>Amount</th><th>Description</th><th>Receipt</th><th>Status</th></tr></thead><tbody>
      {reimbursements.length === 0 ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No reimbursement requests yet.</td></tr> : reimbursements.map((item) => <tr key={item.id}><td>RMB-{item.id}</td><td>{item.category}</td><td>{item.expense_date}</td><td>{money(item.amount)}</td><td>{item.description}</td><td>{item.receipt_url ? <a href={item.receipt_url} target="_blank" rel="noreferrer">View</a> : '--'}</td><td>{item.status}</td></tr>)}
    </tbody></table></div></div>
  </div>;
};

export default ReimbursementPage;
