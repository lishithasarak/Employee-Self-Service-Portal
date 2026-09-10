import { NavLink } from 'react-router-dom';

const menuItems = {
  EMPLOYEE: [
    { label: 'Dashboard', path: '/employee' },
    { label: 'Profile', path: '/employee/profile' },
    { label: 'Attendance', path: '/employee/attendance' },
    { label: 'Leave', path: '/employee/leaves' },
    { label: 'Payroll', path: '/employee/payroll' },
    { label: 'Reimbursements', path: '/employee/reimbursements' },
    { label: 'Documents', path: '/employee/documents' },
    { label: 'Tickets', path: '/employee/tickets' },
  ],

  MANAGER: [
    { label: 'Dashboard', path: '/manager' },
    { label: 'Team', path: '/manager/team' },
    { label: 'Attendance', path: '/manager/attendance' },
    { label: 'Leaves', path: '/manager/leaves' },
    { label: 'Reimbursements', path: '/manager/reimbursements' },
  ],

  ADMIN: [
    { label: 'Dashboard', path: '/admin' },
    { label: 'Analytics', path: '/admin/analytics' },
    { label: 'Employees', path: '/admin/employees' },
    { label: 'Departments', path: '/admin/departments' },
    { label: 'Attendance', path: '/admin/attendance' },
    { label: 'Leaves', path: '/admin/leaves' },
    { label: 'Leave Settings', path: '/admin/leave-settings' },
    { label: 'Payroll', path: '/admin/payroll' },
    { label: 'Documents', path: '/admin/documents' },
    { label: 'Tickets', path: '/admin/tickets' },
    { label: 'Audit Trail', path: '/admin/audit' },
  ],
};

const Sidebar = () => {
  const role = localStorage.getItem('role') || 'EMPLOYEE';
  const items = menuItems[role] || menuItems.EMPLOYEE;

  return (
    <aside className="sidebar" aria-label="Application sidebar">
      <div className="brand-block">
        <div className="brand-mark">S</div>

        <div>
          <h1>Smart ESS</h1>
        </div>
      </div>

      <nav className="nav-menu" aria-label="Primary navigation">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
            aria-label={item.label}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
