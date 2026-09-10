import { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage('');
    setResetUrl('');
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setSubmitting(true);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:5000/api';

      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || 'Unable to process password reset request.'
        );
      }

      setMessage(data.message || 'Password reset request processed.');

      // Development-only reset link.
      // The backend does not expose this in production.
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err) {
      setError(
        err.message || 'Unable to process password reset request.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div
        className="auth-card card"
        style={{ maxWidth: '500px' }}
      >
        <div className="auth-header">
          <div className="brand-mark">S</div>

          <h1>Forgot Password?</h1>

          <p>
            Enter your registered email address to reset
            your Smart ESS password.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          <label>
            <span>Email</span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@company.com"
              required
            />
          </label>

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {message && (
            <div className="success-box">
              {message}
            </div>
          )}

          {resetUrl && (
            <div
              className="card panel"
              style={{
                marginTop: '1rem',
                padding: '1rem',
              }}
            >
              <strong>Development Reset Link</strong>

              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--muted)',
                  margin: '0.5rem 0',
                }}
              >
                Email delivery is not configured yet.
                Use this link for local testing.
              </p>

              <a
                href={resetUrl}
                style={{
                  wordBreak: 'break-all',
                  fontSize: '0.85rem',
                }}
              >
                {resetUrl}
              </a>
            </div>
          )}

          <button
            type="submit"
            className="primary-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Processing...'
              : 'Send Reset Link'}
          </button>
        </form>

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

export default ForgotPasswordPage;