import { useState, useEffect } from 'react';
import api from '@/services/api';
import { NFT } from '@/types';
import { FaImage, FaPlus, FaMapMarkerAlt, FaTag } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function NFTsPage() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);

  // Create NFT form
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Adventure');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Transfer form
  const [recipientAddress, setRecipientAddress] = useState('');

  useEffect(() => {
    fetchNFTs();
  }, []);

  const fetchNFTs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{
        success: boolean;
        data: { nfts: NFT[]; pagination: any };
      }>('/nfts');
      setNfts(response.data.data.nfts);
    } catch (error: any) {
      toast.error('Failed to load NFTs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNFT = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/nfts', {
        description,
        price: parseFloat(price),
        category,
        location,
        imageUrl: imageUrl || undefined,
      });
      toast.success('Experience NFT created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      fetchNFTs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create NFT');
    }
  };

  const handleOfferNFT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNFT) return;

    try {
      await api.post(`/nfts/${selectedNFT.id}/offer`, {
        recipientAddress,
      });
      toast.success('NFT transfer offer sent!');
      setShowTransferModal(false);
      setRecipientAddress('');
      setSelectedNFT(null);
      fetchNFTs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to offer NFT');
    }
  };

  const handleToggleListing = async (nft: NFT) => {
    try {
      await api.put(`/nfts/${nft.id}/list`, {
        isListed: !nft.isListed,
      });
      toast.success(nft.isListed ? 'NFT unlisted' : 'NFT listed for sale');
      fetchNFTs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update listing');
    }
  };

  const resetCreateForm = () => {
    setDescription('');
    setPrice('');
    setCategory('Adventure');
    setLocation('');
    setImageUrl('');
  };

  const categories = ['Adventure', 'Culture', 'Food', 'Nature', 'Urban', 'Luxury', 'Budget'];

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Experience NFTs</h1>
          <p className="text-gray-600 mt-1">Collect and trade travel experiences</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <FaPlus className="inline mr-2" />
          Create NFT
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total NFTs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{nfts.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Listed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {nfts.filter((n) => n.isListed).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pending Transfer</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {nfts.filter((n) => n.isPendingTransfer).length}
          </p>
        </div>
      </div>

      {/* NFT Grid */}
      {nfts.length === 0 ? (
        <div className="card text-center py-12">
          <FaImage className="mx-auto text-6xl text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No NFTs Yet</h2>
          <p className="text-gray-600 mb-6">Create your first experience NFT</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <FaPlus className="inline mr-2" />
            Create NFT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {nfts.map((nft) => (
            <div key={nft.id} className="card hover:shadow-lg transition-shadow">
              {nft.imageUrl ? (
                <img
                  src={nft.imageUrl}
                  alt={nft.description}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg mb-4 flex items-center justify-center">
                  <FaImage className="text-white text-4xl" />
                </div>
              )}
              <div className="space-y-3">
                <p className="text-gray-900 font-medium line-clamp-2">{nft.description}</p>
                {nft.category && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaTag className="mr-2" />
                    {nft.category}
                  </div>
                )}
                {nft.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FaMapMarkerAlt className="mr-2" />
                    {nft.location}
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-lg font-bold text-purple-600">
                    {parseFloat(nft.price).toFixed(2)} APT
                  </span>
                  {nft.isPendingTransfer && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Pending
                    </span>
                  )}
                  {nft.isListed && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Listed
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleToggleListing(nft)}
                    disabled={nft.isPendingTransfer}
                    className={`btn text-sm ${
                      nft.isPendingTransfer ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {nft.isListed ? 'Unlist' : 'List'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedNFT(nft);
                      setShowTransferModal(true);
                    }}
                    disabled={nft.isPendingTransfer}
                    className={`btn text-sm ${
                      nft.isPendingTransfer ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Transfer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create NFT Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create Experience NFT</h3>
            <form onSubmit={handleCreateNFT} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="input"
                  placeholder="Describe your experience..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (APT) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0.01"
                  step="0.01"
                  required
                  className="input"
                  placeholder="10.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input"
                  placeholder="e.g., Paris, France"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="input"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create NFT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer NFT Modal */}
      {showTransferModal && selectedNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Transfer NFT</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">NFT:</p>
              <p className="font-medium text-gray-900 line-clamp-2">{selectedNFT.description}</p>
            </div>
            <form onSubmit={handleOfferNFT} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address *
                </label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  required
                  className="input font-mono text-sm"
                  placeholder="0x..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  The recipient must claim this NFT to complete the transfer
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setRecipientAddress('');
                    setSelectedNFT(null);
                  }}
                  className="btn flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Offer Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
