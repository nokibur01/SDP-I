import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  User as UserIcon,
  KeyRound,
  Save,
  Camera,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import type { UserRole } from '../../types/auth';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  student_id?: string;
  batch?: string;
  department?: string;
  role: UserRole;
  profile_picture?: string;
  skills?: string;
  gender?: string;
  created_at?: string;
}

export const ProfileView: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { success, error } = useToast();

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    student_id: '',
    batch: '',
    department: '',
    gender: '',
    skills: '',
    profile_picture: '',
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Query Profile
  const { data: profileRes } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => apiClient.get<{ success: boolean; user: ProfileData }>('/users/profile'),
  });

  useEffect(() => {
    if (profileRes?.user) {
      const u = profileRes.user;
      setProfileForm({
        name: u.name || '',
        student_id: u.student_id || '',
        batch: u.batch || '',
        department: u.department || '',
        gender: u.gender || '',
        skills: u.skills || '',
        profile_picture: u.profile_picture || '',
      });
    }
  }, [profileRes]);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: typeof profileForm) => {
      return apiClient.put<{ success: boolean; user: ProfileData; message?: string }>(
        '/users/profile',
        payload
      );
    },
    onSuccess: (res) => {
      if (res.user) {
        updateUser(res.user);
      }
      success('Profile credentials updated successfully!');
    },
    onError: (err: Error) => error(err.message || 'Failed to update profile'),
  });

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      return apiClient.put<{ success: boolean; message?: string }>(
        '/users/change-password',
        payload
      );
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      success('Password changed successfully!');
    },
    onError: (err: Error) => error(err.message || 'Failed to update password'),
  });

  // Handle Avatar image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      error('Image size must be under 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      error('Please choose an image file');
      return;
    }

    // Downscale to a 256px square thumbnail so avatars stay small (~20-40 KB) in the database
    // and in every member list response.
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const SIZE = 256;
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        error('Could not process this image');
        return;
      }
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL('image/webp', 0.85);
      setProfileForm((prev) => ({
        ...prev,
        // Older browsers without WebP encoding fall back to PNG; use JPEG to keep it small
        profile_picture: dataUrl.startsWith('data:image/webp') ? dataUrl : canvas.toDataURL('image/jpeg', 0.85),
      }));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      error('Could not read this image');
    };
    img.src = objectUrl;
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      error('Name is required');
      return;
    }
    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      error('Current password is required');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      error('New password must be at least 6 characters long');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      error('New passwords do not match');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <AppLayout title="My Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] uppercase font-bold tracking-wider text-[#95b399]">
              Identity & Security
            </span>
            <span className="text-[#1b261f]">•</span>
            <span className="text-[12px] text-[#a7b3aa]">Academic Credentials</span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-[#d6ded8] tracking-tight mt-0.5">
            Account Settings & Profile
          </h1>
          <p className="text-[13.5px] text-[#a7b3aa] mt-0.5">
            Manage your personal academic identity, department affiliations, technical skill tags, and passwords.
          </p>
        </div>

        {/* 1. Main Profile Card */}
        <div className="bg-[#101713] border border-[#1b261f] rounded-[20px] p-6 sm:p-8 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#1b261f]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-[#0c120e] border border-[#1b261f] flex items-center justify-center text-[#95b399]">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-[#d6ded8] tracking-tight">Personal & Academic Profile</h2>
                <p className="text-[12.5px] text-[#a7b3aa]">Information visible across cohort directories.</p>
              </div>
            </div>

            <Badge
              variant={user?.role === 'admin' ? 'danger' : user?.role === 'cr' ? 'warning' : 'mint'}
            >
              {user?.role?.toUpperCase()}
            </Badge>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-[#1b261f]/60">
              <div className="relative group shrink-0">
                {profileForm.profile_picture ? (
                  <img
                    src={profileForm.profile_picture}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#95b399]/40"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#0c120e] border-2 border-[#1b261f] flex items-center justify-center text-[26px] font-bold text-[#95b399]">
                    {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <label
                  htmlFor="avatarInput"
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#95b399] text-[#090e0b] shadow-md hover:bg-[#839f87] transition-colors cursor-pointer"
                  title="Upload new photo"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </label>
                <input
                  id="avatarInput"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-[14px] font-semibold text-[#d6ded8]">Profile Picture</span>
                <span className="text-[12.5px] text-[#a7b3aa] mt-0.5">
                  PNG, JPG, or GIF up to 5MB. Click camera icon to replace.
                </span>
              </div>
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name *"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />

              <div>
                <label className="text-[13px] font-medium text-[#d6ded8] block mb-1.5">
                  Email Address (Read-only)
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-[#0c120e]/50 border border-[#1b261f] rounded-[10px] p-2.5 text-[13px] text-[#78877d] cursor-not-allowed"
                />
              </div>

              <Input
                label="Student ID *"
                placeholder="e.g., 2155198"
                value={profileForm.student_id}
                onChange={(e) => setProfileForm({ ...profileForm, student_id: e.target.value })}
                required
              />

              <Input
                label="Batch / Cohort Year *"
                placeholder="e.g., 2024"
                value={profileForm.batch}
                onChange={(e) => setProfileForm({ ...profileForm, batch: e.target.value })}
                required
              />

              <Input
                label="Academic Department *"
                placeholder="e.g., Computer Science & Engineering"
                value={profileForm.department}
                onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                required
              />

              <Select
                label="Gender"
                options={[
                  { value: '', label: 'Prefer not to say' },
                  { value: 'Male', label: 'Male' },
                  { value: 'Female', label: 'Female' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={profileForm.gender}
                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
              />
            </div>

            <div>
              <Input
                label="Technical Skills (Comma separated)"
                placeholder="e.g., React, TypeScript, Node.js, Python, MySQL, Git"
                value={profileForm.skills}
                onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
              />
              <span className="text-[12px] text-[#78877d] mt-1 block">
                These tags will appear on your card in the student directory and assist peers in recruiting you.
              </span>
            </div>

            <div className="flex justify-end pt-3">
              <Button
                variant="primary"
                size="md"
                type="submit"
                leftIcon={<Save className="w-4 h-4" />}
                isLoading={updateProfileMutation.isPending}
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>

        {/* 2. Security & Password Update Card */}
        <div className="bg-[#101713] border border-[#1b261f] rounded-[20px] p-6 sm:p-8 shadow-[0_12px_32px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-3 pb-6 mb-6 border-b border-[#1b261f]/60">
            <div className="w-10 h-10 rounded-[12px] bg-[#0c120e] border border-[#1b261f] flex items-center justify-center text-[#d6b867]">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-[#d6ded8] tracking-tight">Security & Password</h2>
              <p className="text-[12.5px] text-[#a7b3aa]">Ensure your account uses a strong, secure passphrase.</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Current Password *"
              type="password"
              placeholder="••••••••"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password *"
                type="password"
                placeholder="Minimum 6 characters"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                required
              />

              <Input
                label="Confirm New Password *"
                type="password"
                placeholder="••••••••"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                required
              />
            </div>

            <div className="flex justify-end pt-3">
              <Button
                variant="secondary"
                size="md"
                type="submit"
                leftIcon={<KeyRound className="w-4 h-4" />}
                isLoading={changePasswordMutation.isPending}
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};
