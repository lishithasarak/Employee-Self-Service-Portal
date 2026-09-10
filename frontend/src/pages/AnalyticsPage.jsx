import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import { apiGet } from '../utils/api';

const hasChartData = (data) => data.some((item) => item.value > 0);
const csvValue = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const chartSummary = (data) => data.map(({ name, value }) => `${name}: ${value}`).join(', ');

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const fetchAnalytics = useCallback(async (isInitialLoad = false, range = {}) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      const parameters = new URLSearchParams();

      if (range.from && range.to) {
        parameters.set('from', range.from);
        parameters.set('to', range.to);
      }

      const query = parameters.toString();
      const data = await apiGet(`/analytics${query ? `?${query}` : ''}`);

      if (!data || typeof data !== 'object') {
        throw new Error('Analytics data is unavailable. Please try again.');
      }

      setAnalytics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setAnalytics(null);
      setError(err.message || 'Failed to load analytics');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(true);
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div
        className="card panel"
        style={{
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="card panel error-box">
        <p>{error}</p>

        <button
          className="secondary-btn small"
          type="button"
          onClick={() => fetchAnalytics(false, dateRange)}
          style={{ marginTop: '1rem' }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="card panel">
        No analytics data available.
      </div>
    );
  }

  const employees = analytics.employees || {};
  const departments = Array.isArray(analytics.departments)
    ? analytics.departments
    : [];
  const leaves = analytics.leaves || {};
  const attendance = analytics.attendance || {};
  const tickets = analytics.tickets || {};

  /*
   * ============================================================
   * EMPLOYEE STATUS DATA
   * ============================================================
   */

  const employeeData = [
    {
      name: 'Active',
      value: Number(employees.active_employees || 0),
    },
    {
      name: 'Inactive',
      value: Number(employees.inactive_employees || 0),
    },
    {
      name: 'On Leave',
      value: Number(employees.on_leave_employees || 0),
    },
    {
      name: 'Terminated',
      value: Number(employees.terminated_employees || 0),
    },
  ];

  /*
   * ============================================================
   * DEPARTMENT DATA
   * ============================================================
   */

  const departmentData = departments.map((department) => ({
    name: department.name,
    employees: Number(department.employee_count || 0),
  }));

  /*
   * ============================================================
   * LEAVE DATA
   * ============================================================
   */

  const leaveData = [
    {
      name: 'Pending',
      value: Number(leaves.pending || 0),
    },
    {
      name: 'Approved',
      value: Number(leaves.approved || 0),
    },
    {
      name: 'Rejected',
      value: Number(leaves.rejected || 0),
    },
    {
      name: 'Cancelled',
      value: Number(leaves.cancelled || 0),
    },
  ];

  /*
   * ============================================================
   * ATTENDANCE DATA
   * ============================================================
   */

  const attendanceData = [
    {
      name: 'Present',
      value: Number(attendance.present || 0),
    },
    {
      name: 'Absent',
      value: Number(attendance.absent || 0),
    },
    {
      name: 'Late',
      value: Number(attendance.late || 0),
    },
    {
      name: 'On Leave',
      value: Number(attendance.on_leave || 0),
    },
    {
      name: 'Holiday',
      value: Number(attendance.holiday || 0),
    },
  ];

  /*
   * ============================================================
   * TICKET DATA
   * ============================================================
   */

  const ticketData = [
    {
      name: 'Open',
      value: Number(tickets.open || 0),
    },
    {
      name: 'In Progress',
      value: Number(tickets.in_progress || 0),
    },
    {
      name: 'Resolved',
      value: Number(tickets.resolved || 0),
    },
    {
      name: 'Closed',
      value: Number(tickets.closed || 0),
    },
  ];

  const hasEmployeeData = hasChartData(employeeData);
  const hasLeaveData = hasChartData(leaveData);

  /*
   * ============================================================
   * CHART COLORS
   * ============================================================
   */

  const employeeColors = [
    '#2563eb',
    '#94a3b8',
    '#f59e0b',
    '#ef4444',
  ];

  const leaveColors = [
    '#f59e0b',
    '#22c55e',
    '#ef4444',
    '#94a3b8',
  ];

  const attendanceColors = [
    '#22c55e',
    '#ef4444',
    '#f59e0b',
    '#6366f1',
    '#94a3b8',
  ];

  const ticketColors = [
    '#ef4444',
    '#f59e0b',
    '#22c55e',
    '#64748b',
  ];

  const exportAnalytics = () => {
    const rows = [
      ['Smart ESS Analytics Report'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Employee status', 'Count'],
      ...employeeData.map(({ name, value }) => [name, value]),
      [],
      ['Department', 'Employees'],
      ...departmentData.map(({ name, employees: count }) => [name, count]),
      [],
      ['Leave status', 'Count'],
      ...leaveData.map(({ name, value }) => [name, value]),
      [],
      ['Attendance status', 'Count'],
      ...attendanceData.map(({ name, value }) => [name, value]),
      [],
      ['Ticket status', 'Count'],
      ...ticketData.map(({ name, value }) => [name, value]),
    ];
    const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n');
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');

    link.href = url;
    link.download = `smart-ess-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyDateRange = (event) => {
    event.preventDefault();
    fetchAnalytics(false, dateRange);
  };

  const clearDateRange = () => {
    const emptyRange = { from: '', to: '' };

    setDateRange(emptyRange);
    fetchAnalytics(false, emptyRange);
  };

  return (
    <div className="page-section">

      {/* ========================================================
          PAGE HEADER
      ========================================================= */}

      <div className="card panel">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p className="eyebrow">
              Administration
            </p>

            <h2>Analytics Dashboard</h2>

            <p>
              A visual overview of employees, departments,
              attendance, leave requests and support tickets.
            </p>

            {lastUpdated && (
              <p className="analytics-last-updated">
                Last refreshed {lastUpdated.toLocaleString()}
              </p>
            )}

            {analytics.dateRange && (
              <p className="analytics-last-updated">
                Time-based data: {analytics.dateRange.from} to {analytics.dateRange.to}
              </p>
            )}
          </div>

          <div className="analytics-actions">
            <button
              className="secondary-btn small"
              type="button"
              onClick={exportAnalytics}
            >
              Export CSV
            </button>

            <button
              className="secondary-btn small"
              type="button"
              onClick={() => fetchAnalytics(false, dateRange)}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh data'}
            </button>
          </div>
        </div>

        <form className="analytics-filter" onSubmit={applyDateRange}>
          <label>
            From
            <input
              type="date"
              value={dateRange.from}
              onChange={(event) => setDateRange((current) => ({
                ...current,
                from: event.target.value,
              }))}
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={dateRange.to}
              onChange={(event) => setDateRange((current) => ({
                ...current,
                to: event.target.value,
              }))}
            />
          </label>

          <button
            className="primary-btn small"
            type="submit"
            disabled={
              refreshing
              || Boolean(dateRange.from) !== Boolean(dateRange.to)
            }
          >
            Apply range
          </button>

          <button
            className="secondary-btn small"
            type="button"
            disabled={refreshing || (!dateRange.from && !dateRange.to)}
            onClick={clearDateRange}
          >
            Clear
          </button>
        </form>
      </div>


      {/* ========================================================
          TOP SUMMARY CARDS
      ========================================================= */}

      <div
        className="analytics-summary-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div className="card panel">
          <p>Total Employees</p>

          <h2>
            {employees.total_employees || 0}
          </h2>

          <span>
            {employees.active_employees || 0} active employees
          </span>
        </div>

        <div className="card panel">
          <p>Total Leave Requests</p>

          <h2>
            {leaves.total_requests || 0}
          </h2>

          <span>
            {leaves.approved || 0} approved
          </span>
        </div>

        <div className="card panel">
          <p>Attendance Records</p>

          <h2>
            {attendance.total_records || 0}
          </h2>

          <span>
            {attendance.present || 0} present
          </span>
        </div>

        <div className="card panel">
          <p>Total Tickets</p>

          <h2>
            {tickets.total_tickets || 0}
          </h2>

          <span>
            {tickets.open || 0} currently open
          </span>
        </div>
      </div>


      {/* ========================================================
          EMPLOYEE + DEPARTMENT CHARTS
      ========================================================= */}

      <div className="analytics-chart-grid">

        {/* EMPLOYEE STATUS */}

        <div className="card panel">

          <h3>Employee Status</h3>

          {hasEmployeeData ? (
            <div className="analytics-chart" role="img" aria-label={`Employee status: ${chartSummary(employeeData)}`}>
              <ResponsiveContainer>
                <PieChart>

                <Pie
                  data={employeeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {employeeData.map(
                    (entry, index) => (
                      <Cell
                        key={`employee-${index}`}
                        fill={
                          employeeColors[
                            index %
                              employeeColors.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend />

                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="analytics-empty-state">No employee status data yet.</p>
          )}

        </div>


        {/* DEPARTMENT DISTRIBUTION */}

        <div className="card panel">

          <h3>Employees by Department</h3>

          {departmentData.length > 0 ? (
          <div className="analytics-chart" role="img" aria-label={`Employees by department: ${departmentData.map(({ name, employees: count }) => `${name}: ${count}`).join(', ')}`}>
            <ResponsiveContainer>

              <BarChart
                data={departmentData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                />

                <YAxis
                  allowDecimals={false}
                />

                <Tooltip />

                <Bar
                  dataKey="employees"
                  name="Employees"
                  radius={[8, 8, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>
          </div>
          ) : (
            <p className="analytics-empty-state">No departments have been configured yet.</p>
          )}

        </div>

      </div>


      {/* ========================================================
          LEAVE + ATTENDANCE CHARTS
      ========================================================= */}

      <div className="analytics-chart-grid">

        {/* LEAVE STATISTICS */}

        <div className="card panel">

          <h3>Leave Request Status</h3>

          {hasLeaveData ? (
          <div className="analytics-chart" role="img" aria-label={`Leave request status: ${chartSummary(leaveData)}`}>

            <ResponsiveContainer>

              <PieChart>

                <Pie
                  data={leaveData}
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  dataKey="value"
                  label
                >

                  {leaveData.map(
                    (entry, index) => (
                      <Cell
                        key={`leave-${index}`}
                        fill={
                          leaveColors[
                            index %
                              leaveColors.length
                          ]
                        }
                      />
                    )
                  )}

                </Pie>

                <Tooltip />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>
          ) : (
            <p className="analytics-empty-state">No leave requests have been recorded yet.</p>
          )}

        </div>


        {/* ATTENDANCE */}

        <div className="card panel">

          <h3>Attendance Overview</h3>

          <div className="analytics-chart" role="img" aria-label={`Attendance overview: ${chartSummary(attendanceData)}`}>

            <ResponsiveContainer>

              <BarChart
                data={attendanceData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="name"
                />

                <YAxis
                  allowDecimals={false}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  name="Records"
                  radius={[8, 8, 0, 0]}
                >

                  {attendanceData.map(
                    (entry, index) => (
                      <Cell
                        key={`attendance-${index}`}
                        fill={
                          attendanceColors[
                            index %
                              attendanceColors.length
                          ]
                        }
                      />
                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>


      {/* ========================================================
          SUPPORT TICKETS
      ========================================================= */}

      <div
        style={{
          marginTop: '1.5rem',
        }}
      >

        <div className="card panel">

          <h3>Support Ticket Status</h3>

          <div className="analytics-chart analytics-ticket-chart" role="img" aria-label={`Support ticket status: ${chartSummary(ticketData)}`}>

            <ResponsiveContainer>

              <BarChart
                data={ticketData}
                layout="vertical"
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  type="number"
                  allowDecimals={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="value"
                  name="Tickets"
                  radius={[0, 8, 8, 0]}
                >

                  {ticketData.map(
                    (entry, index) => (
                      <Cell
                        key={`ticket-${index}`}
                        fill={
                          ticketColors[
                            index %
                              ticketColors.length
                          ]
                        }
                      />
                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>

      </div>

    </div>
  );
};

export default AnalyticsPage;
