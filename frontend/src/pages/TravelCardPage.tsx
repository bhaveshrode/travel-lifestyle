import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import { TravelCard } from '@/types';
import { FaWallet, FaExchangeAlt, FaPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function TravelCardPage() {
  const { user } = useAuthStore();
  const [card, setCard] = useState<TravelCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Create card form
  const [initialBalance, setInitialBalance] = useState('1000');
  const [currency, setCurrency] = useState('USD');

  // Load funds form
  const [loadAmount, setLoadAmount] = useState('');

  // Convert form
  const [convertAmount, setConvertAmount] = useState('');

  useEffect(() => {
    fetchCard();
  }, []);

  const fetchCard = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: TravelCard }>('/cards/my');
      setCard(response.data.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Failed to load travel card');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cards', {
        initialBalance: parseFloat(initialBalance),
        currency,
      });
      toast.success('Travel card created successfully!');
      setShowCreateModal(false);
      fetchCard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create card');
    }
  };

  const handleLoadFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cards/load-funds', {
        amount: parseFloat(loadAmount),
      });
      toast.success('Funds loaded successfully!');
      setShowLoadModal(false);
      setLoadAmount('');
      fetchCard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load funds');
    }
  };

  const handleConvertToCrypto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cards/convert-to-crypto', {
        amount: parseFloat(convertAmount),
      });
      toast.success('Conversion successful!');
      setShowConvertModal(false);
      setConvertAmount('');
      fetchCard();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to convert');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Travel Card</h1>
          <p className="text-gray-600 mt-1">Manage your digital travel wallet</p>
        </div>

        <div className="card text-center py-12">
          <FaWallet className="mx-auto text-6xl text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Travel Card Yet</h2>
          <p className="text-gray-600 mb-6">
            Create a travel card to start managing your funds
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <FaPlus className="inline mr-2" />
            Create Travel Card
          </button>
        </div>

        {/* Create Card Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create Travel Card</h3>
              <form onSubmit={handleCreateCard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="input"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                  </select>
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
                    Create Card
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Travel Card</h1>
        <p className="text-gray-600 mt-1">Manage your digital travel wallet</p>
      </div>

      {/* Card Display */}
      <div className="card bg-gradient-to-br from-blue-500 to-purple-600 text-white">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-blue-100 text-sm mb-1">Total Balance</p>
            <p className="text-3xl font-bold">
              {card.currency} {parseFloat(card.balance).toFixed(2)}
            </p>
          </div>
          <FaWallet className="text-3xl text-blue-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-blue-100 text-sm mb-1">Fiat Balance</p>
            <p className="text-xl font-semibold">{parseFloat(card.balance).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm mb-1">Crypto Balance</p>
            <p className="text-xl font-semibold">
              {parseFloat(card.cryptoBalance).toFixed(4)} APT
            </p>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-blue-400">
          <p className="text-blue-100 text-sm mb-1">Aptos Address</p>
          <p className="text-sm font-mono truncate">{card.aptosAddress}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => setShowLoadModal(true)} className="btn btn-primary">
          <FaPlus className="inline mr-2" />
          Load Funds
        </button>
        <button onClick={() => setShowConvertModal(true)} className="btn btn-primary">
          <FaExchangeAlt className="inline mr-2" />
          Convert to Crypto
        </button>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No recent transactions</p>
          <p className="text-sm">Your card transactions will appear here</p>
        </div>
      </div>

      {/* Load Funds Modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Load Funds</h3>
            <form onSubmit={handleLoadFunds} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({card.currency})
                </label>
                <input
                  type="number"
                  value={loadAmount}
                  onChange={(e) => setLoadAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                  className="input"
                  placeholder="Enter amount"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoadModal(false);
                    setLoadAmount('');
                  }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Load Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Convert to Crypto</h3>
            <form onSubmit={handleConvertToCrypto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({card.currency})
                </label>
                <input
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  min="0.01"
                  max={card.balance}
                  step="0.01"
                  required
                  className="input"
                  placeholder="Enter amount"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available: {parseFloat(card.balance).toFixed(2)} {card.currency}
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  You will receive approximately{' '}
                  <span className="font-semibold text-blue-600">
                    {convertAmount ? (parseFloat(convertAmount) / 10).toFixed(4) : '0.0000'} APT
                  </span>
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowConvertModal(false);
                    setConvertAmount('');
                  }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
