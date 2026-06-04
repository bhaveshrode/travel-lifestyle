/// Module: experience_nfts
///
/// Manages tokenized travel experiences as NFTs.
/// Users can create, own, and transfer unique travel experiences.
///
/// # Features
/// - Create unique experience NFTs with ID, description, and price
/// - Two-step transfer ownership: offer and claim pattern
/// - Query NFT details by owner and ID
///
/// # Security
/// - Only NFT owner can offer transfers
/// - Only intended recipient can claim transfers
/// - Proper validation of NFT existence
/// - Access control on all operations
module travel_lifestyle::experience_nfts {
    use std::vector;
    use std::signer;
    use aptos_std::table::{Self, Table};

    // Error constants
    const ERROR_COLLECTION_ALREADY_EXISTS: u64 = 1;
    const ERROR_COLLECTION_NOT_FOUND: u64 = 2;
    const ERROR_NFT_NOT_FOUND: u64 = 3;
    const ERROR_UNAUTHORIZED: u64 = 4;
    const ERROR_INVALID_PRICE: u64 = 5;
    const ERROR_INVALID_DESCRIPTION: u64 = 6;
    const ERROR_NFT_ALREADY_EXISTS: u64 = 7;
    const ERROR_CANNOT_TRANSFER_TO_SELF: u64 = 8;
    const ERROR_PENDING_TRANSFER_NOT_FOUND: u64 = 9;
    const ERROR_PENDING_TRANSFER_ALREADY_EXISTS: u64 = 10;
    const ERROR_NOT_INTENDED_RECIPIENT: u64 = 11;

    // Configuration constants
    const MIN_PRICE: u64 = 1;
    const MAX_DESCRIPTION_LENGTH: u64 = 1000;

    /// Represents a single experience NFT.
    ///
    /// # Fields
    /// - `id`: Unique identifier for the NFT
    /// - `description`: Description of the experience
    /// - `price`: Price in crypto units
    ///
    /// # Abilities
    /// - `store`: Can be stored in other structs (e.g., Table)
    /// - `drop`: Can be dropped/destroyed
    struct ExperienceNFT has store, drop {
        id: u64,
        description: vector<u8>,
        price: u64,
    }

    /// Represents a pending NFT transfer.
    ///
    /// # Fields
    /// - `nft`: The NFT being transferred
    /// - `from`: Original owner's address
    /// - `to`: Intended recipient's address
    ///
    /// # Abilities
    /// - `store`: Can be stored in other structs (e.g., Table)
    /// - `drop`: Can be dropped/destroyed
    struct NFTPendingTransfer has store, drop {
        nft: ExperienceNFT,
        from: address,
        to: address,
    }

    /// Collection of NFTs owned by an account.
    ///
    /// # Fields
    /// - `nfts`: Table mapping NFT ID to NFT data
    /// - `pending_transfers`: Table mapping NFT ID to pending transfer data
    /// - `next_id`: Counter for generating unique IDs
    ///
    /// # Abilities
    /// - `key`: Can be stored in global storage
    struct NFTCollection has key {
        nfts: Table<u64, ExperienceNFT>,
        pending_transfers: Table<u64, NFTPendingTransfer>,
        next_id: u64,
    }

    /// Initializes an empty NFT collection for an account.
    ///
    /// # Parameters
    /// - `account`: Signer creating the collection
    ///
    /// # Aborts
    /// - `ERROR_COLLECTION_ALREADY_EXISTS`: If account already has a collection
    public fun initialize_collection(account: &signer) {
        let addr = signer::address_of(account);

        // Validate collection doesn't already exist
        assert!(!exists<NFTCollection>(addr), ERROR_COLLECTION_ALREADY_EXISTS);

        let collection = NFTCollection {
            nfts: table::new(),
            pending_transfers: table::new(),
            next_id: 0,
        };
        move_to(account, collection);
    }

    /// Creates a new experience NFT.
    ///
    /// # Parameters
    /// - `account`: Signer creating the NFT
    /// - `description`: Description of the experience
    /// - `price`: Price in crypto units
    ///
    /// # Returns
    /// The ID of the newly created NFT
    ///
    /// # Aborts
    /// - `ERROR_COLLECTION_NOT_FOUND`: If collection doesn't exist
    /// - `ERROR_INVALID_DESCRIPTION`: If description is empty or too long
    /// - `ERROR_INVALID_PRICE`: If price is less than MIN_PRICE
    public fun create_experience(
        account: &signer,
        description: vector<u8>,
        price: u64
    ): u64 acquires NFTCollection {
        let addr = signer::address_of(account);

        // Initialize collection if it doesn't exist
        if (!exists<NFTCollection>(addr)) {
            initialize_collection(account);
        };

        // Validate description
        let desc_length = vector::length(&description);
        assert!(desc_length > 0, ERROR_INVALID_DESCRIPTION);
        assert!(desc_length <= MAX_DESCRIPTION_LENGTH, ERROR_INVALID_DESCRIPTION);

        // Validate price
        assert!(price >= MIN_PRICE, ERROR_INVALID_PRICE);

        let collection = borrow_global_mut<NFTCollection>(addr);

        // Generate unique ID
        let nft_id = collection.next_id;
        collection.next_id = collection.next_id + 1;

        // Create NFT
        let nft = ExperienceNFT {
            id: nft_id,
            description,
            price,
        };

        // Add to collection
        table::add(&mut collection.nfts, nft_id, nft);

        nft_id
    }

    /// Offers an NFT for transfer to a specific recipient (Step 1 of 2).
    ///
    /// The NFT is removed from the sender's collection and placed in pending transfers.
    /// The recipient must call claim_nft() to complete the transfer.
    ///
    /// # Parameters
    /// - `from`: Signer who owns the NFT
    /// - `to`: Address of the intended recipient
    /// - `nft_id`: ID of the NFT to transfer
    ///
    /// # Aborts
    /// - `ERROR_COLLECTION_NOT_FOUND`: If sender doesn't have a collection
    /// - `ERROR_NFT_NOT_FOUND`: If NFT doesn't exist in sender's collection
    /// - `ERROR_CANNOT_TRANSFER_TO_SELF`: If trying to transfer to self
    /// - `ERROR_PENDING_TRANSFER_ALREADY_EXISTS`: If NFT already has a pending transfer
    public fun offer_nft(
        from: &signer,
        to: address,
        nft_id: u64
    ) acquires NFTCollection {
        let from_addr = signer::address_of(from);

        // Validate sender has collection
        assert!(exists<NFTCollection>(from_addr), ERROR_COLLECTION_NOT_FOUND);

        // Validate not transferring to self
        assert!(from_addr != to, ERROR_CANNOT_TRANSFER_TO_SELF);

        let from_collection = borrow_global_mut<NFTCollection>(from_addr);

        // Validate NFT exists
        assert!(
            table::contains(&from_collection.nfts, nft_id),
            ERROR_NFT_NOT_FOUND
        );

        // Validate no pending transfer exists for this NFT
        assert!(
            !table::contains(&from_collection.pending_transfers, nft_id),
            ERROR_PENDING_TRANSFER_ALREADY_EXISTS
        );

        // Remove NFT from sender's collection
        let nft = table::remove(&mut from_collection.nfts, nft_id);

        // Create pending transfer
        let pending_transfer = NFTPendingTransfer {
            nft,
            from: from_addr,
            to,
        };

        // Add to pending transfers
        table::add(&mut from_collection.pending_transfers, nft_id, pending_transfer);
    }

    /// Claims a pending NFT transfer (Step 2 of 2).
    ///
    /// The recipient accepts the NFT offered to them, completing the transfer.
    ///
    /// # Parameters
    /// - `recipient`: Signer claiming the NFT
    /// - `from`: Address of the original owner
    /// - `nft_id`: ID of the NFT to claim
    ///
    /// # Aborts
    /// - `ERROR_COLLECTION_NOT_FOUND`: If sender doesn't have a collection
    /// - `ERROR_PENDING_TRANSFER_NOT_FOUND`: If no pending transfer exists
    /// - `ERROR_NOT_INTENDED_RECIPIENT`: If caller is not the intended recipient
    public fun claim_nft(
        recipient: &signer,
        from: address,
        nft_id: u64
    ) acquires NFTCollection {
        let recipient_addr = signer::address_of(recipient);

        // Validate sender has collection with pending transfer
        assert!(exists<NFTCollection>(from), ERROR_COLLECTION_NOT_FOUND);

        let from_collection = borrow_global_mut<NFTCollection>(from);

        // Validate pending transfer exists
        assert!(
            table::contains(&from_collection.pending_transfers, nft_id),
            ERROR_PENDING_TRANSFER_NOT_FOUND
        );

        // Get pending transfer
        let pending_transfer = table::borrow(&from_collection.pending_transfers, nft_id);

        // Validate caller is the intended recipient
        assert!(pending_transfer.to == recipient_addr, ERROR_NOT_INTENDED_RECIPIENT);

        // Remove pending transfer and extract NFT
        let NFTPendingTransfer { nft, from: _, to: _ } = table::remove(
            &mut from_collection.pending_transfers,
            nft_id
        );

        // Initialize collection for recipient if needed
        if (!exists<NFTCollection>(recipient_addr)) {
            initialize_collection(recipient);
        };

        // Add NFT to recipient's collection
        let recipient_collection = borrow_global_mut<NFTCollection>(recipient_addr);
        table::add(&mut recipient_collection.nfts, nft_id, nft);
    }

    /// Cancels a pending NFT transfer, returning the NFT to the original owner.
    ///
    /// # Parameters
    /// - `owner`: Signer who offered the NFT
    /// - `nft_id`: ID of the NFT to cancel transfer for
    ///
    /// # Aborts
    /// - `ERROR_COLLECTION_NOT_FOUND`: If owner doesn't have a collection
    /// - `ERROR_PENDING_TRANSFER_NOT_FOUND`: If no pending transfer exists
    public fun cancel_transfer(
        owner: &signer,
        nft_id: u64
    ) acquires NFTCollection {
        let owner_addr = signer::address_of(owner);

        // Validate owner has collection
        assert!(exists<NFTCollection>(owner_addr), ERROR_COLLECTION_NOT_FOUND);

        let collection = borrow_global_mut<NFTCollection>(owner_addr);

        // Validate pending transfer exists
        assert!(
            table::contains(&collection.pending_transfers, nft_id),
            ERROR_PENDING_TRANSFER_NOT_FOUND
        );

        // Remove pending transfer and extract NFT
        let NFTPendingTransfer { nft, from: _, to: _ } = table::remove(
            &mut collection.pending_transfers,
            nft_id
        );

        // Return NFT to owner's collection
        table::add(&mut collection.nfts, nft_id, nft);
    }

    /// Gets details of an NFT.
    ///
    /// # Parameters
    /// - `owner`: Address of the NFT owner
    /// - `nft_id`: ID of the NFT
    ///
    /// # Returns
    /// Tuple of (description, price)
    ///
    /// # Aborts
    /// - `ERROR_COLLECTION_NOT_FOUND`: If owner doesn't have a collection
    /// - `ERROR_NFT_NOT_FOUND`: If NFT doesn't exist
    public fun get_nft_details(
        owner: address,
        nft_id: u64
    ): (vector<u8>, u64) acquires NFTCollection {
        assert!(exists<NFTCollection>(owner), ERROR_COLLECTION_NOT_FOUND);

        let collection = borrow_global<NFTCollection>(owner);
        assert!(table::contains(&collection.nfts, nft_id), ERROR_NFT_NOT_FOUND);

        let nft = table::borrow(&collection.nfts, nft_id);
        (nft.description, nft.price)
    }

    /// Checks if an NFT exists in an owner's collection.
    ///
    /// # Parameters
    /// - `owner`: Address to check
    /// - `nft_id`: NFT ID to look for
    ///
    /// # Returns
    /// true if NFT exists, false otherwise
    public fun has_nft(owner: address, nft_id: u64): bool acquires NFTCollection {
        if (!exists<NFTCollection>(owner)) {
            return false
        };

        let collection = borrow_global<NFTCollection>(owner);
        table::contains(&collection.nfts, nft_id)
    }

    /// Gets the number of NFTs owned by an address.
    ///
    /// # Parameters
    /// - `owner`: Address to query
    ///
    /// # Returns
    /// Number of NFTs owned
    public fun get_nft_count(owner: address): u64 acquires NFTCollection {
        if (!exists<NFTCollection>(owner)) {
            return 0
        };

        let collection = borrow_global<NFTCollection>(owner);
        table::length(&collection.nfts)
    }

    /// Checks if an account has an NFT collection.
    ///
    /// # Parameters
    /// - `addr`: Address to check
    ///
    /// # Returns
    /// true if collection exists, false otherwise
    public fun has_collection(addr: address): bool {
        exists<NFTCollection>(addr)
    }

    /// Checks if an NFT has a pending transfer.
    ///
    /// # Parameters
    /// - `owner`: Address of the current owner
    /// - `nft_id`: NFT ID to check
    ///
    /// # Returns
    /// true if a pending transfer exists, false otherwise
    public fun has_pending_transfer(owner: address, nft_id: u64): bool acquires NFTCollection {
        if (!exists<NFTCollection>(owner)) {
            return false
        };

        let collection = borrow_global<NFTCollection>(owner);
        table::contains(&collection.pending_transfers, nft_id)
    }

    /// Gets the intended recipient of a pending transfer.
    ///
    /// # Parameters
    /// - `owner`: Address of the current owner
    /// - `nft_id`: NFT ID to check
    ///
    /// # Returns
    /// Address of the intended recipient
    ///
    /// # Aborts
    /// - `ERROR_COLLECTION_NOT_FOUND`: If owner doesn't have a collection
    /// - `ERROR_PENDING_TRANSFER_NOT_FOUND`: If no pending transfer exists
    public fun get_pending_transfer_recipient(
        owner: address,
        nft_id: u64
    ): address acquires NFTCollection {
        assert!(exists<NFTCollection>(owner), ERROR_COLLECTION_NOT_FOUND);

        let collection = borrow_global<NFTCollection>(owner);
        assert!(
            table::contains(&collection.pending_transfers, nft_id),
            ERROR_PENDING_TRANSFER_NOT_FOUND
        );

        let pending_transfer = table::borrow(&collection.pending_transfers, nft_id);
        pending_transfer.to
    }

    #[test_only]
    public fun destroy_collection_for_test(account: &signer) acquires NFTCollection {
        let addr = signer::address_of(account);
        if (exists<NFTCollection>(addr)) {
            let NFTCollection { nfts, pending_transfers, next_id: _ } = move_from<NFTCollection>(addr);
            table::destroy_empty(nfts);
            table::destroy_empty(pending_transfers);
        }
    }
}
