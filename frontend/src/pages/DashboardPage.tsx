import { useAuthStore } from '@/store/authStore';
import { FaWallet, FaImage, FaCoins, FaHistory } from 'react-icons/fa';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const stats = [
    {
      name: 'Travel Card Balance',
      value: '$0.00',
      icon: FaWallet,
      color: 'bg-blue-500',
      link: '/dashboard/card',
    },
    {
      name: 'NFTs Owned',
      value: '0',
      icon: FaImage,
      color: 'bg-purple-500',
      link: '/dashboard/nfts',
    },
    {
      name: 'Loyalty Points',
      value: '0',
      icon: FaCoins,
      color: 'bg-yellow-500',
      link: '/dashboard/points',
    },
    {
      name: 'Transactions',
      value: '0',
      icon: FaHistory,
      color: 'bg-green-500',
      link: '/dashboard/transactions',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName || user?.username}!
        </h1>
        <p className="text-gray-600 mt-1">Here's an overview of your account</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white text-2xl" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/dashboard/card" className="btn btn-primary">
            Create Travel Card
          </Link>
          <Link to="/dashboard/nfts" className="btn btn-primary">
            Browse NFTs
          </Link>
          <Link to="/dashboard/points" className="btn btn-primary">
            Exchange Points
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-12 text-gray-500">
          <FaHistory className="mx-auto text-4xl mb-4 text-gray-300" />
          <p>No recent activity</p>
          <p className="text-sm">Start by creating a travel card or browsing NFTs</p>
        </div>
      </div>
    </div>
  );
}
