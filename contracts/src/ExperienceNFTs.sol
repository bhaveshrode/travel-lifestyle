// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ExperienceNFTs
 * @dev NFT marketplace for travel experiences with two-step transfer
 * @notice Allows users to mint, trade, and transfer travel experience NFTs
 */
contract ExperienceNFTs is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    // ============ Events ============

    event NFTMinted(uint256 indexed tokenId, address indexed owner, string category, uint256 price);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTUnlisted(uint256 indexed tokenId);
    event NFTTransferOffered(uint256 indexed tokenId, address indexed from, address indexed to);
    event NFTTransferClaimed(uint256 indexed tokenId, address indexed from, address indexed to);
    event NFTTransferCancelled(uint256 indexed tokenId, address indexed from);
    event NFTPurchased(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);
    event NFTMetadataUpdated(uint256 indexed tokenId, string newMetadata);

    // ============ Errors ============

    error NFTNotFound();
    error NotNFTOwner();
    error NFTNotListed();
    error NFTAlreadyListed();
    error InsufficientPayment();
    error InvalidPrice();
    error TransferToSelf();
    error NoTransferPending();
    error NotTransferRecipient();
    error TransferAlreadyPending();

    // ============ Structs ============

    struct ExperienceNFT {
        uint256 tokenId;
        string description;
        string category;        // e.g., "Adventure", "Cultural", "Culinary"
        string location;        // e.g., "Paris, France"
        uint256 price;          // Price in wei
        bool isListed;          // Whether NFT is listed for sale
        uint256 createdAt;      // Creation timestamp
    }

    struct PendingTransfer {
        address from;
        address to;
        uint256 timestamp;
    }

    // ============ State Variables ============

    Counters.Counter private _tokenIdCounter;

    /// @notice Mapping from token ID to NFT data
    mapping(uint256 => ExperienceNFT) public nfts;

    /// @notice Mapping from token ID to pending transfer
    mapping(uint256 => PendingTransfer) public pendingTransfers;

    /// @notice Platform fee percentage (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFeePercentage = 250; // 2.5%

    /// @notice Accumulated platform fees
    uint256 public accumulatedFees;

    // ============ Constructor ============

    constructor() ERC721("Travel Experience NFT", "TRAVEL") {}

    // ============ Modifiers ============

    modifier onlyNFTOwner(uint256 tokenId) {
        if (ownerOf(tokenId) != msg.sender) revert NotNFTOwner();
        _;
    }

    modifier nftExists(uint256 tokenId) {
        if (!_exists(tokenId)) revert NFTNotFound();
        _;
    }

    // ============ Public Functions ============

    /**
     * @notice Mint a new experience NFT
     * @param description Description of the experience
     * @param category Category of the experience
     * @param location Location of the experience
     * @param price Price in wei
     * @param tokenURI Metadata URI for the NFT
     * @return tokenId The ID of the minted NFT
     */
    function mintNFT(
        string memory description,
        string memory category,
        string memory location,
        uint256 price,
        string memory tokenURI
    ) external whenNotPaused returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        nfts[tokenId] = ExperienceNFT({
            tokenId: tokenId,
            description: description,
            category: category,
            location: location,
            price: price,
            isListed: false,
            createdAt: block.timestamp
        });

        emit NFTMinted(tokenId, msg.sender, category, price);
        return tokenId;
    }

    /**
     * @notice List NFT for sale
     * @param tokenId Token ID to list
     * @param price Price in wei
     */
    function listNFT(uint256 tokenId, uint256 price)
        external
        nftExists(tokenId)
        onlyNFTOwner(tokenId)
        whenNotPaused
    {
        if (price == 0) revert InvalidPrice();
        ExperienceNFT storage nft = nfts[tokenId];
        if (nft.isListed) revert NFTAlreadyListed();

        nft.price = price;
        nft.isListed = true;

        emit NFTListed(tokenId, price);
    }

    /**
     * @notice Unlist NFT from sale
     * @param tokenId Token ID to unlist
     */
    function unlistNFT(uint256 tokenId)
        external
        nftExists(tokenId)
        onlyNFTOwner(tokenId)
        whenNotPaused
    {
        ExperienceNFT storage nft = nfts[tokenId];
        if (!nft.isListed) revert NFTNotListed();

        nft.isListed = false;

        emit NFTUnlisted(tokenId);
    }

    /**
     * @notice Purchase a listed NFT
     * @param tokenId Token ID to purchase
     */
    function purchaseNFT(uint256 tokenId)
        external
        payable
        nftExists(tokenId)
        nonReentrant
        whenNotPaused
    {
        ExperienceNFT storage nft = nfts[tokenId];
        if (!nft.isListed) revert NFTNotListed();
        if (msg.value < nft.price) revert InsufficientPayment();

        address seller = ownerOf(tokenId);
        if (seller == msg.sender) revert TransferToSelf();

        // Calculate platform fee
        uint256 fee = (nft.price * platformFeePercentage) / 10000;
        uint256 sellerAmount = nft.price - fee;

        // Update state before external calls
        nft.isListed = false;
        accumulatedFees += fee;

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Transfer payment to seller
        (bool success, ) = payable(seller).call{value: sellerAmount}("");
        require(success, "Payment transfer failed");

        // Refund excess payment
        if (msg.value > nft.price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - nft.price}("");
            require(refundSuccess, "Refund failed");
        }

        emit NFTPurchased(tokenId, seller, msg.sender, nft.price);
    }

    /**
     * @notice Offer NFT transfer to recipient (Step 1 of two-step transfer)
     * @param tokenId Token ID to transfer
     * @param to Recipient address
     */
    function offerNFTTransfer(uint256 tokenId, address to)
        external
        nftExists(tokenId)
        onlyNFTOwner(tokenId)
        whenNotPaused
    {
        if (to == address(0)) revert TransferToSelf();
        if (to == msg.sender) revert TransferToSelf();
        if (pendingTransfers[tokenId].to != address(0)) revert TransferAlreadyPending();

        pendingTransfers[tokenId] = PendingTransfer({
            from: msg.sender,
            to: to,
            timestamp: block.timestamp
        });

        emit NFTTransferOffered(tokenId, msg.sender, to);
    }

    /**
     * @notice Claim NFT transfer (Step 2 of two-step transfer)
     * @param tokenId Token ID to claim
     */
    function claimNFTTransfer(uint256 tokenId)
        external
        nftExists(tokenId)
        nonReentrant
        whenNotPaused
    {
        PendingTransfer memory transfer = pendingTransfers[tokenId];
        if (transfer.to == address(0)) revert NoTransferPending();
        if (transfer.to != msg.sender) revert NotTransferRecipient();

        address from = transfer.from;

        // Clear pending transfer
        delete pendingTransfers[tokenId];

        // Unlist if listed
        if (nfts[tokenId].isListed) {
            nfts[tokenId].isListed = false;
        }

        // Transfer NFT
        _transfer(from, msg.sender, tokenId);

        emit NFTTransferClaimed(tokenId, from, msg.sender);
    }

    /**
     * @notice Cancel pending NFT transfer
     * @param tokenId Token ID
     */
    function cancelNFTTransfer(uint256 tokenId)
        external
        nftExists(tokenId)
        onlyNFTOwner(tokenId)
        whenNotPaused
    {
        if (pendingTransfers[tokenId].to == address(0)) revert NoTransferPending();

        delete pendingTransfers[tokenId];

        emit NFTTransferCancelled(tokenId, msg.sender);
    }

    /**
     * @notice Update NFT metadata URI
     * @param tokenId Token ID
     * @param newTokenURI New metadata URI
     */
    function updateTokenURI(uint256 tokenId, string memory newTokenURI)
        external
        nftExists(tokenId)
        onlyNFTOwner(tokenId)
        whenNotPaused
    {
        _setTokenURI(tokenId, newTokenURI);
        emit NFTMetadataUpdated(tokenId, newTokenURI);
    }

    // ============ View Functions ============

    /**
     * @notice Get NFT details
     * @param tokenId Token ID
     * @return NFT details
     */
    function getNFT(uint256 tokenId) external view nftExists(tokenId) returns (ExperienceNFT memory) {
        return nfts[tokenId];
    }

    /**
     * @notice Get all NFTs owned by an address
     * @param owner Owner address
     * @return Array of token IDs
     */
    function getNFTsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @notice Get all listed NFTs
     * @return Array of token IDs
     */
    function getListedNFTs() external view returns (uint256[] memory) {
        uint256 totalSupply = totalSupply();
        uint256 listedCount = 0;

        // Count listed NFTs
        for (uint256 i = 0; i < totalSupply; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (nfts[tokenId].isListed) {
                listedCount++;
            }
        }

        // Create array of listed token IDs
        uint256[] memory listedTokenIds = new uint256[](listedCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalSupply; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (nfts[tokenId].isListed) {
                listedTokenIds[currentIndex] = tokenId;
                currentIndex++;
            }
        }

        return listedTokenIds;
    }

    /**
     * @notice Get pending transfer for NFT
     * @param tokenId Token ID
     * @return Pending transfer details
     */
    function getPendingTransfer(uint256 tokenId) external view nftExists(tokenId) returns (PendingTransfer memory) {
        return pendingTransfers[tokenId];
    }

    /**
     * @notice Check if NFT has pending transfer
     * @param tokenId Token ID
     * @return True if transfer is pending
     */
    function hasPendingTransfer(uint256 tokenId) external view nftExists(tokenId) returns (bool) {
        return pendingTransfers[tokenId].to != address(0);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update platform fee percentage (owner only)
     * @param newFeePercentage New fee percentage in basis points
     */
    function updatePlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeePercentage = newFeePercentage;
    }

    /**
     * @notice Withdraw accumulated platform fees (owner only)
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @notice Pause contract (owner only)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract (owner only)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Required Overrides ============

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
        delete nfts[tokenId];
        delete pendingTransfers[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
