import { useEffect, useState } from 'react';
import { apiGet } from '../utils/api';

const ManagerTeamPage = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiGet('/team');
        setTeamMembers(data.teamMembers || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, []);

  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading team...</div>;

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Team Management</p>
          <h2>Your Team Members</h2>
        </div>
      </div>

      {error && <div className="card panel error-box">{error}</div>}

      <div className="card panel">
        <h3>Team Members ({teamMembers.length})</h3>
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Attendance</th>
                <th>Leave</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No active team members are assigned to you.</td></tr>
              ) : teamMembers.map((member) => (
                <tr key={member.id}>
                  <td><strong>{member.name}</strong></td>
                  <td>{member.employee_code}</td>
                  <td>{member.designation}</td>
                  <td>{member.department || '--'}</td>
                  <td>
                    <span style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      background: member.attendance_status === 'PRESENT' ? '#d1fae5' : member.attendance_status === 'ON_LEAVE' ? '#fef3c7' : '#fee2e2',
                      color: member.attendance_status === 'PRESENT' ? '#065f46' : member.attendance_status === 'ON_LEAVE' ? '#b45309' : '#991b1b',
                      fontSize: '0.85rem'
                    }}>
                      {member.attendance_status}
                    </span>
                  </td>
                  <td>{member.leave_status === 'APPROVED' ? 'On approved leave' : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerTeamPage;
