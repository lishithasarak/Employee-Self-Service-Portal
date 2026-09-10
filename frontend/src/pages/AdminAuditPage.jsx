import { useEffect, useState } from 'react';
import { apiGet } from '../utils/api';

const AdminAuditPage = () => {
  const [logs, setLogs] = useState([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async (value = search) => { try { setLoading(true); setError(''); const data = await apiGet(`/audit?limit=100&search=${encodeURIComponent(value.trim())}`); setLogs(data.logs || []); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  useEffect(() => { load(''); }, []);
  return <div className="page-section"><div className="page-header"><div><p className="eyebrow">Audit Trail</p><h2>System Activity</h2></div></div>{error && <div className="card panel error-box">{error}</div>}<form className="card panel" onSubmit={(event) => { event.preventDefault(); load(); }} style={{display:'flex',gap:'.5rem'}}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user, action, or resource" /><button className="primary-btn" type="submit">Search</button></form><div className="card panel" style={{overflowX:'auto'}}>{loading ? 'Loading audit activity...' : <table className="data-table"><thead><tr><th>When</th><th>User</th><th>Action</th><th>Resource</th><th>Details</th></tr></thead><tbody>{logs.length === 0 ? <tr><td colSpan="5" style={{textAlign:'center',padding:'2rem'}}>No audit entries found.</td></tr> : logs.map((log) => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.user_name || log.user_email || 'System'}</td><td>{log.action}</td><td>{log.entity_type || '--'}{log.entity_id ? ` #${log.entity_id}` : ''}</td><td><code style={{whiteSpace:'pre-wrap'}}>{log.new_value ? JSON.stringify(log.new_value) : '--'}</code></td></tr>)}</tbody></table>}</div></div>;
};

export default AdminAuditPage;
