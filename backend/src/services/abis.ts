export const TRAVEL_CARD_ABI = [
  'function createCardFor(address user, string currency, uint256 initialBalance)',
  'function loadFundsFor(address user, uint256 amount)',
  'function convertToCryptoFor(address user, uint256 amount)',
  'function getBalance(address user) view returns (uint256 fiatBalance, uint256 cryptoBalance)',
  'function checkCardExists(address user) view returns (bool)',
  'event CardCreated(address indexed owner, string currency, uint256 initialBalance)',
  'event FundsLoaded(address indexed owner, uint256 amount)',
  'event CryptoConverted(address indexed owner, uint256 fiatAmount, uint256 cryptoAmount)',
];

export const NFTS_ABI = [
  'function mintNFTFor(address to, string description, string category, string location, uint256 price, string tokenURI_) returns (uint256)',
  'function listNFTFor(uint256 tokenId, uint256 price)',
  'function offerNFTTransferFor(uint256 tokenId, address from, address to)',
  'function claimNFTTransferFor(uint256 tokenId, address recipient)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getNFT(uint256 tokenId) view returns (tuple(uint256 tokenId, string description, string category, string location, uint256 price, bool isListed, uint256 createdAt))',
  'event NFTMinted(uint256 indexed tokenId, address indexed owner, string category, uint256 price)',
];

export const POINTS_ABI = [
  'function createAccountFor(address user, uint256 initialPoints)',
  'function grantPoints(address user, uint256 amount, string reason)',
  'function swapPointsForCryptoFor(address user, uint256 pointsToSwap)',
  'function getPointsBalance(address user) view returns (uint256)',
  'function getCryptoValue(address user) view returns (uint256)',
  'function getExchangeRate() view returns (uint256)',
  'function checkAccountExists(address user) view returns (bool)',
  'event AccountCreated(address indexed owner, uint256 initialPoints)',
  'event PointsAdded(address indexed owner, uint256 amount, string reason)',
  'event PointsSwapped(address indexed owner, uint256 pointsAmount, uint256 cryptoAmount)',
];
