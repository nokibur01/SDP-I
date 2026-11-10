import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  BookOpen,
  Megaphone,
  Users,
  CalendarClock,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/useAuthStore';
import forestArt from '../../assets/login-forest.webp';

const HIGHLIGHTS = [
  { icon: BookOpen, label: 'Shared resources' },
  { icon: Megaphone, label: 'Batch announcements' },
  { icon: Users, label: 'Peer directory' },
  { icon: CalendarClock, label: 'Deadline tracking' },
];

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
    <div className="min-h-screen w-full bg-[#090e0b] flex flex-col lg:flex-row">
      {/* Illustration panel */}
      <aside className="relative h-56 sm:h-72 lg:h-auto lg:flex-[1.25] overflow-hidden">
        <img
          src={forestArt}
          alt="Students gathering in a connected forest representing resources, announcements, projects, peers and deadlines"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Tone the art into the page and keep text legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090e0b]/40 via-transparent to-[#090e0b] lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#090e0b]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#090e0b]/95 to-transparent hidden lg:block" />

        {/* Brand */}
        <div className="absolute top-5 left-5 sm:top-7 sm:left-8 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-[#090e0b]/70 backdrop-blur-sm border border-[#95b399]/25 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[#95b399]" />
          </div>
          <span className="text-[18px] font-bold text-[#d6ded8] tracking-tight drop-shadow">BatchHub</span>
        </div>

        {/* Tagline (desktop) */}
        <div className="absolute bottom-10 left-10 right-16 hidden lg:block max-w-[520px]">
          <h1 className="text-[32px] xl:text-[36px] font-bold text-[#d6ded8] leading-[1.15] tracking-tight">
            Where your whole batch
            <br />
            grows together.
          </h1>
          <p className="text-[14.5px] text-[#a7b3aa] mt-3 leading-relaxed">
            Notes, notices, projects and deadlines — rooted in one place for every student in your cohort.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101713]/80 backdrop-blur-sm border border-[#1b261f] text-[12px] text-[#a7b3aa]"
              >
                <Icon className="w-3.5 h-3.5 text-[#95b399]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 lg:py-12 -mt-10 lg:mt-0 relative z-10">
        <div className="w-full max-w-[400px]">
          <div className="bg-[#101713] lg:bg-transparent border border-[#1b261f] lg:border-0 rounded-[20px] p-6 sm:p-8 lg:p-0 shadow-[0_20px_50px_rgba(0,0,0,0.5)] lg:shadow-none">
            <div className="mb-7">
              <h2 className="text-[26px] font-bold text-[#d6ded8] tracking-tight">Welcome back</h2>
              <p className="text-[13.5px] text-[#78877d] mt-1">Sign in to continue to your batch workspace.</p>
            </div>

            {/* Status / Alert Notification */}
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
                <span>{statusMessage.text}</span>
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

            <div className="mt-7 pt-5 border-t border-[#1b261f] text-center text-[13px] text-[#78877d]">
              New to BatchHub?{' '}
              <Link to="/register" className="text-[#95b399] hover:text-[#839f87] font-medium hover:underline">
                Create an account
              </Link>
            </div>
          </div>

          <p className="text-center text-[11.5px] text-[#56635a] mt-6">
            For students, CRs and administrators of your university batch.
          </p>
        </div>
      </main>
    </div>
  );
};
