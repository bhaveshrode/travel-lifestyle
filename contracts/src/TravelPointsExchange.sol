// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TravelPointsExchange
 * @dev Loyalty points system with crypto conversion
 * @notice Allows users to earn, manage, and swap loyalty points for crypto
 */
contract TravelPointsExchange is Ownable, ReentrancyGuard, Pausable {

    // ============ Events ============

    event AccountCreated(address indexed owner, uint256 initialPoints);
    event PointsAdded(address indexed owner, uint256 amount, string reason);
    event PointsSwapped(address indexed owner, uint256 pointsAmount, uint256 cryptoAmount);
    event ExchangeRateUpdated(uint256 oldRate, uint256 newRate);
    event MinimumSwapUpdated(uint256 oldMinimum, uint256 newMinimum);
    event CryptoWithdrawn(address indexed owner, uint256 amount);

    // ============ Errors ============

    error AccountAlreadyExists();
    error AccountNotFound();
    error InsufficientPoints();
    error InsufficientCrypto();
    error InvalidAmount();
    error BelowMinimumSwap();
    error ExchangeRateTooLow();

    // ============ Structs ============

    struct PointsAccount {
        uint256 points;              // Loyalty points balance
        uint256 cryptoValue;         // Crypto earned from swaps (in wei)
        uint256 totalPointsEarned;   // Lifetime points earned
        uint256 totalPointsSwapped;  // Lifetime points swapped
        uint256 totalCryptoEarned;   // Lifetime crypto earned
        uint256 transactionCount;    // Number of transactions
        uint256 createdAt;           // Account creation timestamp
        uint256 lastUpdated;         // Last update timestamp
        bool isActive;               // Account status
    }

    struct SwapTransaction {
        address user;
        uint256 pointsSwapped;
        uint256 cryptoEarned;
        uint256 timestamp;
        uint256 exchangeRateUsed;
    }

    // ============ State Variables ============

    /// @notice Mapping from user address to points account
    mapping(address => PointsAccount) public accounts;

    /// @notice Mapping to track if user has an account
    mapping(address => bool) public hasAccount;

    /// @notice Exchange rate: points per 1 crypto (in wei)
    /// @dev 100 points = 1 crypto, so rate = 100
    uint256 public pointsPerCrypto = 100;

    /// @notice Minimum points required for swap
    uint256 public minimumSwapPoints = 100;

    /// @notice Total accounts created
    uint256 public totalAccounts;

    /// @notice Total points issued
    uint256 public totalPointsIssued;

    /// @notice Total crypto distributed
    uint256 public totalCryptoDistributed;

    /// @notice Swap transaction history
    SwapTransaction[] public swapHistory;

    // ============ Modifiers ============

    modifier accountExists() {
        if (!hasAccount[msg.sender]) revert AccountNotFound();
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        _;
    }

    // ============ Constructor ============

    constructor() {}

    // ============ Public Functions ============

    /**
     * @notice Create a new points account
     * @param initialPoints Initial points balance
     */
    function createAccount(uint256 initialPoints) external validAmount(initialPoints) whenNotPaused {
        if (hasAccount[msg.sender]) revert AccountAlreadyExists();

        accounts[msg.sender] = PointsAccount({
            points: initialPoints,
            cryptoValue: 0,
            totalPointsEarned: initialPoints,
            totalPointsSwapped: 0,
            totalCryptoEarned: 0,
            transactionCount: 0,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp,
            isActive: true
        });

        hasAccount[msg.sender] = true;
        totalAccounts++;
        totalPointsIssued += initialPoints;

        emit AccountCreated(msg.sender, initialPoints);
    }

    /**
     * @notice Add points to account
     * @param amount Amount of points to add
     * @param reason Reason for adding points
     */
    function addPoints(uint256 amount, string memory reason)
        external
        accountExists
        validAmount(amount)
        whenNotPaused
    {
        PointsAccount storage account = accounts[msg.sender];

        // Check for overflow
        uint256 newPoints = account.points + amount;
        if (newPoints < account.points) revert InvalidAmount();

        account.points = newPoints;
        account.totalPointsEarned += amount;
        account.lastUpdated = block.timestamp;

        totalPointsIssued += amount;

        emit PointsAdded(msg.sender, amount, reason);
    }

    /**
     * @notice Swap points for crypto
     * @param pointsToSwap Amount of points to swap
     */
    function swapPointsForCrypto(uint256 pointsToSwap)
        external
        accountExists
        validAmount(pointsToSwap)
        nonReentrant
        whenNotPaused
    {
        PointsAccount storage account = accounts[msg.sender];

        if (account.points < pointsToSwap) revert InsufficientPoints();
        if (pointsToSwap < minimumSwapPoints) revert BelowMinimumSwap();

        // Calculate crypto amount: pointsToSwap / pointsPerCrypto * 1e18
        uint256 cryptoAmount = (pointsToSwap * 1e18) / pointsPerCrypto;
        if (cryptoAmount == 0) revert ExchangeRateTooLow();

        // Check for overflow
        uint256 newCryptoValue = account.cryptoValue + cryptoAmount;
        if (newCryptoValue < account.cryptoValue) revert InvalidAmount();

        // Update account
        account.points -= pointsToSwap;
        account.cryptoValue = newCryptoValue;
        account.totalPointsSwapped += pointsToSwap;
        account.totalCryptoEarned += cryptoAmount;
        account.transactionCount++;
        account.lastUpdated = block.timestamp;

        totalCryptoDistributed += cryptoAmount;

        // Record transaction
        swapHistory.push(SwapTransaction({
            user: msg.sender,
            pointsSwapped: pointsToSwap,
            cryptoEarned: cryptoAmount,
            timestamp: block.timestamp,
            exchangeRateUsed: pointsPerCrypto
        }));

        emit PointsSwapped(msg.sender, pointsToSwap, cryptoAmount);
    }

    /**
     * @notice Withdraw crypto value (simulated withdrawal)
     * @param amount Amount of crypto to withdraw
     */
    function withdrawCrypto(uint256 amount)
        external
        accountExists
        validAmount(amount)
        nonReentrant
        whenNotPaused
    {
        PointsAccount storage account = accounts[msg.sender];

        if (account.cryptoValue < amount) revert InsufficientCrypto();

        account.cryptoValue -= amount;
        account.lastUpdated = block.timestamp;

        emit CryptoWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Deactivate account
     */
    function deactivateAccount() external accountExists whenNotPaused {
        accounts[msg.sender].isActive = false;
        accounts[msg.sender].lastUpdated = block.timestamp;
    }

    /**
     * @notice Reactivate account
     */
    function reactivateAccount() external accountExists whenNotPaused {
        accounts[msg.sender].isActive = true;
        accounts[msg.sender].lastUpdated = block.timestamp;
    }

    // ============ View Functions ============

    /**
     * @notice Get account details
     * @param user User address
     * @return Account details
     */
    function getAccount(address user) external view returns (PointsAccount memory) {
        if (!hasAccount[user]) revert AccountNotFound();
        return accounts[user];
    }

    /**
     * @notice Get points balance
     * @param user User address
     * @return Points balance
     */
    function getPointsBalance(address user) external view returns (uint256) {
        if (!hasAccount[user]) revert AccountNotFound();
        return accounts[user].points;
    }

    /**
     * @notice Get crypto value
     * @param user User address
     * @return Crypto value
     */
    function getCryptoValue(address user) external view returns (uint256) {
        if (!hasAccount[user]) revert AccountNotFound();
        return accounts[user].cryptoValue;
    }

    /**
     * @notice Calculate crypto amount for given points
     * @param pointsAmount Points amount
     * @return Crypto amount in wei
     */
    function calculateCryptoForPoints(uint256 pointsAmount) external view returns (uint256) {
        return (pointsAmount * 1e18) / pointsPerCrypto;
    }

    /**
     * @notice Calculate points needed for given crypto amount
     * @param cryptoAmount Crypto amount in wei
     * @return Points needed
     */
    function calculatePointsForCrypto(uint256 cryptoAmount) external view returns (uint256) {
        return (cryptoAmount * pointsPerCrypto) / 1e18;
    }

    /**
     * @notice Get current exchange rate
     * @return Points per crypto
     */
    function getExchangeRate() external view returns (uint256) {
        return pointsPerCrypto;
    }

    /**
     * @notice Get swap history for user
     * @param user User address
     * @return Array of swap transactions
     */
    function getUserSwapHistory(address user) external view returns (SwapTransaction[] memory) {
        uint256 userTransactionCount = 0;

        // Count user transactions
        for (uint256 i = 0; i < swapHistory.length; i++) {
            if (swapHistory[i].user == user) {
                userTransactionCount++;
            }
        }

        // Create array of user transactions
        SwapTransaction[] memory userTransactions = new SwapTransaction[](userTransactionCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < swapHistory.length; i++) {
            if (swapHistory[i].user == user) {
                userTransactions[currentIndex] = swapHistory[i];
                currentIndex++;
            }
        }

        return userTransactions;
    }

    /**
     * @notice Get total swap history count
     * @return Total swaps
     */
    function getTotalSwaps() external view returns (uint256) {
        return swapHistory.length;
    }

    /**
     * @notice Get account statistics
     * @param user User address
     * @return points Current points
     * @return cryptoValue Current crypto value
     * @return totalEarned Total points earned
     * @return totalSwapped Total points swapped
     * @return transactions Transaction count
     */
    function getAccountStats(address user)
        external
        view
        returns (
            uint256 points,
            uint256 cryptoValue,
            uint256 totalEarned,
            uint256 totalSwapped,
            uint256 transactions
        )
    {
        if (!hasAccount[user]) revert AccountNotFound();
        PointsAccount memory account = accounts[user];
        return (
            account.points,
            account.cryptoValue,
            account.totalPointsEarned,
            account.totalPointsSwapped,
            account.transactionCount
        );
    }

    /**
     * @notice Check if user has an account
     * @param user User address
     * @return True if user has account
     */
    function checkAccountExists(address user) external view returns (bool) {
        return hasAccount[user];
    }

    // ============ Admin Functions ============

    /**
     * @notice Update exchange rate (owner only)
     * @param newRate New points per crypto rate
     */
    function updateExchangeRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert InvalidAmount();
        uint256 oldRate = pointsPerCrypto;
        pointsPerCrypto = newRate;
        emit ExchangeRateUpdated(oldRate, newRate);
    }

    /**
     * @notice Update minimum swap points (owner only)
     * @param newMinimum New minimum swap amount
     */
    function updateMinimumSwap(uint256 newMinimum) external onlyOwner {
        if (newMinimum == 0) revert InvalidAmount();
        uint256 oldMinimum = minimumSwapPoints;
        minimumSwapPoints = newMinimum;
        emit MinimumSwapUpdated(oldMinimum, newMinimum);
    }

    /**
     * @notice Grant points to user (owner only)
     * @param user User address
     * @param amount Points amount
     * @param reason Reason for granting points
     */
    function grantPoints(address user, uint256 amount, string memory reason)
        external
        onlyOwner
        validAmount(amount)
    {
        if (!hasAccount[user]) revert AccountNotFound();

        PointsAccount storage account = accounts[user];
        account.points += amount;
        account.totalPointsEarned += amount;
        account.lastUpdated = block.timestamp;

        totalPointsIssued += amount;

        emit PointsAdded(user, amount, reason);
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
}
