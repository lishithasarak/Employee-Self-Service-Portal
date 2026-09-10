const payslips = [
  {
    id: 1,
    employee_id: 1,
    month: 'August',
    year: 2026,
    gross_salary: 85000,
    deductions: 12500,
    net_salary: 72500,
    download_url: '/downloads/payslip-aug-2026.pdf',
    status: 'PUBLISHED',
  },
  {
    id: 2,
    employee_id: 1,
    month: 'July',
    year: 2026,
    gross_salary: 85000,
    deductions: 11750,
    net_salary: 73250,
    download_url: '/downloads/payslip-jul-2026.pdf',
    status: 'PUBLISHED',
  },
];

const documents = [
  {
    id: 1,
    title: 'Employee Handbook',
    category: 'Policy',
    file_url: '/uploads/employee-handbook.pdf',
    visibility: 'ALL',
  },
  {
    id: 2,
    title: 'Travel Reimbursement Policy',
    category: 'Finance',
    file_url: '/uploads/travel-policy.pdf',
    visibility: 'EMPLOYEE',
  },
  {
    id: 3,
    title: 'Holiday Calendar 2026',
    category: 'Schedule',
    file_url: '/uploads/holiday-calendar.pdf',
    visibility: 'ALL',
  },
];

const tickets = [
  {
    id: 1,
    employee_id: 1,
    category: 'Payroll',
    subject: 'Payslip discrepancy',
    priority: 'MEDIUM',
    status: 'OPEN',
    created_at: '2026-08-12T10:00:00Z',
    description: 'I want to verify the deduction line item in my August payslip.',
  },
  {
    id: 2,
    employee_id: 1,
    category: 'IT Support',
    subject: 'Laptop access issue',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    created_at: '2026-08-08T08:30:00Z',
    description: 'Need access to internal ticketing portal after device migration.',
  },
];

module.exports = { payslips, documents, tickets };
