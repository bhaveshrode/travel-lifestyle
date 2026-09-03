// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ExperienceNFTs
 * @dev NFT marketplace for travel experiences with two-step transfer
 * @notice Allows users to mint, trade, and transfer travel experience NFTs
 */
contract ExperienceNFTs is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
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
    error InvalidAddress();

    // ============ Structs ============

    struct ExperienceNFT {
        uint256 tokenId;
        string description;
        string category;
        string location;
        uint256 price;
        bool isListed;
        uint256 createdAt;
    }

    struct PendingTransfer {
        address from;
        address to;
        uint256 timestamp;
    }

    // ============ State Variables ============

    uint256 private _tokenIdCounter;

    mapping(uint256 => ExperienceNFT) public nfts;
    mapping(uint256 => PendingTransfer) public pendingTransfers;

    uint256 public platformFeePercentage = 250;
    uint256 public accumulatedFees;

    // ============ Constructor ============

    constructor() ERC721("Travel Experience NFT", "TRAVEL") Ownable(msg.sender) {}

    // ============ Modifiers ============

    modifier onlyNFTOwner(uint256 tokenId) {
        if (ownerOf(tokenId) != msg.sender) revert NotNFTOwner();
        _;
    }

    modifier nftExists(uint256 tokenId) {
        if (_ownerOf(tokenId) == address(0)) revert NFTNotFound();
        _;
    }

    // ============ Public Functions ============

    /**
     * @notice Mint a new experience NFT
     */
    function mintNFT(
        string memory description,
        string memory category,
        string memory location,
        uint256 price,
        string memory tokenURI_
    ) external whenNotPaused returns (uint256) {
        return _mintExperience(msg.sender, description, category, location, price, tokenURI_);
    }

    /**
     * @notice Mint a new experience NFT for a user (owner only)
     */
    function mintNFTFor(
        address to,
        string memory description,
        string memory category,
        string memory location,
        uint256 price,
        string memory tokenURI_
    ) external onlyOwner whenNotPaused returns (uint256) {
        if (to == address(0)) revert InvalidAddress();
        return _mintExperience(to, description, category, location, price, tokenURI_);
    }

    /**
     * @notice List NFT for sale
     */
    function listNFT(uint256 tokenId, uint256 price)
        external
        nftExists(tokenId)
        onlyNFTOwner(tokenId)
        whenNotPaused
    {
        _list(tokenId, price);
    }

    /**
     * @notice List NFT for sale on behalf of owner (owner only)
     */
    function listNFTFor(uint256 tokenId, uint256 price)
        external
        onlyOwner
        nftExists(tokenId)
        whenNotPaused
    {
        _list(tokenId, price);
    }

    /**
     * @notice Unlist NFT from sale
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

        uint256 fee = (nft.price * platformFeePercentage) / 10000;
        uint256 sellerAmount = nft.price - fee;

        nft.isListed = false;
        accumulatedFees += fee;

        _transfer(seller, msg.sender, tokenId);

        (bool success, ) = payable(seller).call{value: sellerAmount}("");
        require(success, "Payment transfer failed");

        if (msg.value > nft.price) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - nft.price}("");
            require(refundSuccess, "Refund failed");
        }

        emit NFTPurchased(tokenId, seller, msg.sender, nft.price);
    }

    /**
     * @notice Offer NFT transfer to recipient (Step 1 of two-step transfer)
     */
    function offerNFTTransfer(uint256 tokenId, address to)
        external
        nftExists(tokenId)
        onlyNFTOwner(tokenId)
        whenNotPaused
    {
        _offerTransfer(tokenId, msg.sender, to);
    }

    /**
     * @notice Offer NFT transfer on behalf of owner (owner only)
     */
    function offerNFTTransferFor(uint256 tokenId, address from, address to)
        external
        onlyOwner
        nftExists(tokenId)
        whenNotPaused
    {
        if (ownerOf(tokenId) != from) revert NotNFTOwner();
        _offerTransfer(tokenId, from, to);
    }

    /**
     * @notice Claim NFT transfer (Step 2 of two-step transfer)
     */
    function claimNFTTransfer(uint256 tokenId)
        external
        nftExists(tokenId)
        nonReentrant
        whenNotPaused
    {
        _claimTransfer(tokenId, msg.sender);
    }

    /**
     * @notice Claim NFT transfer on behalf of recipient (owner only)
     */
    function claimNFTTransferFor(uint256 tokenId, address recipient)
        external
        onlyOwner
        nftExists(tokenId)
        nonReentrant
        whenNotPaused
    {
        if (recipient == address(0)) revert InvalidAddress();
        _claimTransfer(tokenId, recipient);
    }

    /**
     * @notice Cancel pending NFT transfer
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

    function getNFT(uint256 tokenId) external view nftExists(tokenId) returns (ExperienceNFT memory) {
        return nfts[tokenId];
    }

    function getNFTsByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    function getListedNFTs() external view returns (uint256[] memory) {
        uint256 supply = totalSupply();
        uint256 listedCount = 0;

        for (uint256 i = 0; i < supply; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (nfts[tokenId].isListed) {
                listedCount++;
            }
        }

        uint256[] memory listedTokenIds = new uint256[](listedCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < supply; i++) {
            uint256 tokenId = tokenByIndex(i);
            if (nfts[tokenId].isListed) {
                listedTokenIds[currentIndex] = tokenId;
                currentIndex++;
            }
        }

        return listedTokenIds;
    }

    function getPendingTransfer(uint256 tokenId) external view nftExists(tokenId) returns (PendingTransfer memory) {
        return pendingTransfers[tokenId];
    }

    function hasPendingTransfer(uint256 tokenId) external view nftExists(tokenId) returns (bool) {
        return pendingTransfers[tokenId].to != address(0);
    }

    // ============ Admin Functions ============

    function updatePlatformFee(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee too high");
        platformFeePercentage = newFeePercentage;
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Internal ============

    function _mintExperience(
        address to,
        string memory description,
        string memory category,
        string memory location,
        uint256 price,
        string memory tokenURI_
    ) internal returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        nfts[tokenId] = ExperienceNFT({
            tokenId: tokenId,
            description: description,
            category: category,
            location: location,
            price: price,
            isListed: false,
            createdAt: block.timestamp
        });

        emit NFTMinted(tokenId, to, category, price);
        return tokenId;
    }

    function _list(uint256 tokenId, uint256 price) internal {
        if (price == 0) revert InvalidPrice();
        ExperienceNFT storage nft = nfts[tokenId];
        if (nft.isListed) revert NFTAlreadyListed();

        nft.price = price;
        nft.isListed = true;

        emit NFTListed(tokenId, price);
    }

    function _offerTransfer(uint256 tokenId, address from, address to) internal {
        if (to == address(0) || to == from) revert TransferToSelf();
        if (pendingTransfers[tokenId].to != address(0)) revert TransferAlreadyPending();

        pendingTransfers[tokenId] = PendingTransfer({
            from: from,
            to: to,
            timestamp: block.timestamp
        });

        emit NFTTransferOffered(tokenId, from, to);
    }

    function _claimTransfer(uint256 tokenId, address recipient) internal {
        PendingTransfer memory transfer = pendingTransfers[tokenId];
        if (transfer.to == address(0)) revert NoTransferPending();
        if (transfer.to != recipient) revert NotTransferRecipient();

        address from = transfer.from;

        delete pendingTransfers[tokenId];

        if (nfts[tokenId].isListed) {
            nfts[tokenId].isListed = false;
        }

        _transfer(from, recipient, tokenId);

        emit NFTTransferClaimed(tokenId, from, recipient);
    }

    // ============ Required Overrides ============

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        whenNotPaused
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
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
