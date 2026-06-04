/// Module: digital_travel_card
///
/// Manages multi-currency travel cards with cryptocurrency integration.
/// Users can create cards, load fiat currency, and convert to crypto.
///
/// # Features
/// - Multi-currency support (USD, EUR, GBP, etc.)
/// - Real-time crypto conversion
/// - Balance tracking for both fiat and crypto
///
/// # Security
/// - Only card owner can modify balances
/// - Overflow protection on all arithmetic operations
/// - Currency code validation
module travel_lifestyle::digital_travel_card {
    use std::vector;
    use std::signer;

    // Error constants
    const ERROR_CARD_ALREADY_EXISTS: u64 = 1;
    const ERROR_CARD_NOT_FOUND: u64 = 2;
    const ERROR_INSUFFICIENT_BALANCE: u64 = 3;
    const ERROR_INVALID_CURRENCY: u64 = 4;
    const ERROR_BALANCE_OVERFLOW: u64 = 5;
    const ERROR_INVALID_AMOUNT: u64 = 6;
    const ERROR_BALANCE_TOO_LOW: u64 = 7;

    // Configuration constants
    const MIN_BALANCE: u64 = 0;
    const MAX_U64: u64 = 18446744073709551615;

    /// Represents a digital travel card with fiat and crypto balances.
    ///
    /// # Fields
    /// - `balance`: Current fiat currency balance
    /// - `currency`: 3-letter currency code (ISO 4217)
    /// - `crypto_balance`: Current cryptocurrency balance
    ///
    /// # Abilities
    /// - `key`: Can be stored in global storage
    struct TravelCard has key {
        balance: u64,
        currency: vector<u8>,
        crypto_balance: u64,
    }

    /// Creates a new travel card for the account.
    ///
    /// # Parameters
    /// - `account`: Signer creating the card
    /// - `initial_balance`: Starting fiat balance (must be >= MIN_BALANCE)
    /// - `currency`: 3-letter currency code (e.g., b"USD")
    ///
    /// # Aborts
    /// - `ERROR_CARD_ALREADY_EXISTS`: If account already has a card
    /// - `ERROR_INVALID_CURRENCY`: If currency code is not 3 letters
    /// - `ERROR_BALANCE_TOO_LOW`: If initial_balance < MIN_BALANCE
    ///
    /// # Examples
    /// ```move
    /// create_card(&signer, 1000, b"USD");
    /// ```
    public fun create_card(account: &signer, initial_balance: u64, currency: vector<u8>) {
        let addr = signer::address_of(account);

        // Validate card doesn't already exist
        assert!(!exists<TravelCard>(addr), ERROR_CARD_ALREADY_EXISTS);

        // Validate currency code (must be 3 letters)
        assert!(vector::length(&currency) == 3, ERROR_INVALID_CURRENCY);

        // Validate initial balance
        assert!(initial_balance >= MIN_BALANCE, ERROR_BALANCE_TOO_LOW);

        let card = TravelCard {
            balance: initial_balance,
            currency,
            crypto_balance: 0
        };
        move_to(account, card);
    }

    /// Loads funds into the travel card.
    ///
    /// # Parameters
    /// - `account`: Signer who owns the card
    /// - `amount`: Amount to add to the balance
    ///
    /// # Aborts
    /// - `ERROR_CARD_NOT_FOUND`: If card doesn't exist for this account
    /// - `ERROR_INVALID_AMOUNT`: If amount is 0
    /// - `ERROR_BALANCE_OVERFLOW`: If adding amount would overflow u64
    public fun load_funds(account: &signer, amount: u64) acquires TravelCard {
        let addr = signer::address_of(account);

        // Validate card exists
        assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);

        // Validate amount
        assert!(amount > 0, ERROR_INVALID_AMOUNT);

        let card = borrow_global_mut<TravelCard>(addr);

        // Prevent overflow
        assert!(
            card.balance <= MAX_U64 - amount,
            ERROR_BALANCE_OVERFLOW
        );

        card.balance = card.balance + amount;
    }

    /// Converts fiat balance to cryptocurrency balance.
    ///
    /// # Parameters
    /// - `account`: Signer who owns the card
    /// - `amount`: Amount of fiat to convert
    ///
    /// # Aborts
    /// - `ERROR_CARD_NOT_FOUND`: If card doesn't exist
    /// - `ERROR_INVALID_AMOUNT`: If amount is 0
    /// - `ERROR_INSUFFICIENT_BALANCE`: If card balance < amount
    /// - `ERROR_BALANCE_OVERFLOW`: If crypto balance would overflow
    public fun convert_to_crypto(account: &signer, amount: u64) acquires TravelCard {
        let addr = signer::address_of(account);

        // Validate card exists
        assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);

        // Validate amount
        assert!(amount > 0, ERROR_INVALID_AMOUNT);

        let card = borrow_global_mut<TravelCard>(addr);

        // Ensure sufficient balance
        assert!(card.balance >= amount, ERROR_INSUFFICIENT_BALANCE);

        // Prevent overflow on crypto balance
        assert!(
            card.crypto_balance <= MAX_U64 - amount,
            ERROR_BALANCE_OVERFLOW
        );

        card.balance = card.balance - amount;
        card.crypto_balance = card.crypto_balance + amount;
    }

    /// Gets the fiat balance for an address.
    ///
    /// # Parameters
    /// - `addr`: Address to query
    ///
    /// # Returns
    /// The fiat balance
    ///
    /// # Aborts
    /// - `ERROR_CARD_NOT_FOUND`: If card doesn't exist
    public fun get_balance(addr: address): u64 acquires TravelCard {
        assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);
        let card = borrow_global<TravelCard>(addr);
        card.balance
    }

    /// Gets the crypto balance for an address.
    ///
    /// # Parameters
    /// - `addr`: Address to query
    ///
    /// # Returns
    /// The crypto balance
    ///
    /// # Aborts
    /// - `ERROR_CARD_NOT_FOUND`: If card doesn't exist
    public fun get_crypto_balance(addr: address): u64 acquires TravelCard {
        assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);
        let card = borrow_global<TravelCard>(addr);
        card.crypto_balance
    }

    /// Gets the currency code for an address.
    ///
    /// # Parameters
    /// - `addr`: Address to query
    ///
    /// # Returns
    /// The currency code
    ///
    /// # Aborts
    /// - `ERROR_CARD_NOT_FOUND`: If card doesn't exist
    public fun get_currency(addr: address): vector<u8> acquires TravelCard {
        assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);
        let card = borrow_global<TravelCard>(addr);
        card.currency
    }

    /// Checks if an account has a travel card.
    ///
    /// # Parameters
    /// - `addr`: Address to check
    ///
    /// # Returns
    /// true if card exists, false otherwise
    public fun has_card(addr: address): bool {
        exists<TravelCard>(addr)
    }

    #[test_only]
    public fun destroy_card_for_test(account: &signer) acquires TravelCard {
        let addr = signer::address_of(account);
        if (exists<TravelCard>(addr)) {
            let TravelCard { balance: _, currency: _, crypto_balance: _ } =
                move_from<TravelCard>(addr);
        }
    }
}
