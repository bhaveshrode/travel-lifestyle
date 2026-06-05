import { Link } from 'react-router-dom';
import { FaPlane, FaWallet, FaCoins, FaImage } from 'react-icons/fa';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaPlane className="text-primary-600 text-3xl" />
            <span className="text-2xl font-bold text-gray-900">Travel & Lifestyle</span>
          </div>
          <div className="space-x-4">
            <Link to="/login" className="btn btn-outline">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Your Gateway to
          <span className="text-primary-600"> Travel Experiences</span>
          <br />
          and Crypto Rewards
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Manage your travel funds, collect unique experience NFTs, and redeem loyalty
          points for cryptocurrency—all on the blockchain.
        </p>
        <div className="space-x-4">
          <Link to="/register" className="btn btn-primary btn-lg px-8 py-3 text-lg">
            Start Your Journey
          </Link>
          <a href="#features" className="btn btn-outline btn-lg px-8 py-3 text-lg">
            Learn More
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
          Everything You Need for Modern Travel
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-4 rounded-full">
                <FaWallet className="text-primary-600 text-3xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Digital Travel Card</h3>
            <p className="text-gray-600">
              Multi-currency digital wallet with seamless crypto conversion for travelers.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-4 rounded-full">
                <FaImage className="text-primary-600 text-3xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Experience NFTs</h3>
            <p className="text-gray-600">
              Tokenize and trade unique travel experiences as NFTs on the blockchain.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-4 rounded-full">
                <FaCoins className="text-primary-600 text-3xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Points Exchange</h3>
            <p className="text-gray-600">
              Convert airline and hotel loyalty points to cryptocurrency instantly.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="flex justify-center mb-4">
              <div className="bg-primary-100 p-4 rounded-full">
                <FaPlane className="text-primary-600 text-3xl" />
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">Secure & Transparent</h3>
            <p className="text-gray-600">
              Built on Aptos blockchain for secure, fast, and transparent transactions.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Travel Experience?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of travelers already using our platform
          </p>
          <Link to="/register" className="btn bg-white text-primary-600 hover:bg-gray-100 px-8 py-3 text-lg">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FaPlane className="text-2xl" />
                <span className="text-xl font-bold">Travel & Lifestyle</span>
              </div>
              <p className="text-gray-400">
                Your gateway to travel experiences and crypto rewards.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Platform</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">How It Works</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Travel & Lifestyle. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
