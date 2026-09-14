import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { connectWallet, isWalletAvailable, shortenAddress } from '@/services/wallet';
import api from '@/services/api';
import { User } from '@/types';
import toast from 'react-hot-toast';
import { FaWallet } from 'react-icons/fa';

interface WalletConnectButtonProps {
  className?: string;
  compact?: boolean;
}

export default function WalletConnectButton({ className = '', compact = false }: WalletConnectButtonProps) {
  const { user } = useAuthStore();
  const [isConnecting, setIsConnecting] = useState(false);
  const address = user?.ethereumAddress;

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      toast.loading('Opening wallet...', { id: 'wallet' });
      const nextAddress = await connectWallet();
      const response = await api.put<{
        user: User;
        accessToken: string;
        refreshToken: string;
        message: string;
      }>('/users/me/wallet', { ethereumAddress: nextAddress });

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      useAuthStore.setState({ user: response.data.user, isAuthenticated: true });
      toast.success(`Connected ${shortenAddress(response.data.user.ethereumAddress)}`, { id: 'wallet' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.message || 'Failed to connect wallet', {
        id: 'wallet',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleConnect}
        disabled={isConnecting}
        className="btn btn-secondary w-full"
      >
        <FaWallet className="inline mr-2" />
        {isConnecting
          ? 'Connecting...'
          : address
            ? compact
              ? shortenAddress(address)
              : `Wallet ${shortenAddress(address)}`
            : isWalletAvailable()
              ? 'Connect MetaMask'
              : 'Connect Wallet'}
      </button>
      {!compact && (
        <p className="text-xs text-gray-500 mt-2">
          Connect MetaMask or another injected wallet. Use this at payout time so crypto is sent to your address.
        </p>
      )}
    </div>
  );
}
