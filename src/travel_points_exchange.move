/// Module: travel_points_exchange
///
/// Manages loyalty points to cryptocurrency exchange system.
/// Users can convert travel loyalty points to crypto tokens.
///
/// # Features
/// - Create exchange accounts with initial points and crypto balance
/// - Swap loyalty points for cryptocurrency
/// - Query exchange balances
/// - Configurable exchange rates
///
/// # Security
/// - Only account owner can perform exchanges
/// - Validation of sufficient points before swap
/// - Overflow protection on all arithmetic
/// - Exchange rate enforcement
module travel_lifestyle::travel_points_exchange {
    use std::signer;

    // Error constants
    const ERROR_EXCHANGE_ALREADY_EXISTS: u64 = 1;
    const ERROR_EXCHANGE_NOT_FOUND: u64 = 2;
    const ERROR_INSUFFICIENT_POINTS: u64 = 3;
    const ERROR_INVALID_POINTS: u64 = 4;
    const ERROR_INVALID_CRYPTO_VALUE: u64 = 5;
    const ERROR_CRYPTO_OVERFLOW: u64 = 6;
    const ERROR_INVALID_SWAP_AMOUNT: u64 = 7;
    const ERROR_RATE_NOT_INITIALIZED: u64 = 8;

    // Configuration constants
    const MIN_POINTS: u64 = 1;
    const MIN_CRYPTO_VALUE: u64 = 0;
    const MAX_U64: u64 = 18446744073709551615;
    const DEFAULT_POINTS_PER_CRYPTO: u64 = 100; // 100 points = 1 crypto unit

    /// Represents a points exchange account.
    ///
    /// # Fields
    /// - `points`: Current loyalty points balance
    /// - `crypto_value`: Current cryptocurrency balance
    ///
    /// # Abilities
    /// - `key`: Can be stored in global storage
    struct PointsExchange has key {
        points: u64,
        crypto_value: u64,
    }

    /// Global exchange rate configuration.
    ///
    /// # Fields
    /// - `points_per_crypto`: How many points equal 1 crypto unit
    ///
    /// # Abilities
    /// - `key`: Can be stored in global storage
    struct ExchangeRate has key {
        points_per_crypto: u64,
    }

    /// Initializes the global exchange rate (admin function).
    ///
    /// # Parameters
    /// - `admin`: Signer with authority to set rate
    /// - `points_per_crypto`: Exchange rate (points needed for 1 crypto)
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_ALREADY_EXISTS`: If rate already initialized
    /// - `ERROR_INVALID_POINTS`: If rate is 0
    public fun initialize_exchange_rate(admin: &signer, points_per_crypto: u64) {
        let addr = signer::address_of(admin);

        // Validate rate doesn't already exist
        assert!(!exists<ExchangeRate>(addr), ERROR_EXCHANGE_ALREADY_EXISTS);

        // Validate rate is non-zero
        assert!(points_per_crypto > 0, ERROR_INVALID_POINTS);

        let rate = ExchangeRate {
            points_per_crypto,
        };
        move_to(admin, rate);
    }

    /// Creates a new points exchange account.
    ///
    /// # Parameters
    /// - `account`: Signer creating the exchange
    /// - `points`: Initial points balance
    /// - `crypto_value`: Initial crypto balance
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_ALREADY_EXISTS`: If account already has an exchange
    /// - `ERROR_INVALID_POINTS`: If points < MIN_POINTS
    /// - `ERROR_INVALID_CRYPTO_VALUE`: If crypto_value < MIN_CRYPTO_VALUE
    ///
    /// # Examples
    /// ```move
    /// create_exchange(&signer, 1000, 0);
    /// ```
    public fun create_exchange(account: &signer, points: u64, crypto_value: u64) {
        let addr = signer::address_of(account);

        // Validate exchange doesn't already exist
        assert!(!exists<PointsExchange>(addr), ERROR_EXCHANGE_ALREADY_EXISTS);

        // Validate points
        assert!(points >= MIN_POINTS, ERROR_INVALID_POINTS);

        // Validate crypto value
        assert!(crypto_value >= MIN_CRYPTO_VALUE, ERROR_INVALID_CRYPTO_VALUE);

        let exchange = PointsExchange {
            points,
            crypto_value,
        };
        move_to(account, exchange);
    }

    /// Swaps loyalty points for cryptocurrency.
    ///
    /// # Parameters
    /// - `account`: Signer performing the swap
    /// - `points_to_swap`: Amount of points to convert
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_NOT_FOUND`: If exchange doesn't exist
    /// - `ERROR_INVALID_SWAP_AMOUNT`: If points_to_swap is 0
    /// - `ERROR_INSUFFICIENT_POINTS`: If not enough points available
    /// - `ERROR_CRYPTO_OVERFLOW`: If resulting crypto balance would overflow
    ///
    /// # Note
    /// Uses default exchange rate if no custom rate is set
    public fun swap_points(account: &signer, points_to_swap: u64) acquires PointsExchange {
        let addr = signer::address_of(account);

        // Validate exchange exists
        assert!(exists<PointsExchange>(addr), ERROR_EXCHANGE_NOT_FOUND);

        // Validate swap amount
        assert!(points_to_swap > 0, ERROR_INVALID_SWAP_AMOUNT);

        let exchange = borrow_global_mut<PointsExchange>(addr);

        // Validate sufficient points
        assert!(exchange.points >= points_to_swap, ERROR_INSUFFICIENT_POINTS);

        // Calculate crypto value using default rate
        // Using integer division: crypto = points / rate
        let crypto_earned = points_to_swap / DEFAULT_POINTS_PER_CRYPTO;

        // Validate no overflow on crypto balance
        assert!(
            exchange.crypto_value <= MAX_U64 - crypto_earned,
            ERROR_CRYPTO_OVERFLOW
        );

        // Perform swap
        exchange.points = exchange.points - points_to_swap;
        exchange.crypto_value = exchange.crypto_value + crypto_earned;
    }

    /// Swaps points using a custom exchange rate.
    ///
    /// # Parameters
    /// - `account`: Signer performing the swap
    /// - `points_to_swap`: Amount of points to convert
    /// - `rate_owner`: Address that owns the exchange rate config
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_NOT_FOUND`: If exchange doesn't exist
    /// - `ERROR_RATE_NOT_INITIALIZED`: If rate owner doesn't have rate set
    /// - `ERROR_INVALID_SWAP_AMOUNT`: If points_to_swap is 0
    /// - `ERROR_INSUFFICIENT_POINTS`: If not enough points available
    /// - `ERROR_CRYPTO_OVERFLOW`: If resulting crypto balance would overflow
    public fun swap_points_with_rate(
        account: &signer,
        points_to_swap: u64,
        rate_owner: address
    ) acquires PointsExchange, ExchangeRate {
        let addr = signer::address_of(account);

        // Validate exchange exists
        assert!(exists<PointsExchange>(addr), ERROR_EXCHANGE_NOT_FOUND);

        // Validate rate exists
        assert!(exists<ExchangeRate>(rate_owner), ERROR_RATE_NOT_INITIALIZED);

        // Validate swap amount
        assert!(points_to_swap > 0, ERROR_INVALID_SWAP_AMOUNT);

        let exchange = borrow_global_mut<PointsExchange>(addr);
        let rate_config = borrow_global<ExchangeRate>(rate_owner);

        // Validate sufficient points
        assert!(exchange.points >= points_to_swap, ERROR_INSUFFICIENT_POINTS);

        // Calculate crypto value using custom rate
        let crypto_earned = points_to_swap / rate_config.points_per_crypto;

        // Validate no overflow on crypto balance
        assert!(
            exchange.crypto_value <= MAX_U64 - crypto_earned,
            ERROR_CRYPTO_OVERFLOW
        );

        // Perform swap
        exchange.points = exchange.points - points_to_swap;
        exchange.crypto_value = exchange.crypto_value + crypto_earned;
    }

    /// Adds loyalty points to an account.
    ///
    /// # Parameters
    /// - `account`: Signer receiving points
    /// - `points_to_add`: Amount of points to add
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_NOT_FOUND`: If exchange doesn't exist
    /// - `ERROR_INVALID_POINTS`: If points_to_add is 0
    /// - `ERROR_CRYPTO_OVERFLOW`: If resulting points would overflow
    public fun add_points(account: &signer, points_to_add: u64) acquires PointsExchange {
        let addr = signer::address_of(account);

        // Validate exchange exists
        assert!(exists<PointsExchange>(addr), ERROR_EXCHANGE_NOT_FOUND);

        // Validate points amount
        assert!(points_to_add > 0, ERROR_INVALID_POINTS);

        let exchange = borrow_global_mut<PointsExchange>(addr);

        // Validate no overflow
        assert!(
            exchange.points <= MAX_U64 - points_to_add,
            ERROR_CRYPTO_OVERFLOW
        );

        exchange.points = exchange.points + points_to_add;
    }

    /// Gets the points balance for an address.
    ///
    /// # Parameters
    /// - `addr`: Address to query
    ///
    /// # Returns
    /// The points balance
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_NOT_FOUND`: If exchange doesn't exist
    public fun get_points(addr: address): u64 acquires PointsExchange {
        assert!(exists<PointsExchange>(addr), ERROR_EXCHANGE_NOT_FOUND);
        let exchange = borrow_global<PointsExchange>(addr);
        exchange.points
    }

    /// Gets the crypto value for an address.
    ///
    /// # Parameters
    /// - `addr`: Address to query
    ///
    /// # Returns
    /// The crypto balance
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_NOT_FOUND`: If exchange doesn't exist
    public fun get_crypto_value(addr: address): u64 acquires PointsExchange {
        assert!(exists<PointsExchange>(addr), ERROR_EXCHANGE_NOT_FOUND);
        let exchange = borrow_global<PointsExchange>(addr);
        exchange.crypto_value
    }

    /// Gets both balances for an address.
    ///
    /// # Parameters
    /// - `addr`: Address to query
    ///
    /// # Returns
    /// Tuple of (points, crypto_value)
    ///
    /// # Aborts
    /// - `ERROR_EXCHANGE_NOT_FOUND`: If exchange doesn't exist
    public fun get_balances(addr: address): (u64, u64) acquires PointsExchange {
        assert!(exists<PointsExchange>(addr), ERROR_EXCHANGE_NOT_FOUND);
        let exchange = borrow_global<PointsExchange>(addr);
        (exchange.points, exchange.crypto_value)
    }

    /// Gets the current exchange rate from a rate owner.
    ///
    /// # Parameters
    /// - `rate_owner`: Address that owns the rate config
    ///
    /// # Returns
    /// The exchange rate (points per crypto unit)
    ///
    /// # Aborts
    /// - `ERROR_RATE_NOT_INITIALIZED`: If rate not set
    public fun get_exchange_rate(rate_owner: address): u64 acquires ExchangeRate {
        assert!(exists<ExchangeRate>(rate_owner), ERROR_RATE_NOT_INITIALIZED);
        let rate = borrow_global<ExchangeRate>(rate_owner);
        rate.points_per_crypto
    }

    /// Checks if an account has a points exchange.
    ///
    /// # Parameters
    /// - `addr`: Address to check
    ///
    /// # Returns
    /// true if exchange exists, false otherwise
    public fun has_exchange(addr: address): bool {
        exists<PointsExchange>(addr)
    }

    /// Checks if an exchange rate is configured.
    ///
    /// # Parameters
    /// - `addr`: Address to check
    ///
    /// # Returns
    /// true if rate exists, false otherwise
    public fun has_rate(addr: address): bool {
        exists<ExchangeRate>(addr)
    }

    #[test_only]
    public fun destroy_exchange_for_test(account: &signer) acquires PointsExchange {
        let addr = signer::address_of(account);
        if (exists<PointsExchange>(addr)) {
            let PointsExchange { points: _, crypto_value: _ } =
                move_from<PointsExchange>(addr);
        }
    }

    #[test_only]
    public fun destroy_rate_for_test(account: &signer) acquires ExchangeRate {
        let addr = signer::address_of(account);
        if (exists<ExchangeRate>(addr)) {
            let ExchangeRate { points_per_crypto: _ } = move_from<ExchangeRate>(addr);
        }
    }
}
