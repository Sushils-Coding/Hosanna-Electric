import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../components/Notification';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OFFICE_MANAGER', label: 'Office Manager' },
  { value: 'TECHNICIAN', label: 'Technician' },
];

export default function SignupPage() {
  const { register } = useAuth();
  const { showNotification } = useNotification();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'TECHNICIAN' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      showNotification('Please fill in all fields', false);
      return;
    }
    if (form.password.length < 6) {
      showNotification('Password must be at least 6 characters', false);
      return;
    }
    if (form.password !== form.confirmPassword) {
      showNotification('Passwords do not match', false);
      return;
    }
    setIsLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
    } catch (err) {
      showNotification(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed', false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Left Panel — Hero Image ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/login-signup.webp"
          alt="Hosanna Electric - City Skyline"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          <img
            src="/Hosanna-logo.webp"
            alt="Hosanna Electric Logo"
            className="w-72 mb-8 drop-shadow-2xl"
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 p-8">
          <div className="backdrop-blur-md bg-black/30 rounded-xl p-6">
            <p className="text-white text-xl font-medium tracking-wide">
              &quot;Design. Install. Commission. Test.&quot;
            </p>
            <p className="text-white font-bold text-lg mt-2">HOSANNA ELECTRIC</p>
            <p className="text-gray-300 text-sm">Powering the Future</p>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Signup Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-4 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo + heading */}
          <div className="mb-4">
            <img
              src="/Hosanna-logo.webp"
              alt="Hosanna Electric"
              className="h-12 mb-3"
            />
            <h1 className="text-3xl font-bold text-hosanna-black">
              Create an account
            </h1>
            <p className="text-hosanna-gray mt-2">
              Join Hosanna Electric&apos;s field service portal.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3" noValidate autoComplete="off" data-lpignore="true">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-hosanna-gray" />
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
                             text-hosanna-black placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-hosanna-gray" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
                             text-hosanna-black placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           text-hosanna-black bg-white
                           focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                           transition-all duration-200 cursor-pointer"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-hosanna-gray" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg text-sm
                             text-hosanna-black placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                             transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-hosanna-gray hover:text-hosanna-black transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-hosanna-black mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-hosanna-gray" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
                             text-hosanna-black placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-hosanna-red/30 focus:border-hosanna-red
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3
                         bg-hosanna-red text-white font-semibold rounded-lg
                         hover:bg-hosanna-red-dark active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         transition-all duration-200 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign up
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-hosanna-gray uppercase tracking-wider text-xs">
                or continue with
              </span>
            </div>
          </div>

          {/* Google button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300
                       rounded-lg hover:bg-gray-50 text-hosanna-black font-medium
                       transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          {/* Login link */}
          <p className="mt-3 text-center text-sm text-hosanna-gray">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-hosanna-red hover:text-hosanna-red-dark font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>

          {/* Footer links */}
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-hosanna-gray">
            <button type="button" className="hover:text-hosanna-black transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button type="button" className="hover:text-hosanna-black transition-colors cursor-pointer">
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
