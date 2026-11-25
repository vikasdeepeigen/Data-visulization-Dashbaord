import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.message);
      return;
    }

    if (result.user.role === 'Admin') {
      navigate('/software-list', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-blue-900 text-white font-bold text-base mb-3">
            AV
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            AV Data Visualization Platform
          </h1>
          <p className="text-sm text-slate-600 mt-1">Sign in to continue to your workspace</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">
            Account Login
          </h2>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2.5 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 mt-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-900 hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="font-semibold text-slate-800">Default Accounts:</div>
          <div className="flex justify-between font-mono text-[11px]">
            <span>Admin: admin@dataviz.com</span>
            <span>AdminPassword123!</span>
          </div>
          <div className="flex justify-between font-mono text-[11px]">
            <span>User: user@dataviz.com</span>
            <span>UserPassword123!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
