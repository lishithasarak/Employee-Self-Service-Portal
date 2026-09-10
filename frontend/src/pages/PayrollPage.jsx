import { useEffect, useState } from 'react';
import { apiGet } from '../utils/api';

const PayrollPage = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayslips = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await apiGet('/payroll');
        setPayslips(data.payslips || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, []);

  if (loading) return <div className="card panel" style={{ padding: '2rem', textAlign: 'center' }}>Loading payroll data...</div>;

  const summary = payslips.length > 0 ? {
    grossSalary: payslips[0].gross_salary,
    netSalary: payslips[0].net_salary,
    deductions: payslips[0].deductions,
  } : {
    grossSalary: 0,
    netSalary: 0,
    deductions: 0,
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <div>
          <p className="eyebrow">Payroll</p>
          <h2>Salary & Payslips</h2>
        </div>
      </div>

      {error && <div className="card panel error-box">{error}</div>}

      <div className="card panel">
        <h3>Salary Summary</h3>
        <div className="metric-grid">
          <div className="metric-card card">
            <div className="label">Gross Salary</div>
            <div className="value">₹{summary.grossSalary.toLocaleString()}</div>
          </div>
          <div className="metric-card card">
            <div className="label">Deductions</div>
            <div className="value">₹{summary.deductions.toLocaleString()}</div>
          </div>
          <div className="metric-card card">
            <div className="label">Net Salary</div>
            <div className="value">₹{summary.netSalary.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="card panel">
        <h3>Payslip History</h3>
        {payslips.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '2rem' }}>No payslips available</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((payslip) => (
                  <tr key={payslip.id}>
                    <td><strong>{payslip.month} {payslip.year}</strong></td>
                    <td>₹{payslip.gross_salary.toLocaleString()}</td>
                    <td>₹{payslip.deductions.toLocaleString()}</td>
                    <td>₹{payslip.net_salary.toLocaleString()}</td>
                    <td>
                      {payslip.file_url ? (
                        <a href={payslip.file_url} target="_blank" rel="noreferrer" className="secondary-btn small">View Payslip</a>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>--</span>
                      )}
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

export default PayrollPage;
