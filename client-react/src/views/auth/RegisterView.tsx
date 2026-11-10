import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';

export const RegisterView: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    student_id: '',
    batch: '',
    department: 'CSE',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password, student_id, batch, department } = formData;

    if (!name || !email || !password || !student_id || !batch || !department) {
      setStatusMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const res = await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
        student_id: student_id.trim(),
        batch: batch.trim(),
        department: department.trim(),
      });

      setStatusMessage({
        type: 'success',
        text: res.message || 'Registration successful! Redirecting to sign in...',
      });

      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setStatusMessage({
        type: 'error',
        text: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-canvas flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[500px] bg-surface border border-line rounded-[20px] p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center text-center gap-1.5 mb-6">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-accent" />
            <h2 className="text-[23px] font-bold text-fg tracking-tight">Create BatchHub Account</h2>
          </div>
          <p className="text-[13px] text-fg-2">
            Connect with batchmates and collaborate academically
          </p>
        </div>

        {/* Status / Alert Notification */}
        {statusMessage && (
          <div
            className={`mb-5 p-3 rounded-[10px] text-[13px] flex items-start gap-2.5 border ${
              statusMessage.type === 'success'
                ? 'bg-accent/10 text-accent border-accent/25'
                : 'bg-danger/10 text-danger border-danger/30'
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

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Full Name *"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Tripto Khan"
            required
          />

          <Input
            label="Email Address *"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="student@university.edu"
            required
            autoComplete="email"
          />

          <Input
            label="Password *"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            autoComplete="new-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-fg transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Student ID *"
              name="student_id"
              type="text"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="e.g. 2155198"
              required
            />

            <Input
              label="Year *"
              name="batch"
              type="text"
              value={formData.batch}
              onChange={handleChange}
              placeholder="e.g. 3rd Year"
              required
            />
          </div>

          <Input
            label="Department *"
            name="department"
            type="text"
            value={formData.department}
            onChange={handleChange}
            placeholder="e.g. CSE"
            required
          />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            className="w-full mt-2 py-3 text-[14px]"
          >
            Create Account
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 text-center text-[13px] text-muted border-t border-raised pt-5">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-accent hover:underline font-medium hover:text-accent-hover"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

