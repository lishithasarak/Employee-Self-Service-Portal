import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ResetPasswordPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  // =========================
  // HANDLE INPUT CHANGE
  // =========================
  const handleChange = (event) => {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  // =========================
  // HANDLE PASSWORD RESET
  // =========================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    // Email validation
    if (!form.email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Password validation
    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    // Confirm password validation
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:5000/api';

      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            confirmPassword: form.confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to reset password.'
        );
      }

      setSuccess(
        'Password reset successfully! Redirecting to login...'
      );

      // Clear form
      setForm({
        email: '',
        password: '',
        confirmPassword: '',
      });

      // Redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 1500);

    } catch (err) {
      setError(
        err.message || 'Unable to reset password.'
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

        {/* HEADER */}
        <div className="auth-header">
          <div className="brand-mark">S</div>

          <h1>Reset Password</h1>

          <p>
            Enter your email and new password below
          </p>
        </div>

        {/* RESET PASSWORD FORM */}
        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          {/* EMAIL */}
          <label>
            <span>Email</span>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@company.com"
              required
              disabled={isSubmitting}
            />
          </label>

          {/* NEW PASSWORD */}
          <label>
            <span>New Password</span>

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
              disabled={isSubmitting}
            />
          </label>

          {/* CONFIRM PASSWORD */}
          <label>
            <span>Confirm New Password</span>

            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your new password"
              minLength={8}
              required
              disabled={isSubmitting}
            />
          </label>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {/* SUCCESS MESSAGE */}
          {success && (
            <div className="success-box">
              {success}
            </div>
          )}

          {/* RESET BUTTON */}
          <button
            type="submit"
            className="primary-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Resetting Password...'
              : 'Reset Password'}
          </button>

        </form>

        {/* BACK TO LOGIN */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
          }}
        >
          <span style={{ color: 'var(--muted)' }}>
            Remember your password?{' '}
          </span>

          <Link
            to="/login"
            style={{
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ResetPasswordPage;
