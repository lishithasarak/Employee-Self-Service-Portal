import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPut } from '../utils/api';

const AdminTicketsPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]); const [filter, setFilter] = useState('ALL'); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = async () => { try { setLoading(true); setError(''); const data = await apiGet('/tickets'); setTickets(data.tickets || []); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const update = async (id, field, value) => { try { const data = await apiPut(`/tickets/${id}`, { [field]: value }); setSuccess(data.message); setTimeout(() => setSuccess(''), 2500); await load(); } catch (err) { setError(err.message); } };
  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading tickets...</div>;
  const filtered = filter === 'ALL' ? tickets : tickets.filter((ticket) => ticket.status === filter);
  return <div className="page-section"><div className="page-header"><div><p className="eyebrow">Support Tickets</p><h2>Manage All Support Tickets</h2></div></div>{error && <div className="card panel error-box">{error}</div>}{success && <div className="card panel success-box">{success}</div>}
    <div className="card panel"><h3>Filter Tickets</h3><div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>{['ALL','OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map((status) => <button key={status} className={filter === status ? 'primary-btn small' : 'secondary-btn small'} onClick={() => setFilter(status)}>{status} ({status === 'ALL' ? tickets.length : tickets.filter((ticket) => ticket.status === status).length})</button>)}</div></div>
    <div className="card panel"><h3>All Tickets ({filtered.length})</h3><div style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Ticket</th><th>Employee</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>{filtered.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No tickets found.</td></tr> : filtered.map((ticket) => <tr key={ticket.id}><td><strong>TKT-{ticket.id}</strong><br />{ticket.subject}<br/><button className="secondary-btn small" onClick={() => navigate(`/tickets/${ticket.id}`)}>Open</button></td><td>{ticket.employee_name}</td><td>{ticket.category}</td><td><select value={ticket.priority} onChange={(e) => update(ticket.id, 'priority', e.target.value)}>{['LOW','MEDIUM','HIGH','URGENT'].map((item) => <option key={item}>{item}</option>)}</select></td><td><select value={ticket.status} onChange={(e) => update(ticket.id, 'status', e.target.value)}>{['OPEN','IN_PROGRESS','RESOLVED','CLOSED'].map((item) => <option key={item}>{item}</option>)}</select></td><td>{ticket.created_at?.slice(0, 10)}</td></tr>)}</tbody></table></div></div>
  </div>;
};
export default AdminTicketsPage;
