import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';

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
    <div className="min-h-screen w-full bg-[#090e0b] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[420px] bg-[#101713] border border-[#1b261f] rounded-[20px] p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center text-center gap-1.5 mb-7">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-[#95b399]" />
            <h2 className="text-[24px] font-bold text-[#d6ded8] tracking-tight">BatchHub</h2>
          </div>
          <p className="text-[13px] text-[#a7b3aa]">
            Sign in to access your university academic batch portal
          </p>
        </div>

        {/* Status / Alert Notification */}
        {statusMessage && (
          <div
            className={`mb-5 p-3 rounded-[10px] text-[13px] flex items-start gap-2.5 border ${
              statusMessage.type === 'success'
                ? 'bg-[#95b399]/10 text-[#95b399] border-[#95b399]/25'
                : 'bg-[#d66767]/10 text-[#d66767] border-[#d66767]/30'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email Address *"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@university.edu"
            required
            autoComplete="email"
          />

          <Input
            label="Password *"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-[#d6ded8] transition-colors focus:outline-none"
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
            className="w-full mt-2 py-3 text-[14px]"
          >
            Sign In
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 text-center text-[13px] text-[#78877d] border-t border-[#16201a] pt-5">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-[#95b399] hover:underline font-medium hover:text-[#839f87]"
          >
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

