import { useState, useEffect } from 'react';
import api from '@/services/api';
import { PointsAccount } from '@/types';
import { FaCoins, FaExchangeAlt, FaPlus, FaHistory } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function PointsPage() {
  const [account, setAccount] = useState<PointsAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Create account form
  const [initialPoints, setInitialPoints] = useState('10000');

  // Add points form
  const [addPoints, setAddPoints] = useState('');
  const [reason, setReason] = useState('');

  // Swap form
  const [swapPoints, setSwapPoints] = useState('');

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      setIsLoading(true);
      const [accountRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; data: PointsAccount }>('/points/my'),
        api
          .get<{ success: boolean; data: any }>('/points/stats')
          .catch(() => ({ data: { data: null } })),
      ]);
      setAccount(accountRes.data.data);
      setStats(statsRes.data.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load points account');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/points', {
        points: parseInt(initialPoints, 10),
        cryptoValue: 0,
      });
      toast.success('Points account created successfully!');
      setShowCreateModal(false);
      fetchAccount();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create account');
    }
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/points/add', {
        points: parseInt(addPoints, 10),
        reason,
      });
      toast.success('Points added successfully!');
      setShowAddModal(false);
      setAddPoints('');
      setReason('');
      fetchAccount();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add points');
    }
  };

  const handleSwapPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/points/swap', {
        pointsToSwap: parseInt(swapPoints, 10),
      });
      toast.success('Points swapped successfully!');
      setShowSwapModal(false);
      setSwapPoints('');
      fetchAccount();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to swap points');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loyalty Points</h1>
          <p className="text-gray-600 mt-1">Earn and exchange loyalty points</p>
        </div>

        <div className="card text-center py-12">
          <FaCoins className="mx-auto text-6xl text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Points Account Yet</h2>
          <p className="text-gray-600 mb-6">Create a points account to start earning rewards</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <FaPlus className="inline mr-2" />
            Create Points Account
          </button>
        </div>

        {/* Create Account Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create Points Account</h3>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Points
                  </label>
                  <input
                    type="number"
                    value={initialPoints}
                    onChange={(e) => setInitialPoints(e.target.value)}
                    min="0"
                    step="1"
                    required
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You'll start with these loyalty points
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const exchangeRate = 100; // 100 points = 1 APT
  const estimatedCrypto = swapPoints ? parseInt(swapPoints, 10) / exchangeRate : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Loyalty Points</h1>
        <p className="text-gray-600 mt-1">Earn and exchange loyalty points</p>
      </div>

      {/* Account Overview */}
      <div className="card bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-yellow-100 text-sm mb-1">Total Points</p>
            <p className="text-3xl font-bold">
              {parseInt(account.points, 10).toLocaleString()}
            </p>
          </div>
          <FaCoins className="text-3xl text-yellow-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-yellow-100 text-sm mb-1">Available Points</p>
            <p className="text-xl font-semibold">
              {parseInt(account.points, 10).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-yellow-100 text-sm mb-1">Crypto Value</p>
            <p className="text-xl font-semibold">
              {parseFloat(account.cryptoValue).toFixed(4)} APT
            </p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-yellow-400">
          <p className="text-yellow-100 text-sm mb-1">Exchange Rate</p>
          <p className="text-sm">{exchangeRate} Points = 1 APT</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <FaPlus className="inline mr-2" />
          Add Points
        </button>
        <button onClick={() => setShowSwapModal(true)} className="btn btn-primary">
          <FaExchangeAlt className="inline mr-2" />
          Swap for Crypto
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Earned</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalEarned?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Swapped</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.totalSwapped?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.transactionCount || 0}
            </p>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
          <FaHistory className="text-gray-400" />
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>No transaction history</p>
          <p className="text-sm">Your points transactions will appear here</p>
        </div>
      </div>

      {/* Add Points Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Loyalty Points</h3>
            <form onSubmit={handleAddPoints} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points Amount
                </label>
                <input
                  type="number"
                  value={addPoints}
                  onChange={(e) => setAddPoints(e.target.value)}
                  min="1"
                  step="1"
                  required
                  className="input"
                  placeholder="Enter points amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input"
                  placeholder="e.g., Hotel stay, Flight booking"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddPoints('');
                    setReason('');
                  }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Add Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Swap Points Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Swap Points for Crypto</h3>
            <form onSubmit={handleSwapPoints} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points to Swap
                </label>
                <input
                  type="number"
                  value={swapPoints}
                  onChange={(e) => setSwapPoints(e.target.value)}
                  min={exchangeRate}
                  max={account.points}
                  step={exchangeRate}
                  required
                  className="input"
                  placeholder={`Minimum ${exchangeRate} points`}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available: {parseInt(account.points, 10).toLocaleString()} points
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Exchange Rate:</span>
                  <span className="font-medium">{exchangeRate} Points = 1 APT</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-blue-200">
                  <span className="text-gray-600">You will receive:</span>
                  <span className="font-semibold text-blue-600">
                    {estimatedCrypto.toFixed(4)} APT
                  </span>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowSwapModal(false);
                    setSwapPoints('');
                  }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Swap Points
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
