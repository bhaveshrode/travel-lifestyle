# Travel and Lifestyle Application
This project is a travel and lifestyle application built using the Move programming language. It includes features for exchanging travel points, managing a digital travel card, and tokenizing unique experiences as NFTs.

## Features
- Travel Points Exchange: Swap airline/hotel points for crypto or other rewards.
- Digital Travel Card: A multi-currency travel card with integrated crypto capabilities.
- Experience NFTs: Tokenize and trade unique experiences and activities.

## Getting Started
1. Install the Move language tools.
2. Clone this repository.
3. Navigate to the project directory.
4. Build the project using the Move CLI.
   '''bash
   move build

## Usage

### Travel Points Exchange
1. Create a new points exchange:
   '''move
   travel_lifestyle::travel_points_exchange::create_exchange(signer 1000, 500);
2. Swap points for crypto:
   '''move
   travel_lifestyle::travel_points_exchange::swap_points(signer, 200);

### Digital Travel Card
1. Create a new digital travel card:
   '''move
   travel_lifestyle::digital_travel_card::create_card(signer, 1000, b"USD");
2. Load funds onto the card:
   '''move
   travel_lifestyle::digital_travel_card::load_funds(signer, 500);
3. Convert funds to crypto:
   '''move
   travel_lifestyle::digital_travel_card::convert_to_crypto(signer, 300);

### Experience NFTs
1. Create a new experience NFT:
   '''move
   travel_lifestyle::experience_nfts::create_experience(signer, 1, b"Skydiving Adventure", 150);
2. Trade an experience NFT:
   '''move
   travel_lifestyle::experience_nfts::trade_experience(signer, 1, new_owner_address);
