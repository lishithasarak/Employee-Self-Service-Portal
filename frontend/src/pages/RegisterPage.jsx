import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:5000/api';

      const response = await fetch(
        `${API_BASE_URL}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Account creation failed.'
        );
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem(
        'userName',
        data.user.name || 'Employee'
      );

      setSuccess(
        `Account created successfully! Employee ID: ${data.user.employee_code}`
      );

      setTimeout(() => {
        navigate('/employee');
      }, 1200);

    } catch (err) {
      setError(
        err.message || 'Unable to create account.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div
        className="auth-card card"
        style={{ maxWidth: '520px' }}
      >
        <div className="auth-header">
          <div className="brand-mark">S</div>

          <h1>Create Employee Account</h1>

          <p>
            Join Smart ESS and manage your employee services
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <label>
            <span>Full Name</span>

            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </label>

          <label>
            <span>Email</span>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              required
            />
          </label>

          <label>
            <span>Phone Number</span>

            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
            />
          </label>

          <label>
            <span>Password</span>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </label>

          <label>
            <span>Confirm Password</span>

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              minLength={8}
              required
            />
          </label>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {success && (
            <div className="success-box">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="primary-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Creating Account...'
              : 'Create Account'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
          }}
        >
          <span style={{ color: 'var(--muted)' }}>
            Already have an account?{' '}
          </span>

          <Link
            to="/login"
            style={{
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Login
          </Link>
        </div>

        <p
          style={{
            marginTop: '1.25rem',
            fontSize: '0.8rem',
            color: 'var(--muted)',
            textAlign: 'center',
          }}
        >
          New registrations are created as Employee
          accounts. Manager and Admin accounts are
          managed by the organization.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;