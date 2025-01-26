module travel_lifestyle::experience_nfts{
  use std::vector;
  use std::signer;
  use std::account;

  struct ExperienceNFT{
    id: u64,
    owner: address,
    description: vector<u8>,
    price: u64,
  }

  public fun create_experience(signer: &signer, id: u64, description: vector<u8>, price: u64){
    let nft = ExperienceNFT {id, owner: signer.address(), description, price};
    account::move_to(signer, nft);
  }

  public fun trade_experience(signer: &signer, experience_id: u64, new_owner: address){
    let nft = borrow_global_mut<ExperienceNFT>(signer);
    assert!(nft.id == experience_id, 1); //Ensure the NFT belongs to the signer
    nft.owner = new_owner; //Transfer ownership
  }
}
