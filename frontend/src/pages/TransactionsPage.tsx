import { useState, useEffect } from 'react';
import api from '@/services/api';
import { Transaction } from '@/types';
import { FaHistory, FaDownload, FaFilter, FaCheckCircle, FaClock, FaTimesCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [page, typeFilter, statusFilter]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 10 };
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get<{
        success: boolean;
        data: { transactions: Transaction[]; pagination: any };
      }>('/transactions', { params });

      setTransactions(response.data.data.transactions);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error: any) {
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get<{ success: boolean; data: any }>('/transactions/stats/summary');
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleExport = async () => {
    try {
      toast.loading('Exporting transactions...');
      const response = await api.get('/transactions/export', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.dismiss();
      toast.success('Transactions exported successfully!');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Failed to export transactions');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <FaCheckCircle className="text-green-500" />;
      case 'PENDING':
        return <FaClock className="text-yellow-500" />;
      case 'FAILED':
        return <FaTimesCircle className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const transactionTypes = [
    'CARD_CREATE',
    'CARD_LOAD',
    'CARD_CONVERT',
    'NFT_CREATE',
    'NFT_TRANSFER',
    'POINTS_ADD',
    'POINTS_SWAP',
  ];

  if (isLoading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">View your transaction history</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn"
          >
            <FaFilter className="inline mr-2" />
            Filters
          </button>
          <button onClick={handleExport} className="btn btn-primary">
            <FaDownload className="inline mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.overview?.total || 0}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Confirmed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {stats.overview?.confirmed || 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.overview?.pending || 0}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Failed</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.overview?.failed || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="input"
              >
                <option value="">All Types</option>
                {transactionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="input"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
          </div>
          {(typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setTypeFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              className="btn mt-4"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="card text-center py-12">
          <FaHistory className="mx-auto text-6xl text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Transactions Yet</h2>
          <p className="text-gray-600">Your transaction history will appear here</p>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Type
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Hash
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {tx.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(tx.status)}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-900">
                        {tx.amount ? `${parseFloat(tx.amount).toFixed(4)} APT` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </span>
                      <br />
                      <span className="text-xs text-gray-500">
                        {new Date(tx.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {tx.txHash ? (
                        <span className="text-xs font-mono text-blue-600 truncate max-w-xs block">
                          {tx.txHash.substring(0, 10)}...
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
