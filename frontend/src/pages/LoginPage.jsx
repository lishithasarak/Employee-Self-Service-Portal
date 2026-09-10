import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  // SHOW / HIDE PASSWORD
  const [showPassword, setShowPassword] = useState(false);

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
  // HANDLE LOGIN
  // =========================
  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSubmitting(true);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL ||
        'http://localhost:5000/api';

      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
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
          data.message || 'Login failed'
        );
      }

      // STORE LOGIN DATA
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      localStorage.setItem(
        'userName',
        data.user.name || 'Employee'
      );

      // ROLE-BASED NAVIGATION
      if (data.user.role === 'ADMIN') {
        navigate('/admin');
      } else if (data.user.role === 'MANAGER') {
        navigate('/manager');
      } else {
        navigate('/employee');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card card">

        {/* HEADER */}
        <div className="auth-header">
          <div className="brand-mark">S</div>

          <h1>Smart ESS Portal</h1>

          <p>Employee Self-Service Platform</p>
        </div>

        {/* LOGIN FORM */}
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
            />
          </label>

          {/* PASSWORD */}
          <label>
            <span>Password</span>

            <div
              style={{
                position: 'relative',
              }}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
                style={{
                  width: '100%',
                  paddingRight: '48px',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((prev) => !prev)
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                title={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#2f5bea',
                }}
              >
                {showPassword ? (
                  <EyeOff size={20} strokeWidth={2} />
                ) : (
                  <Eye size={20} strokeWidth={2} />
                )}
              </button>
            </div>
          </label>

          {/* FORGOT PASSWORD */}
          <div
            style={{
              textAlign: 'right',
              marginTop: '-0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            <Link
              to="/reset-password"
              style={{
                color: '#2f5bea',
                fontWeight: '600',
                textDecoration: 'none',
                fontSize: '0.9rem',
              }}
            >
              Forgot Password?
            </Link>
          </div>

          {/* ERROR MESSAGE */}
          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            className="primary-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Signing in...'
              : 'Login'}
          </button>

        </form>

        {/* CREATE ACCOUNT */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
          }}
        >
          <span
            style={{
              color: 'var(--muted)',
            }}
          >
            Don't have an account?{' '}
          </span>

          <button
            type="button"
            onClick={() => navigate('/register')}
            style={{
              background: 'none',
              border: 'none',
              color: '#2f5bea',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Create Account
          </button>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;