import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const TicketPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'TECHNICAL',
    subject: '',
    description: '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiGet('/tickets');
      setTickets(data.tickets || []);
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
    
    if (!formData.category || !formData.subject || !formData.description) {
      setError('All fields are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await apiPost('/tickets', formData);
      setSuccess('Support ticket created successfully!');
      setFormData({ category: 'TECHNICAL', subject: '', description: '', priority: 'MEDIUM' });
      setIsFormVisible(false);
      setTimeout(() => setSuccess(''), 3000);
      fetchTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading tickets...</div>;

  const priorityColor = {
    LOW: '#d1e7dd',
    MEDIUM: '#fff3cd',
    HIGH: '#f8d7da',
    URGENT: '#dc3545',
  };

  const statusColor = {
    OPEN: '#cce5ff',
    IN_PROGRESS: '#fff3cd',
    RESOLVED: '#d1e7dd',
    CLOSED: '#e9ecef',
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Support Tickets</p>
          <h2>Manage Your Requests</h2>
        </div>
        <button className="primary-btn" onClick={() => setIsFormVisible(!isFormVisible)}>
          {isFormVisible ? 'Cancel' : 'Raise Ticket'}
        </button>
      </div>

      {error && <div className="card panel error-box">{error}</div>}
      {success && <div className="card panel success-box">{success}</div>}

      {isFormVisible && (
        <div className="card panel">
          <h3>Create Support Ticket</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label><strong>Category</strong></label>
              <select name="category" value={formData.category} onChange={handleInputChange} required>
                <option value="TECHNICAL">Technical Support</option>
                <option value="PAYROLL">Payroll Issue</option>
                <option value="LEAVE">Leave Related</option>
                <option value="HR">HR Related</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label><strong>Subject</strong></label>
              <input 
                type="text" 
                name="subject" 
                value={formData.subject} 
                onChange={handleInputChange} 
                placeholder="Brief subject"
                required 
              />
            </div>
            <div>
              <label><strong>Description</strong></label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                placeholder="Detailed description of the issue"
                style={{ width: '100%', minHeight: '120px' }}
                required 
              />
            </div>
            <div>
              <label><strong>Priority</strong></label>
              <select name="priority" value={formData.priority} onChange={handleInputChange}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      )}

      <div className="card panel">
        <h3>My Support Tickets ({tickets.length})</h3>
        {tickets.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>No tickets yet. Click "Raise Ticket" to create one</p>
        ) : (
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="ticket-item" style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong>{ticket.subject}</strong>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: statusColor[ticket.status] || '#e9ecef', fontSize: '0.75rem', fontWeight: '500' }}>
                        {ticket.status}
                      </span>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: priorityColor[ticket.priority] || '#e9ecef', fontSize: '0.75rem', fontWeight: '500' }}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: '0.3rem 0' }}>{ticket.description}</p>
                    <button className="secondary-btn small" onClick={() => navigate(`/tickets/${ticket.id}`)}>Open conversation</button>
                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '0.3rem 0' }}>
                      {ticket.category} • {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketPage;
