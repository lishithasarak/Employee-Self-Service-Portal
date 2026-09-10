import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../utils/api';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  designation: '',
  department_id: '',
  manager_id: '',
  role: 'EMPLOYEE',
  joining_date: '',
  phone: ''
};

const AdminEmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load employees, departments and managers
  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const [data, meta] = await Promise.all([
        apiGet('/employees'),
        apiGet('/employees/meta')
      ]);

      setEmployees(data.employees || []);
      setDepartments(meta.departments || []);
      setManagers(meta.managers || []);
    } catch (e) {
      setError(
        e.message || 'Failed to load employees.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const searchTerm = search.trim().toLowerCase();

  const filteredEmployees = employees
    .filter((employee) => {
      const matchesStatus = filter === 'ALL' || employee.status === filter;
      if (!matchesStatus) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const searchTarget = [
        employee.name,
        employee.email,
        employee.employee_code,
        employee.department,
        employee.designation,
        employee.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchTarget.includes(searchTerm);
    })
    .sort((a, b) => {
      const valueA = a[sortKey] ?? '';
      const valueB = b[sortKey] ?? '';

      const comparator =
        typeof valueA === 'string' && typeof valueB === 'string'
          ? valueA.localeCompare(valueB, undefined, { sensitivity: 'base' })
          : Number(valueA || 0) - Number(valueB || 0);

      return sortDirection === 'asc' ? comparator : -comparator;
    });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, pageSize]);

  const visibleEmployees = filteredEmployees.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Show success message
  const showSuccessMessage = (message) => {
    setSuccess(message);

    setTimeout(() => {
      setSuccess('');
    }, 4000);
  };

  // Reset form
  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingEmployee(null);
  };

  // Open Add Employee form
  const openAddForm = () => {
    resetForm();
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  // Open Edit Employee form
  const startEdit = (employee) => {
    setEditingEmployee(employee);

    setForm({
      name: employee.name || '',
      email: employee.email || '',
      password: '',

      designation:
        employee.designation || '',

      department_id:
        employee.department_id !== null &&
        employee.department_id !== undefined
          ? String(employee.department_id)
          : '',

      manager_id:
        employee.manager_id !== null &&
        employee.manager_id !== undefined
          ? String(employee.manager_id)
          : '',

      role: employee.role || 'EMPLOYEE',

      joining_date: employee.joining_date
        ? String(employee.joining_date).slice(0, 10)
        : '',

      phone: employee.phone || ''
    });

    setError('');
    setSuccess('');
    setShowForm(true);
  };

  // Close form
  const closeForm = () => {
    setShowForm(false);
    resetForm();
    setError('');
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // Activate / deactivate employee
  const change = async (id, status) => {
    try {
      setError('');
      setSuccess('');

      const data = await apiPut(
        `/employees/${id}/status`,
        {
          status
        }
      );

      await load();

      showSuccessMessage(
        data.message ||
          `Employee ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`
      );
    } catch (e) {
      setError(
        e.message ||
          'Failed to update employee status.'
      );
    }
  };

  // Create employee
  const createEmployee = async () => {
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      designation: form.designation.trim(),
      department_id:
        Number(form.department_id) || null,
      manager_id:
        Number(form.manager_id) || null,
      role: form.role,
      joining_date: form.joining_date,
      phone: form.phone.trim()
    };

    const data = await apiPost(
      '/employees',
      payload
    );

    setShowForm(false);
    resetForm();

    await load();

    showSuccessMessage(
      data.message ||
        'Employee created successfully.'
    );
  };

  // Update employee
  const updateEmployee = async () => {
    if (!editingEmployee) {
      return;
    }

    const payload = {
      designation:
        form.designation.trim(),

      department_id:
        Number(form.department_id) || null,

      manager_id:
        Number(form.manager_id) || null,

      joining_date:
        form.joining_date || null,

      phone:
        form.phone.trim(),

      role:
        form.role
    };

    const data = await apiPut(
      `/employees/${editingEmployee.id}`,
      payload
    );

    setShowForm(false);
    resetForm();

    await load();

    showSuccessMessage(
      data.message ||
        'Employee updated successfully.'
    );
  };

  // Submit Add/Edit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Prevent self-manager assignment
      if (
        editingEmployee &&
        form.manager_id &&
        Number(form.manager_id) ===
          Number(editingEmployee.id)
      ) {
        setError(
          'An employee cannot be assigned as their own manager.'
        );
        return;
      }

      if (editingEmployee) {
        await updateEmployee();
      } else {
        await createEmployee();
      }
    } catch (e) {
      setError(
        e.message ||
          'Failed to save employee.'
      );
    } finally {
      setSaving(false);
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
        Loading employees...
      </div>
    );
  }

  return (
    <div className="page-section">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <p className="eyebrow">
            Employee Management
          </p>

          <h2>
            Manage All Employees
          </h2>
        </div>

        <button
          className="primary-btn"
          onClick={
            showForm
              ? closeForm
              : openAddForm
          }
        >
          {showForm
            ? 'Cancel'
            : 'Add Employee'}
        </button>
      </div>

      {/* SUCCESS MESSAGE */}
      {success && (
        <div
          className="card panel success-box"
          style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <span>
            {success}
          </span>

          <button
            type="button"
            className="secondary-btn small"
            onClick={() => setSuccess('')}
          >
            Close
          </button>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div
          className="card panel error-box"
          style={{
            marginBottom: '1rem'
          }}
        >
          {error}
        </div>
      )}

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div className="card panel">

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}
          >
            <div>
              <p className="eyebrow">
                {editingEmployee
                  ? 'Employee Update'
                  : 'Employee Management'}
              </p>

              <h3>
                {editingEmployee
                  ? `Edit ${editingEmployee.name}`
                  : 'Add New Employee'}
              </h3>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'grid',
              gap: '.75rem'
            }}
          >

            {/* NAME */}
            <input
              required
              name="name"
              placeholder="Name"
              value={form.name}
              disabled={Boolean(editingEmployee)}
              onChange={handleChange}
            />

            {/* EMAIL */}
            <input
              required
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              disabled={Boolean(editingEmployee)}
              onChange={handleChange}
            />

            {/* PASSWORD */}
            {!editingEmployee && (
              <input
                required
                minLength="8"
                type="password"
                name="password"
                placeholder="Initial password"
                value={form.password}
                onChange={handleChange}
              />
            )}

            {/* DESIGNATION */}
            <input
              required
              name="designation"
              placeholder="Designation"
              value={form.designation}
              onChange={handleChange}
            />

            {/* JOINING DATE */}
            <input
              required
              type="date"
              name="joining_date"
              value={form.joining_date}
              onChange={handleChange}
            />

            {/* PHONE */}
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange}
            />

            {/* DEPARTMENT */}
            <select
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
            >
              <option value="">
                No department
              </option>

              {departments.map(
                (department) => (
                  <option
                    value={department.id}
                    key={department.id}
                  >
                    {department.name}
                  </option>
                )
              )}
            </select>

            {/* MANAGER */}
            <select
              name="manager_id"
              value={form.manager_id}
              onChange={handleChange}
            >
              <option value="">
                No manager
              </option>

              {managers
                .filter(
                  (manager) =>
                    !editingEmployee ||
                    Number(manager.id) !==
                      Number(editingEmployee.id)
                )
                .map((manager) => (
                  <option
                    value={manager.id}
                    key={manager.id}
                  >
                    {manager.name}
                  </option>
                ))}
            </select>

            {/* ROLE */}
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              {[
                'EMPLOYEE',
                'MANAGER',
                'ADMIN'
              ].map((role) => (
                <option
                  key={role}
                  value={role}
                >
                  {role}
                </option>
              ))}
            </select>

            {/* FORM ACTIONS */}
            <div
              style={{
                display: 'flex',
                gap: '.5rem',
                flexWrap: 'wrap',
                marginTop: '.5rem'
              }}
            >
              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingEmployee
                    ? 'Update Employee'
                    : 'Create Employee'}
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      )}

      {/* FILTERS */}
      <div className="card panel">
        <div
          style={{
            display: 'flex',
            gap: '.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '.75rem'
          }}
        >
          <input
            type="search"
            placeholder="Search employees"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ minWidth: '220px', flex: '1 1 220px' }}
          />

          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value)}
            style={{ minWidth: '170px' }}
          >
            <option value="name">Sort by Name</option>
            <option value="employee_code">Sort by Employee ID</option>
            <option value="department">Sort by Department</option>
            <option value="status">Sort by Status</option>
            <option value="joining_date">Sort by Joining Date</option>
          </select>

          <button
            type="button"
            className="secondary-btn small"
            onClick={() =>
              setSortDirection((previous) =>
                previous === 'asc' ? 'desc' : 'asc'
              )
            }
          >
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </button>

          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            style={{ minWidth: '120px' }}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '.5rem',
            flexWrap: 'wrap'
          }}
        >
          {[
            'ALL',
            'ACTIVE',
            'INACTIVE',
            'ON_LEAVE'
          ].map((status) => (
            <button
              key={status}
              onClick={() =>
                setFilter(status)
              }
              className={
                filter === status
                  ? 'primary-btn small'
                  : 'secondary-btn small'
              }
            >
              {status}
            </button>
          ))}
        </div>

      </div>

      {/* EMPLOYEE TABLE */}
      <div className="card panel">

        <h3>
          Employees ({filteredEmployees.length})
        </h3>

        <div
          style={{
            overflowX: 'auto'
          }}
        >
          <table className="data-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {visibleEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      textAlign: 'center',
                      padding: '2rem'
                    }}
                  >
                    No employees found.
                  </td>
                </tr>
              ) : (
                visibleEmployees.map(
                  (employee) => (
                    <tr
                      key={employee.id}
                    >

                      <td>
                        {employee.employee_code}
                      </td>

                      <td>
                        {employee.name}
                      </td>

                      <td>
                        {employee.email}
                      </td>

                      <td>
                        {employee.department ||
                          '--'}
                      </td>

                      <td>
                        {employee.designation ||
                          '--'}
                      </td>

                      <td>
                        {employee.joining_date ||
                          '--'}
                      </td>

                      <td>
                        {employee.status}
                      </td>

                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: '.4rem',
                            flexWrap: 'wrap'
                          }}
                        >

                          {/* EDIT */}
                          <button
                            className="primary-btn small"
                            onClick={() =>
                              startEdit(
                                employee
                              )
                            }
                          >
                            Edit
                          </button>

                          {/* ACTIVATE / DEACTIVATE */}
                          {employee.status ===
                          'INACTIVE' ? (
                            <button
                              className="secondary-btn small"
                              onClick={() =>
                                change(
                                  employee.id,
                                  'ACTIVE'
                                )
                              }
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              className="secondary-btn small"
                              onClick={() =>
                                change(
                                  employee.id,
                                  'INACTIVE'
                                )
                              }
                            >
                              Deactivate
                            </button>
                          )}

                        </div>
                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>
        </div>
      </div>

      {filteredEmployees.length > 0 && (
        <div className="card panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span>
            Showing {Math.min((safePage - 1) * pageSize + 1, filteredEmployees.length)}-{Math.min(safePage * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
          </span>

          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="secondary-btn small"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            >
              Prev
            </button>
            <span>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="secondary-btn small"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEmployeesPage;