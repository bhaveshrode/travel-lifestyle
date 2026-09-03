// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DigitalTravelCard
 * @dev Multi-currency digital travel wallet with crypto conversion
 * @notice Allows users to manage travel funds with fiat and crypto balances
 */
contract DigitalTravelCard is Ownable, ReentrancyGuard, Pausable {

    // ============ Events ============

    event CardCreated(address indexed owner, string currency, uint256 initialBalance);
    event FundsLoaded(address indexed owner, uint256 amount);
    event CryptoConverted(address indexed owner, uint256 fiatAmount, uint256 cryptoAmount);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event CurrencyChanged(address indexed owner, string oldCurrency, string newCurrency);

    // ============ Errors ============

    error CardAlreadyExists();
    error CardNotFound();
    error InsufficientBalance();
    error InvalidAmount();
    error InvalidAddress();
    error InvalidCurrency();
    error ConversionRateTooLow();

    // ============ Structs ============

    struct TravelCard {
        uint256 balance;           // Fiat balance in wei (smallest unit)
        uint256 cryptoBalance;     // Crypto balance in wei
        string currency;           // Currency code (USD, EUR, GBP, JPY)
        bool isActive;             // Card status
        uint256 createdAt;         // Creation timestamp
        uint256 lastUpdated;       // Last update timestamp
    }

    // ============ State Variables ============

    /// @notice Mapping from user address to their travel card
    mapping(address => TravelCard) public cards;

    /// @notice Mapping to track if user has a card
    mapping(address => bool) public hasCard;

    /// @notice Conversion rate: 1 fiat = X crypto (scaled by 1e18)
    uint256 public conversionRate = 10 * 1e18; // 1 fiat = 10 crypto

    /// @notice Supported currencies
    mapping(string => bool) public supportedCurrencies;

    /// @notice Total cards created
    uint256 public totalCards;

    // ============ Constructor ============

    constructor() Ownable(msg.sender) {
        supportedCurrencies["USD"] = true;
        supportedCurrencies["EUR"] = true;
        supportedCurrencies["GBP"] = true;
        supportedCurrencies["JPY"] = true;
    }

    // ============ Modifiers ============

    modifier cardExists() {
        if (!hasCard[msg.sender]) revert CardNotFound();
        _;
    }

    modifier validAmount(uint256 amount) {
        if (amount == 0) revert InvalidAmount();
        _;
    }

    modifier validCurrency(string memory currency) {
        if (!supportedCurrencies[currency]) revert InvalidCurrency();
        _;
    }

    modifier validUser(address user) {
        if (user == address(0)) revert InvalidAddress();
        _;
    }

    // ============ Public Functions ============

    /**
     * @notice Create a new travel card
     * @param currency Currency code for the card
     * @param initialBalance Initial fiat balance
     */
    function createCard(
        string memory currency,
        uint256 initialBalance
    ) external validCurrency(currency) validAmount(initialBalance) whenNotPaused {
        if (hasCard[msg.sender]) revert CardAlreadyExists();

        cards[msg.sender] = TravelCard({
            balance: initialBalance,
            cryptoBalance: 0,
            currency: currency,
            isActive: true,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        hasCard[msg.sender] = true;
        totalCards++;

        emit CardCreated(msg.sender, currency, initialBalance);
    }

    /**
     * @notice Load funds to the travel card
     * @param amount Amount to load
     */
    function loadFunds(uint256 amount)
        external
        cardExists
        validAmount(amount)
        whenNotPaused
    {
        TravelCard storage card = cards[msg.sender];

        // Check for overflow
        uint256 newBalance = card.balance + amount;
        if (newBalance < card.balance) revert InvalidAmount();

        card.balance = newBalance;
        card.lastUpdated = block.timestamp;

        emit FundsLoaded(msg.sender, amount);
    }

    /**
     * @notice Convert fiat balance to crypto balance
     * @param amount Amount of fiat to convert
     */
    function convertToCrypto(uint256 amount)
        external
        cardExists
        validAmount(amount)
        nonReentrant
        whenNotPaused
    {
        TravelCard storage card = cards[msg.sender];

        if (card.balance < amount) revert InsufficientBalance();

        // Calculate crypto amount: fiat * conversionRate / 1e18
        uint256 cryptoAmount = (amount * conversionRate) / 1e18;
        if (cryptoAmount == 0) revert ConversionRateTooLow();

        // Check for overflow
        uint256 newCryptoBalance = card.cryptoBalance + cryptoAmount;
        if (newCryptoBalance < card.cryptoBalance) revert InvalidAmount();

        card.balance -= amount;
        card.cryptoBalance = newCryptoBalance;
        card.lastUpdated = block.timestamp;

        emit CryptoConverted(msg.sender, amount, cryptoAmount);
    }

    /**
     * @notice Create a travel card for a user (owner only)
     */
    function createCardFor(
        address user,
        string memory currency,
        uint256 initialBalance
    ) external onlyOwner validUser(user) validCurrency(currency) validAmount(initialBalance) whenNotPaused {
        if (hasCard[user]) revert CardAlreadyExists();

        cards[user] = TravelCard({
            balance: initialBalance,
            cryptoBalance: 0,
            currency: currency,
            isActive: true,
            createdAt: block.timestamp,
            lastUpdated: block.timestamp
        });

        hasCard[user] = true;
        totalCards++;

        emit CardCreated(user, currency, initialBalance);
    }

    /**
     * @notice Load funds for a user (owner only)
     */
    function loadFundsFor(address user, uint256 amount)
        external
        onlyOwner
        validUser(user)
        validAmount(amount)
        whenNotPaused
    {
        if (!hasCard[user]) revert CardNotFound();

        TravelCard storage card = cards[user];
        uint256 newBalance = card.balance + amount;
        if (newBalance < card.balance) revert InvalidAmount();

        card.balance = newBalance;
        card.lastUpdated = block.timestamp;

        emit FundsLoaded(user, amount);
    }

    /**
     * @notice Convert fiat to crypto for a user (owner only)
     */
    function convertToCryptoFor(address user, uint256 amount)
        external
        onlyOwner
        validUser(user)
        validAmount(amount)
        nonReentrant
        whenNotPaused
    {
        if (!hasCard[user]) revert CardNotFound();

        TravelCard storage card = cards[user];
        if (card.balance < amount) revert InsufficientBalance();

        uint256 cryptoAmount = (amount * conversionRate) / 1e18;
        if (cryptoAmount == 0) revert ConversionRateTooLow();

        uint256 newCryptoBalance = card.cryptoBalance + cryptoAmount;
        if (newCryptoBalance < card.cryptoBalance) revert InvalidAmount();

        card.balance -= amount;
        card.cryptoBalance = newCryptoBalance;
        card.lastUpdated = block.timestamp;

        emit CryptoConverted(user, amount, cryptoAmount);
    }

    /**
     * @notice Withdraw fiat funds from the card
     * @param amount Amount to withdraw
     */
    function withdrawFunds(uint256 amount)
        external
        cardExists
        validAmount(amount)
        nonReentrant
        whenNotPaused
    {
        TravelCard storage card = cards[msg.sender];

        if (card.balance < amount) revert InsufficientBalance();

        card.balance -= amount;
        card.lastUpdated = block.timestamp;

        emit FundsWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Change card currency
     * @param newCurrency New currency code
     */
    function changeCurrency(string memory newCurrency)
        external
        cardExists
        validCurrency(newCurrency)
        whenNotPaused
    {
        TravelCard storage card = cards[msg.sender];
        string memory oldCurrency = card.currency;

        card.currency = newCurrency;
        card.lastUpdated = block.timestamp;

        emit CurrencyChanged(msg.sender, oldCurrency, newCurrency);
    }

    /**
     * @notice Deactivate the travel card
     */
    function deactivateCard() external cardExists whenNotPaused {
        cards[msg.sender].isActive = false;
        cards[msg.sender].lastUpdated = block.timestamp;
    }

    /**
     * @notice Reactivate the travel card
     */
    function reactivateCard() external cardExists whenNotPaused {
        cards[msg.sender].isActive = true;
        cards[msg.sender].lastUpdated = block.timestamp;
    }

    // ============ View Functions ============

    /**
     * @notice Get card details for a user
     * @param user User address
     * @return Card details
     */
    function getCard(address user) external view returns (TravelCard memory) {
        if (!hasCard[user]) revert CardNotFound();
        return cards[user];
    }

    /**
     * @notice Get balance for a user
     * @param user User address
     * @return fiatBalance Fiat balance
     * @return cryptoBalance Crypto balance
     */
    function getBalance(address user) external view returns (uint256 fiatBalance, uint256 cryptoBalance) {
        if (!hasCard[user]) revert CardNotFound();
        TravelCard memory card = cards[user];
        return (card.balance, card.cryptoBalance);
    }

    /**
     * @notice Check if user has a card
     * @param user User address
     * @return True if user has a card
     */
    function checkCardExists(address user) external view returns (bool) {
        return hasCard[user];
    }

    /**
     * @notice Get conversion rate
     * @return Current conversion rate
     */
    function getConversionRate() external view returns (uint256) {
        return conversionRate;
    }

    /**
     * @notice Calculate crypto amount for given fiat
     * @param fiatAmount Fiat amount
     * @return Crypto amount
     */
    function calculateCryptoAmount(uint256 fiatAmount) external view returns (uint256) {
        return (fiatAmount * conversionRate) / 1e18;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update conversion rate (owner only)
     * @param newRate New conversion rate
     */
    function updateConversionRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert InvalidAmount();
        conversionRate = newRate;
    }

    /**
     * @notice Add supported currency (owner only)
     * @param currency Currency code
     */
    function addSupportedCurrency(string memory currency) external onlyOwner {
        supportedCurrencies[currency] = true;
    }

    /**
     * @notice Remove supported currency (owner only)
     * @param currency Currency code
     */
    function removeSupportedCurrency(string memory currency) external onlyOwner {
        supportedCurrencies[currency] = false;
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
