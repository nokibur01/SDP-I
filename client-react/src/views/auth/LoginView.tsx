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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#090e0b] flex items-center justify-center px-4 py-10">
      {/* Background illustration — slightly scaled & softened so it reads as atmosphere, not pixels */}
      <img
        src={forestArt}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 blur-[1.5px] select-none pointer-events-none"
      />
      {/* Tone overlays: darken overall, deepen edges, keep centre calm behind the card */}
      <div className="absolute inset-0 bg-[#090e0b]/55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(9,14,11,0.55)_0%,rgba(9,14,11,0.2)_45%,rgba(9,14,11,0.85)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#090e0b] to-transparent" />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-[14px] bg-[#101713]/80 backdrop-blur-md border border-[#95b399]/25 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <GraduationCap className="w-6 h-6 text-[#95b399]" />
          </div>
          <span className="mt-3 text-[20px] font-bold text-[#d6ded8] tracking-tight drop-shadow">BatchHub</span>
        </div>

        <div className="bg-[#101713]/80 backdrop-blur-xl border border-[#95b399]/15 rounded-[22px] p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <div className="mb-6 text-center">
            <h1 className="text-[24px] font-bold text-[#d6ded8] tracking-tight">Welcome back</h1>
            <p className="text-[13.5px] text-[#a7b3aa] mt-1">Sign in to continue to your batch workspace.</p>
          </div>

          {statusMessage && (
            <div
              role={statusMessage.type === 'error' ? 'alert' : 'status'}
              className={`mb-5 p-3 rounded-[12px] text-[13px] flex items-start gap-2.5 border ${
                statusMessage.type === 'success'
                  ? 'bg-[#1f2c23] text-[#95b399] border-[#95b399]/25'
                  : 'bg-[#3b1c1c] text-[#d66767] border-[#d66767]/30'
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
                  className="hover:text-[#d6ded8] transition-colors focus:outline-none cursor-pointer"
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

          <div className="mt-6 pt-5 border-t border-[#1b261f] text-center text-[13px] text-[#78877d]">
            New to BatchHub?{' '}
            <Link to="/register" className="text-[#95b399] hover:text-[#839f87] font-medium hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        <p className="text-center text-[12px] text-[#a7b3aa]/80 mt-6 drop-shadow">
          Resources · Announcements · Projects · Peers · Deadlines
        </p>
      </div>
    </div>
  );
};
