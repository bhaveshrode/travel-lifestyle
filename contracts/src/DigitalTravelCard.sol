// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
    error InvalidCurrency();
    error ConversionRateTooLow();

    // ============ Structs ============

    struct TravelCard {
        uint256 balance;
        uint256 cryptoBalance;
        string currency;
        bool isActive;
        uint256 createdAt;
        uint256 lastUpdated;
    }

    // ============ State Variables ============

    mapping(address => TravelCard) public cards;
    mapping(address => bool) public hasCard;
    uint256 public conversionRate = 10 * 1e18;
    mapping(string => bool) public supportedCurrencies;
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

    // ============ Public Functions ============

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

    function loadFunds(uint256 amount)
        external
        cardExists
        validAmount(amount)
        whenNotPaused
    {
        TravelCard storage card = cards[msg.sender];

        uint256 newBalance = card.balance + amount;
        if (newBalance < card.balance) revert InvalidAmount();

        card.balance = newBalance;
        card.lastUpdated = block.timestamp;

        emit FundsLoaded(msg.sender, amount);
    }

    function convertToCrypto(uint256 amount)
        external
        cardExists
        validAmount(amount)
        nonReentrant
        whenNotPaused
    {
        TravelCard storage card = cards[msg.sender];

        if (card.balance < amount) revert InsufficientBalance();

        uint256 cryptoAmount = (amount * conversionRate) / 1e18;
        if (cryptoAmount == 0) revert ConversionRateTooLow();

        uint256 newCryptoBalance = card.cryptoBalance + cryptoAmount;
        if (newCryptoBalance < card.cryptoBalance) revert InvalidAmount();

        card.balance -= amount;
        card.cryptoBalance = newCryptoBalance;
        card.lastUpdated = block.timestamp;

        emit CryptoConverted(msg.sender, amount, cryptoAmount);
    }

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

    function deactivateCard() external cardExists whenNotPaused {
        cards[msg.sender].isActive = false;
        cards[msg.sender].lastUpdated = block.timestamp;
    }

    function reactivateCard() external cardExists whenNotPaused {
        cards[msg.sender].isActive = true;
        cards[msg.sender].lastUpdated = block.timestamp;
    }

    // ============ View Functions ============

    function getCard(address user) external view returns (TravelCard memory) {
        if (!hasCard[user]) revert CardNotFound();
        return cards[user];
    }

    function getBalance(address user) external view returns (uint256 fiatBalance, uint256 cryptoBalance) {
        if (!hasCard[user]) revert CardNotFound();
        TravelCard memory card = cards[user];
        return (card.balance, card.cryptoBalance);
    }

    function checkCardExists(address user) external view returns (bool) {
        return hasCard[user];
    }

    function getConversionRate() external view returns (uint256) {
        return conversionRate;
    }

    function calculateCryptoAmount(uint256 fiatAmount) external view returns (uint256) {
        return (fiatAmount * conversionRate) / 1e18;
    }

    // ============ Admin Functions ============

    function updateConversionRate(uint256 newRate) external onlyOwner {
        if (newRate == 0) revert InvalidAmount();
        conversionRate = newRate;
    }

    function addSupportedCurrency(string memory currency) external onlyOwner {
        supportedCurrencies[currency] = true;
    }

    function removeSupportedCurrency(string memory currency) external onlyOwner {
        supportedCurrencies[currency] = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
