module travel_lifestyle::digital_travel_card {
  use std::vector;
  use std::signer;
  use std::account;

  struct TravelCard{
    balance: u64,
    currency: vector<u8>,
    crypto_balance: u64,
  }

  public fun create_card(signer: &signer, initial_balance: u64, currency: vector<u8>){
    let card = TravelCard {balance: initial_balance, currency, crypto_balance: 0};
    account::move_to(signer, card);
  }

  public fun load_funds(signer: &signer, amount: u64){
    let card = borrow_global_mut<TravelCard>(signer);
    card_balance = card_balance + amount;
  }

  public fun convert_to_crypto(signer: &signer, amount: u64) {
    let card = borrow_global_mut<TravelCard>(signer);
    assert!(card.balance >= amount, 1); //Ensure enough balance
    card.balance = card.balance - amount;
    card.crypto_balance + amount;  //Simple conversion
  }
}
