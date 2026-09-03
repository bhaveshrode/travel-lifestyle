import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { FaUser, FaSave, FaKey, FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Delete account
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
    }
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/users/me/stats');
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await api.put('/users/me', {
        firstName,
        lastName,
        bio,
        avatar: avatar || undefined,
      });
      toast.success('Profile updated successfully!');

      // Refresh user data
      const response = await api.get('/users/me');
      useAuthStore.setState({ user: response.data.data });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setIsLoading(true);
      await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    try {
      setIsLoading(true);
      await api.delete('/users/me', {
        data: {
          password: deletePassword,
          confirmation: deleteConfirmation,
        },
      });
      toast.success('Account deleted successfully');
      logout();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete account');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account information</p>
      </div>

      {/* User Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Travel Card</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.travelCard ? `${stats.travelCard.currency} ${parseFloat(stats.travelCard.balance).toFixed(2)}` : 'None'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">NFTs</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.nfts?.total || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Points</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.points ? parseInt(stats.points.points, 10).toLocaleString() : '0'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.transactions?.total || 0}
            </p>
          </div>
        </div>
      )}

      {/* Profile Information */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <FaUser className="text-2xl text-gray-400" />
          <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
        </div>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={user.email} disabled className="input bg-gray-50" />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input type="text" value={user.username} disabled className="input bg-gray-50" />
            <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ethereum Address</label>
            <input
              type="text"
              value={user.ethereumAddress}
              disabled
              className="input bg-gray-50 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="input"
              placeholder="Tell us about yourself..."
            />
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="input"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
          <button type="submit" disabled={isLoading} className="btn btn-primary">
            <FaSave className="inline mr-2" />
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <FaKey className="text-2xl text-gray-400" />
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
          </div>
          {!showPasswordForm && (
            <button onClick={() => setShowPasswordForm(true)} className="btn btn-primary text-sm">
              Change Password
            </button>
          )}
        </div>
        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="input"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="btn"
              >
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-2 border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <FaTrash className="text-2xl text-red-500" />
          <h2 className="text-xl font-bold text-red-600">Danger Zone</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="btn bg-red-600 text-white hover:bg-red-700"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">Delete Account</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 font-medium mb-2">Warning: This action cannot be undone!</p>
              <p className="text-sm text-red-700">
                All your data including travel cards, NFTs, points, and transaction history will be permanently deleted.
              </p>
            </div>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-bold">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  required
                  className="input"
                  placeholder="DELETE"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteConfirmation('');
                  }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || deleteConfirmation !== 'DELETE'}
                  className="btn bg-red-600 text-white hover:bg-red-700 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
