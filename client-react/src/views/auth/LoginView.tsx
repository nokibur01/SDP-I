import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, AlertCircle, CheckCircle2, Mail, Lock } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';
import forestArt from '../../assets/login-forest.webp';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await authService.login({ email: email.trim(), password });
      setStatusMessage({
        type: 'success',
        text: res.message || 'Login successful! Redirecting to workspace...',
      });
      setAuth(res.token, res.user);

      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify and try again.';
      setStatusMessage({
        type: 'error',
        text: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="force-dark relative min-h-screen w-full overflow-hidden bg-canvas text-fg flex items-center justify-center px-4 py-10">
      {/* Background illustration (high resolution) */}
      <img
        src={forestArt}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
      />
      {/* Tone overlays: light overall dim, soft vignette, calmer centre behind the card */}
      <div className="absolute inset-0 bg-canvas/35" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(9,14,11,0.45)_0%,rgba(9,14,11,0.1)_50%,rgba(9,14,11,0.75)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas to-transparent" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Brand lockup */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-3 pl-2 pr-5 py-2 rounded-full bg-canvas/70 backdrop-blur-md border border-accent/20 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-accent-light to-accent-deep flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_18px_rgba(149,179,153,0.35)]">
              <GraduationCap className="w-5 h-5 text-on-accent" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col leading-none text-left">
              <span className="text-[19px] font-extrabold tracking-tight">
                <span className="text-fg">Batch</span>
                <span className="text-accent">Hub</span>
              </span>
              <span className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-muted">
                University cohort space
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl border border-accent/15 rounded-[22px] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <div className="mb-6 text-center">
            <h1 className="text-[24px] font-bold text-fg tracking-tight">Welcome back</h1>
            <p className="text-[13.5px] text-fg-2 mt-1">Sign in to continue to your batch workspace.</p>
          </div>

          {statusMessage && (
            <div
              role={statusMessage.type === 'error' ? 'alert' : 'status'}
              className={`mb-5 p-3 rounded-[12px] text-[13px] flex items-start gap-2.5 border ${
                statusMessage.type === 'success'
                  ? 'bg-accent-soft text-accent border-accent/25'
                  : 'bg-danger-soft text-danger border-danger/30'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="text-left">{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@university.edu"
              required
              autoComplete="email"
              autoFocus
              leftElement={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              leftElement={<Lock className="w-4 h-4" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-fg transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={!email || !password}
              className="w-full mt-2 py-3 text-[14px]"
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-line text-center text-[13px] text-muted">
            New to BatchHub?{' '}
            <Link to="/register" className="text-accent hover:text-accent-hover font-medium hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        <p className="text-center text-[13px] text-fg-2/80 mt-6 drop-shadow">
          Resources · Announcements · Projects · Peers · Deadlines
        </p>
      </div>
    </div>
  );
};
