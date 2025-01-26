module travel_lifestyle::travel_points_exchange {
  use std::vector;
  use std::signer;
  use std::account;

  struct PointsExchange {
    points: u64;
    crypto_value: u64;
  }

  public fun create_exchange(signer: &signer, points: u64, crypto_value: u64) {
    let exchange = PointsExchange { points, crytpo_value };
    // Store the exchange in the account's resource
    account::move_to(signer, exchange);
  }

  public fun swap_points(signer: &signer, points_to_swap: u64){
    let exchange = borrow_global_mut<PointsExchange>(signer);
    assert!(exchange.points >= points_to_swap, 1); //Ensure enough points
    exchange.points = exchange.points - points_to_swap;
    //Logic to convert points to crypto or rewards
  }
}
