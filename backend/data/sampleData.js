const bcrypt = require('bcryptjs');

const passwordHash = '$2a$10$QbhJmD3dDTdllVdt/mLrJ.w1oQpZMHJoKt/0m.bMvIjWpOq8Nb.SK';

const sampleUsers = [
  {
    id: 1,
    name: 'System Admin',
    email: 'admin@smartess.com',
    password_hash: passwordHash,
    role: 'ADMIN',
    is_active: true,
  },
  {
    id: 2,
    name: 'Aisha Manager',
    email: 'manager@smartess.com',
    password_hash: passwordHash,
    role: 'MANAGER',
    is_active: true,
  },
  {
    id: 3,
    name: 'Nisha Employee',
    email: 'employee@smartess.com',
    password_hash: passwordHash,
    role: 'EMPLOYEE',
    is_active: true,
  },
];

const sampleEmployees = [
  {
    id: 1,
    user_id: 1,
    employee_code: 'EMP-3001',
    department: 'Finance',
    designation: 'System Administrator',
    phone: '+91 9988776655',
    email: 'admin@smartess.com',
    joining_date: '2022-06-12',
    address: 'Pune, India',
    emergency_contact_name: 'Neha Shah',
    emergency_contact_phone: '+91 9222222222',
    manager_name: 'Aisha Manager',
    profile_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 2,
    user_id: 2,
    employee_code: 'EMP-2001',
    department: 'Human Resources',
    designation: 'HR Manager',
    phone: '+91 9123456780',
    email: 'manager@smartess.com',
    joining_date: '2023-11-20',
    address: 'Hyderabad, India',
    emergency_contact_name: 'Meena Rao',
    emergency_contact_phone: '+91 9111111111',
    manager_name: null,
    profile_photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: 3,
    user_id: 3,
    employee_code: 'EMP-1001',
    department: 'Engineering',
    designation: 'Frontend Developer',
    phone: '+91 9876543210',
    email: 'employee@smartess.com',
    joining_date: '2024-02-10',
    address: 'Bengaluru, India',
    emergency_contact_name: 'Ravi Kumar',
    emergency_contact_phone: '+91 9000000000',
    manager_name: 'Aisha Manager',
    profile_photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  },
];

const sampleAttendance = [
  {
    id: 101,
    employee_id: 1,
    attendance_date: '2026-08-15',
    check_in: '2026-08-15T09:05:00',
    check_out: '2026-08-15T18:10:00',
    working_hours: 9.08,
    status: 'PRESENT',
  },
  {
    id: 102,
    employee_id: 1,
    attendance_date: '2026-08-14',
    check_in: '2026-08-14T09:15:00',
    check_out: '2026-08-14T18:00:00',
    working_hours: 8.75,
    status: 'PRESENT',
  },
  {
    id: 103,
    employee_id: 1,
    attendance_date: '2026-08-13',
    check_in: null,
    check_out: null,
    working_hours: 0,
    status: 'ABSENT',
  },
];

const sampleLeaveRequests = [
  {
    id: 201,
    employee_id: 1,
    leave_type: 'Casual Leave',
    start_date: '2026-08-20',
    end_date: '2026-08-22',
    total_days: 3,
    reason: 'Family function',
    status: 'APPROVED',
    created_at: '2026-08-10T10:00:00Z',
  },
  {
    id: 202,
    employee_id: 1,
    leave_type: 'Sick Leave',
    start_date: '2026-08-28',
    end_date: '2026-08-29',
    total_days: 2,
    reason: 'Medical check-up',
    status: 'PENDING',
    created_at: '2026-08-12T12:30:00Z',
  },
];

const sampleBalance = {
  casual_leave: 10,
  earned_leave: 14,
  sick_leave: 8,
};

module.exports = {
  sampleUsers,
  sampleEmployees,
  sampleAttendance,
  sampleLeaveRequests,
  sampleBalance,
  passwordHash,
};
