# CLAUDE.md - Move Language Coding Standards

## Project: Travel & Lifestyle Blockchain Application

This document defines coding standards, architectural patterns, and best practices for this Move-based travel and lifestyle application.

---

## Table of Contents
1. [Project Architecture](#project-architecture)
2. [Move Language Standards](#move-language-standards)
3. [Security Requirements](#security-requirements)
4. [Resource Management](#resource-management)
5. [Error Handling](#error-handling)
6. [Testing Standards](#testing-standards)
7. [Documentation Requirements](#documentation-requirements)

---

## Project Architecture

### Module Organization
- **One concern per module**: Each module should handle a single domain concept
- **Current modules**:
  - `travel_points_exchange` - Loyalty points to crypto conversion
  - `digital_travel_card` - Multi-currency travel card with crypto integration
  - `experience_nfts` - Tokenized travel experiences

### Dependency Structure
```
travel_lifestyle/
├── src/
│   ├── travel_points_exchange.move    # Core points system
│   ├── digital_travel_card.move       # Card management
│   └── experience_nfts.move           # NFT experiences
└── move.toml                          # Package configuration
```

### Module Naming Convention
- Use snake_case for module names: `travel_points_exchange`
- Module addresses should follow pattern: `travel_lifestyle::{module_name}`

---

## Move Language Standards

### 1. Resource Management

#### Resource Definition
```move
// ✅ CORRECT: Use 'has key' for account-level resources
struct TravelCard has key {
    balance: u64,
    currency: vector<u8>,
    crypto_balance: u64,
}

// ✅ CORRECT: Use 'has key, store' for transferable resources
struct ExperienceNFT has key, store {
    id: u64,
    owner: address,
    description: vector<u8>,
    price: u64,
}
```

#### Resource Borrowing
```move
// ✅ CORRECT: Use signer::address_of() to get address
use std::signer;

public fun load_funds(account: &signer, amount: u64) acquires TravelCard {
    let addr = signer::address_of(account);
    let card = borrow_global_mut<TravelCard>(addr);
    card.balance = card.balance + amount;
}

// ❌ INCORRECT: Don't pass signer directly to borrow_global_mut
let card = borrow_global_mut<TravelCard>(signer);  // WRONG!
```

#### Resource Storage
```move
// ✅ CORRECT: Use move_to with proper resource initialization
public fun create_card(account: &signer, initial_balance: u64, currency: vector<u8>) {
    let card = TravelCard {
        balance: initial_balance,
        currency,
        crypto_balance: 0
    };
    move_to(account, card);
}
```

### 2. Function Visibility

#### Public Functions
```move
// Use 'public' for external-facing functions
public fun create_exchange(account: &signer, points: u64, crypto_value: u64) { }

// Use 'public entry' for transaction entry points (if supported)
public entry fun swap_points_entry(account: &signer, points: u64) { }
```

#### Private Helper Functions
```move
// Use no modifier for internal-only functions
fun validate_currency(currency: &vector<u8>): bool {
    // Internal validation logic
    true
}
```

### 3. Type Safety

#### Use Proper Types
```move
// ✅ CORRECT: Define currency as a proper type
struct Currency has copy, drop, store {
    code: vector<u8>,  // e.g., b"USD", b"EUR"
}

// ❌ AVOID: Raw vector<u8> for important business types
currency: vector<u8>  // Less type-safe
```

#### Constants for Configuration
```move
// ✅ CORRECT: Use constants for fixed values
const ERROR_INSUFFICIENT_BALANCE: u64 = 1;
const ERROR_INVALID_CURRENCY: u64 = 2;
const ERROR_UNAUTHORIZED: u64 = 3;

const MIN_BALANCE: u64 = 10;
const MAX_POINTS_PER_SWAP: u64 = 10000;
```

### 4. Acquire Annotations

```move
// ✅ CORRECT: Always annotate functions that access global resources
public fun load_funds(account: &signer, amount: u64) acquires TravelCard {
    let addr = signer::address_of(account);
    let card = borrow_global_mut<TravelCard>(addr);
    card.balance = card.balance + amount;
}
```

---

## Security Requirements

### 1. Authorization Checks

```move
// ✅ CORRECT: Verify signer owns the resource
public fun convert_to_crypto(account: &signer, amount: u64) acquires TravelCard {
    let addr = signer::address_of(account);
    assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);

    let card = borrow_global_mut<TravelCard>(addr);
    assert!(card.balance >= amount, ERROR_INSUFFICIENT_BALANCE);

    card.balance = card.balance - amount;
    card.crypto_balance = card.crypto_balance + amount;
}
```

### 2. Input Validation

```move
// ✅ CORRECT: Validate all inputs
public fun create_card(
    account: &signer,
    initial_balance: u64,
    currency: vector<u8>
) {
    // Validate currency code
    assert!(vector::length(&currency) == 3, ERROR_INVALID_CURRENCY);

    // Validate balance bounds
    assert!(initial_balance >= MIN_BALANCE, ERROR_BALANCE_TOO_LOW);
    assert!(initial_balance <= MAX_BALANCE, ERROR_BALANCE_TOO_HIGH);

    let card = TravelCard {
        balance: initial_balance,
        currency,
        crypto_balance: 0
    };
    move_to(account, card);
}
```

### 3. Overflow Protection

```move
// ✅ CORRECT: Check for overflows in arithmetic
public fun load_funds(account: &signer, amount: u64) acquires TravelCard {
    let addr = signer::address_of(account);
    let card = borrow_global_mut<TravelCard>(addr);

    // Prevent overflow
    assert!(
        card.balance <= MAX_U64 - amount,
        ERROR_BALANCE_OVERFLOW
    );

    card.balance = card.balance + amount;
}
```

### 4. Resource Existence Checks

```move
// ✅ CORRECT: Always check resource existence
public fun get_balance(addr: address): u64 acquires TravelCard {
    assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);
    let card = borrow_global<TravelCard>(addr);
    card.balance
}
```

---

## Resource Management

### 1. NFT Transfer Pattern

```move
// ✅ CORRECT: Use proper transfer mechanism for NFTs with 'store' ability
struct ExperienceNFT has key, store {
    id: u64,
    description: vector<u8>,
    price: u64,
}

// Use a collection/table for managing multiple NFTs
use aptos_std::table::{Self, Table};

struct NFTCollection has key {
    nfts: Table<u64, ExperienceNFT>,
    next_id: u64,
}

public fun transfer_nft(
    from: &signer,
    to: address,
    nft_id: u64
) acquires NFTCollection {
    let from_addr = signer::address_of(from);
    let collection = borrow_global_mut<NFTCollection>(from_addr);

    // Remove from sender
    assert!(table::contains(&collection.nfts, nft_id), ERROR_NFT_NOT_FOUND);
    let nft = table::remove(&mut collection.nfts, nft_id);

    // Add to receiver
    if (!exists<NFTCollection>(to)) {
        move_to_recipient(to, NFTCollection {
            nfts: table::new(),
            next_id: 0,
        });
    };

    let to_collection = borrow_global_mut<NFTCollection>(to);
    table::add(&mut to_collection.nfts, nft_id, nft);
}
```

### 2. Resource Cleanup

```move
// ✅ CORRECT: Provide cleanup functions for resources
public fun destroy_card(account: &signer) acquires TravelCard {
    let addr = signer::address_of(account);
    assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);

    let TravelCard {
        balance: _,
        currency: _,
        crypto_balance: _
    } = move_from<TravelCard>(addr);

    // Resources are automatically dropped
}
```

---

## Error Handling

### 1. Error Code Standards

```move
// Define all error codes as constants at module level
const ERROR_INSUFFICIENT_BALANCE: u64 = 1;
const ERROR_INVALID_CURRENCY: u64 = 2;
const ERROR_UNAUTHORIZED: u64 = 3;
const ERROR_CARD_NOT_FOUND: u64 = 4;
const ERROR_NFT_NOT_FOUND: u64 = 5;
const ERROR_INVALID_PRICE: u64 = 6;
const ERROR_BALANCE_OVERFLOW: u64 = 7;
const ERROR_BALANCE_TOO_LOW: u64 = 8;
const ERROR_BALANCE_TOO_HIGH: u64 = 9;
const ERROR_INVALID_POINTS: u64 = 10;

// Use descriptive error messages in assertions
assert!(card.balance >= amount, ERROR_INSUFFICIENT_BALANCE);
```

### 2. Assertion Best Practices

```move
// ✅ CORRECT: Use specific error codes
assert!(exists<TravelCard>(addr), ERROR_CARD_NOT_FOUND);

// ❌ INCORRECT: Generic error code
assert!(exists<TravelCard>(addr), 1);  // What does 1 mean?
```

---

## Testing Standards

### 1. Unit Test Structure

```move
#[test_only]
use std::signer;

#[test(account = @0x1)]
public fun test_create_card(account: &signer) {
    create_card(account, 1000, b"USD");

    let addr = signer::address_of(account);
    assert!(exists<TravelCard>(addr), 0);
}

#[test(account = @0x1)]
#[expected_failure(abort_code = ERROR_INSUFFICIENT_BALANCE)]
public fun test_convert_insufficient_balance(account: &signer) acquires TravelCard {
    create_card(account, 100, b"USD");
    convert_to_crypto(account, 200);  // Should fail
}
```

### 2. Test Coverage Requirements

- **All public functions** must have at least one test
- **Error paths** must have expected_failure tests
- **Edge cases** must be tested (overflow, underflow, boundary values)
- **Integration tests** between modules for cross-module functionality

---

## Documentation Requirements

### 1. Module Documentation

```move
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
    // Module contents
}
```

### 2. Function Documentation

```move
/// Creates a new travel card for the account.
///
/// # Parameters
/// - `account`: Signer creating the card
/// - `initial_balance`: Starting fiat balance (must be >= MIN_BALANCE)
/// - `currency`: 3-letter currency code (e.g., b"USD")
///
/// # Aborts
/// - `ERROR_INVALID_CURRENCY`: If currency code is not 3 letters
/// - `ERROR_BALANCE_TOO_LOW`: If initial_balance < MIN_BALANCE
/// - `ERROR_BALANCE_TOO_HIGH`: If initial_balance > MAX_BALANCE
///
/// # Examples
/// ```move
/// create_card(&signer, 1000, b"USD");
/// ```
public fun create_card(
    account: &signer,
    initial_balance: u64,
    currency: vector<u8>
) {
    // Implementation
}
```

### 3. Struct Documentation

```move
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
```

---

## Event Emission Standards

### 1. Event Definitions

```move
use std::event;

struct CardCreatedEvent has drop, store {
    owner: address,
    initial_balance: u64,
    currency: vector<u8>,
}

struct FundsLoadedEvent has drop, store {
    owner: address,
    amount: u64,
    new_balance: u64,
}

struct CryptoConversionEvent has drop, store {
    owner: address,
    fiat_amount: u64,
    crypto_amount: u64,
}
```

### 2. Event Emission

```move
// Store event handle in resource
struct TravelCard has key {
    balance: u64,
    currency: vector<u8>,
    crypto_balance: u64,
    card_events: event::EventHandle<CardEvent>,
}

// Emit events for all state changes
public fun convert_to_crypto(
    account: &signer,
    amount: u64
) acquires TravelCard {
    let addr = signer::address_of(account);
    let card = borrow_global_mut<TravelCard>(addr);

    assert!(card.balance >= amount, ERROR_INSUFFICIENT_BALANCE);

    card.balance = card.balance - amount;
    card.crypto_balance = card.crypto_balance + amount;

    // Emit event
    event::emit_event(
        &mut card.card_events,
        CryptoConversionEvent {
            owner: addr,
            fiat_amount: amount,
            crypto_amount: amount,
        }
    );
}
```

---

## Code Style Guidelines

### 1. Naming Conventions

- **Modules**: `snake_case` (e.g., `digital_travel_card`)
- **Structs**: `PascalCase` (e.g., `TravelCard`, `ExperienceNFT`)
- **Functions**: `snake_case` (e.g., `create_card`, `load_funds`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `ERROR_INSUFFICIENT_BALANCE`)
- **Variables**: `snake_case` (e.g., `card_balance`, `nft_id`)

### 2. Formatting

- **Indentation**: 4 spaces (no tabs)
- **Line length**: Maximum 100 characters
- **Braces**: Opening brace on same line
- **Blank lines**: One blank line between functions

```move
// ✅ CORRECT formatting
public fun create_exchange(
    account: &signer,
    points: u64,
    crypto_value: u64
) {
    let exchange = PointsExchange {
        points,
        crypto_value
    };
    move_to(account, exchange);
}
```

### 3. Import Organization

```move
// Standard library imports first
use std::signer;
use std::vector;
use std::option::{Self, Option};

// Framework imports second
use aptos_framework::account;
use aptos_framework::coin;
use aptos_framework::event;

// Local imports last
use travel_lifestyle::utils;
```

---

## Business Logic Standards

### 1. Exchange Rate Implementation

```move
// Define exchange rate structure
struct ExchangeRate has key {
    points_per_crypto: u64,  // How many points = 1 crypto unit
    last_updated: u64,       // Timestamp of last update
}

// Implement conversion with proper rate
public fun swap_points(
    account: &signer,
    points_to_swap: u64
) acquires PointsExchange, ExchangeRate {
    let addr = signer::address_of(account);
    let exchange = borrow_global_mut<PointsExchange>(addr);
    let rate = borrow_global<ExchangeRate>(@travel_lifestyle);

    assert!(exchange.points >= points_to_swap, ERROR_INSUFFICIENT_POINTS);

    // Calculate crypto value based on rate
    let crypto_value = points_to_swap / rate.points_per_crypto;

    exchange.points = exchange.points - points_to_swap;
    exchange.crypto_value = exchange.crypto_value + crypto_value;
}
```

### 2. Currency Validation

```move
// Define supported currencies
const SUPPORTED_CURRENCIES: vector<vector<u8>> = vector[
    b"USD",
    b"EUR",
    b"GBP",
    b"JPY",
];

fun is_valid_currency(currency: &vector<u8>): bool {
    vector::length(currency) == 3 &&
    vector::contains(&SUPPORTED_CURRENCIES, currency)
}
```

---

## Deployment Checklist

Before deploying any module:

- [ ] All functions have documentation comments
- [ ] All public functions have unit tests
- [ ] All error codes are defined as constants
- [ ] All resources have proper abilities (`key`, `store`, etc.)
- [ ] All arithmetic operations check for overflow
- [ ] All resource accesses have `acquires` annotations
- [ ] All events are properly emitted
- [ ] Security review completed
- [ ] Integration tests pass
- [ ] Gas optimization reviewed

---

## References

- [Move Language Book](https://move-language.github.io/move/)
- [Aptos Move Documentation](https://aptos.dev/move/move-on-aptos/)
- [Move Prover Guide](https://github.com/move-language/move/tree/main/language/move-prover)

---

## Maintenance

This CLAUDE.md file should be updated when:
- New modules are added
- Architectural patterns change
- Security requirements evolve
- Move language version updates

**Last Updated**: 2026-06-04
**Move Version**: Compatible with Move 1.0+
**Target Platform**: Aptos / Sui (adjust as needed)
