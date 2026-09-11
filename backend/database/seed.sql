USE smart_ess;

INSERT INTO departments (name, code, description) VALUES
('Engineering', 'ENG', 'Product and platform engineering'),
('Human Resources', 'HR', 'Human resources and employee support'),
('Finance', 'FIN', 'Finance and payroll operations'),
('Operations', 'OPS', 'Operations and process management');

INSERT INTO users (name, email, password_hash, role_id, is_active) VALUES
('System Admin', 'admin@smartess.com', '$2a$10$GKonywqHMuEoVl5RCicJ0ewObSf1C70qD/t.wWm8RRYxptuDNQEci', 3, 1),
('Aisha Manager', 'manager@smartess.com', '$2a$10$GKonywqHMuEoVl5RCicJ0ewObSf1C70qD/t.wWm8RRYxptuDNQEci', 2, 1),
('Nisha Employee', 'employee@smartess.com', '$2a$10$GKonywqHMuEoVl5RCicJ0ewObSf1C70qD/t.wWm8RRYxptuDNQEci', 1, 1);

INSERT INTO employees (user_id, employee_code, department_id, designation, phone, address, emergency_contact_name, emergency_contact_phone, joining_date, manager_id, status)
VALUES
(2, 'EMP-2001', 2, 'HR Manager', '+91 9123456780', 'Hyderabad, India', 'Meena Rao', '+91 9111111111', '2023-11-20', NULL, 'ACTIVE'),
(3, 'EMP-1001', 1, 'Frontend Developer', '+91 9876543210', 'Bengaluru, India', 'Ravi Kumar', '+91 9000000000', '2024-02-10', 1, 'ACTIVE'),
(1, 'EMP-3001', 3, 'System Administrator', '+91 9988776655', 'Pune, India', 'Neha Shah', '+91 9222222222', '2022-06-12', 1, 'ACTIVE');

INSERT INTO leave_types (name, description, max_days_per_year, is_paid) VALUES
('Casual Leave', 'Short-term personal leave', 12, 1),
('Earned Leave', 'Annual earned leave', 18, 1),
('Sick Leave', 'Medical leave', 10, 1),
('Paid Leave', 'Company holiday leave', 5, 1);

INSERT INTO leave_balances (employee_id, leave_type_id, total_days, used_days, remaining_days, year) VALUES
(1, 1, 12.00, 2.00, 10.00, 2026),
(1, 2, 18.00, 3.50, 14.50, 2026),
(1, 3, 10.00, 1.00, 9.00, 2026),
(2, 1, 12.00, 0.00, 12.00, 2026),
(2, 2, 18.00, 0.00, 18.00, 2026),
(2, 3, 10.00, 0.00, 10.00, 2026),
(2, 4, 5.00, 0.00, 5.00, 2026);

INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, working_hours, status)
VALUES
(1, CURDATE(), '2026-08-15 09:05:00', '2026-08-15 18:10:00', 9.08, 'PRESENT');

INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
(3, 'Leave approved', 'Your casual leave request has been approved.', 'LEAVE', 0),
(3, 'New company document', 'Annual policy update is now available.', 'DOCUMENT', 0),
(2, 'Team update', 'Please review the pending leave requests.', 'INFO', 0);

INSERT INTO documents (title, category, file_url, uploaded_by, visibility, is_active) VALUES
('Employee Handbook', 'Policy', '/uploads/employee-handbook.pdf', 1, 'ALL', 1),
('Travel Reimbursement Policy', 'Policy', '/uploads/travel-policy.pdf', 1, 'EMPLOYEE', 1),
('Holidays Calendar 2026', 'Calendar', '/uploads/holidays-2026.pdf', 1, 'ALL', 1);
