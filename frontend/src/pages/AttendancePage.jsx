import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../utils/api';

const AttendancePage = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [success, setSuccess] = useState('');
  const [todayRecord, setTodayRecord] = useState(null);

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Get today's date in local timezone
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  // Convert database attendance date into YYYY-MM-DD
  const normalizeAttendanceDate = (value) => {
    if (!value) return '';

    // Handle MySQL DATE returned as YYYY-MM-DD
    if (
      typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      return value;
    }

    // Handle MySQL datetime / ISO datetime
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return getLocalDateString(date);
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await apiGet('/attendance');

      const records = data.attendance || [];

      setAttendance(records);

      const today = getLocalDateString();

      const todayRecord = records.find((item) => {
        return normalizeAttendanceDate(item.attendance_date) === today;
      });

      setTodayRecord(todayRecord || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      setError('');
      setSuccess('');

      await apiPost('/attendance/check-in', {});

      setSuccess('Check-in successful!');

      await fetchAttendance();

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setCheckingOut(true);
      setError('');
      setSuccess('');

      await apiPost('/attendance/check-out', {});

      setSuccess('Check-out successful!');

      await fetchAttendance();

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div
        className="card panel"
        style={{
          padding: '2rem',
          textAlign: 'center'
        }}
      >
        Loading attendance...
      </div>
    );
  }

  return (
    <div className="page-section">

      <div className="page-header">
        <div>
          <p className="eyebrow">Attendance</p>
          <h2>Track Your Attendance</h2>
        </div>
      </div>

      {error && (
        <div className="card panel error-box">
          {error}
        </div>
      )}

      {success && (
        <div className="card panel success-box">
          {success}
        </div>
      )}

      {/* Today's Attendance */}
      <div className="card panel">

        <h3>Today's Check-in/Check-out</h3>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1rem'
          }}
        >

          {/* CHECK IN */}
          <button
            className="primary-btn"
            onClick={handleCheckIn}
            disabled={
              checkingIn ||
              Boolean(todayRecord?.check_in)
            }
          >
            {checkingIn
              ? 'Checking In...'
              : todayRecord?.check_in
                ? 'Checked In'
                : 'Check In'}
          </button>

          {/* CHECK OUT */}
          <button
            className="primary-btn"
            onClick={handleCheckOut}
            disabled={
              checkingOut ||
              !todayRecord ||
              !todayRecord.check_in ||
              Boolean(todayRecord.check_out)
            }
            style={{
              background:
                todayRecord?.check_out
                  ? '#ccc'
                  : 'var(--primary)'
            }}
          >
            {checkingOut
              ? 'Checking Out...'
              : todayRecord?.check_out
                ? 'Checked Out'
                : 'Check Out'}
          </button>

        </div>

        {/* TODAY'S RECORD */}
        {todayRecord && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              background: '#f0f7ff',
              borderRadius: '8px'
            }}
          >

            <p>
              <strong>Check-in:</strong>{' '}
              {todayRecord.check_in
                ? new Date(
                    todayRecord.check_in
                  ).toLocaleTimeString()
                : 'Not checked in'}
            </p>

            <p>
              <strong>Check-out:</strong>{' '}
              {todayRecord.check_out
                ? new Date(
                    todayRecord.check_out
                  ).toLocaleTimeString()
                : 'Not checked out'}
            </p>

            {todayRecord.working_hours > 0 && (
              <p>
                <strong>Working Hours:</strong>{' '}
                {todayRecord.working_hours}h
              </p>
            )}

          </div>
        )}

      </div>

      {/* ATTENDANCE OVERVIEW */}
      <div className="card panel">

        <h3>Attendance Overview</h3>

        <div className="metric-grid">

          <div className="metric-card card">
            <div className="label">
              Present Days
            </div>

            <div className="value">
              {
                attendance.filter(
                  (item) =>
                    item.status === 'PRESENT'
                ).length
              }
            </div>
          </div>

          <div className="metric-card card">
            <div className="label">
              Absent Days
            </div>

            <div className="value">
              {
                attendance.filter(
                  (item) =>
                    item.status === 'ABSENT'
                ).length
              }
            </div>
          </div>

          <div className="metric-card card">
            <div className="label">
              Total Hours
            </div>

            <div className="value">
              {attendance
                .reduce(
                  (total, item) =>
                    total +
                    Number(
                      item.working_hours || 0
                    ),
                  0
                )
                .toFixed(1)}
              h
            </div>
          </div>

        </div>

      </div>

      {/* ATTENDANCE HISTORY */}
      <div className="card panel">

        <h3>Attendance History</h3>

        <div
          style={{
            overflowX: 'auto'
          }}
        >

          <table className="data-table">

            <thead>
              <tr>
                <th>Date</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {attendance.length === 0 ? (

                <tr>
                  <td
                    colSpan="5"
                    style={{
                      textAlign: 'center',
                      padding: '2rem'
                    }}
                  >
                    No attendance records
                  </td>
                </tr>

              ) : (

                attendance.map((item) => (

                  <tr key={item.id}>

                    <td>
                      {normalizeAttendanceDate(
                        item.attendance_date
                      )}
                    </td>

                    <td>
                      {item.check_in
                        ? new Date(
                            item.check_in
                          ).toLocaleTimeString()
                        : '--'}
                    </td>

                    <td>
                      {item.check_out
                        ? new Date(
                            item.check_out
                          ).toLocaleTimeString()
                        : '--'}
                    </td>

                    <td>
                      {item.working_hours || 0}h
                    </td>

                    <td>

                      <span
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          fontSize: '0.85rem'
                        }}
                      >
                        {item.status}
                      </span>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};

export default AttendancePage;