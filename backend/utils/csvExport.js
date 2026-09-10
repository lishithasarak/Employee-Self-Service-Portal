/**
 * CSV Export Utility
 * Converts JSON data to CSV format with proper escaping and headers
 */

const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // Escape quotes and wrap in quotes if contains special characters
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

const jsonToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Build header row
  const headerRow = headers.map(h => escapeCSV(h.label)).join(',');

  // Build data rows
  const dataRows = data.map(row => {
    return headers.map(h => {
      const value = h.key.split('.').reduce((obj, key) => obj?.[key], row);
      return escapeCSV(value);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

const generateAttendanceCSV = (records) => {
  const headers = [
    { key: 'employee_name', label: 'Employee Name' },
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'attendance_date', label: 'Date' },
    { key: 'check_in', label: 'Check In' },
    { key: 'check_out', label: 'Check Out' },
    { key: 'working_hours', label: 'Working Hours' },
    { key: 'status', label: 'Status' },
  ];

  return jsonToCSV(records, headers);
};

const generateLeaveRequestsCSV = (records) => {
  const headers = [
    { key: 'employee_name', label: 'Employee Name' },
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'leave_type', label: 'Leave Type' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'total_days', label: 'Total Days' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Requested On' },
  ];

  return jsonToCSV(records, headers);
};

const generatePayrollCSV = (records) => {
  const headers = [
    { key: 'employee_name', label: 'Employee Name' },
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'department', label: 'Department' },
    { key: 'gross_salary', label: 'Gross Salary' },
    { key: 'basic_pay', label: 'Basic Pay' },
    { key: 'allowances', label: 'Allowances' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'net_salary', label: 'Net Salary' },
    { key: 'payment_date', label: 'Payment Date' },
    { key: 'status', label: 'Status' },
  ];

  return jsonToCSV(records, headers);
};

const generateReimbursementCSV = (records) => {
  const headers = [
    { key: 'employee_name', label: 'Employee Name' },
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'expense_date', label: 'Expense Date' },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Submitted On' },
  ];

  return jsonToCSV(records, headers);
};

const generateEmployeeCSV = (records) => {
  const headers = [
    { key: 'name', label: 'Name' },
    { key: 'employee_code', label: 'Employee Code' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'date_of_joining', label: 'Joining Date' },
    { key: 'status', label: 'Status' },
  ];

  return jsonToCSV(records, headers);
};

module.exports = {
  jsonToCSV,
  generateAttendanceCSV,
  generateLeaveRequestsCSV,
  generatePayrollCSV,
  generateReimbursementCSV,
  generateEmployeeCSV,
};
