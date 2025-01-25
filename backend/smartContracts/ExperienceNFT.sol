// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzepplin/contracts/token/ERC721/ERC721.sol";
import "@openzepplin/contracts/utils/Counters.sol";

contract ExperienceNFT is ERC721{
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIdCounter;

  struct Experience{
    string name;
    string description;
    string location;
    uint256 price;
  }

  mapping (uint256 => Experience) public experiences;

  constructo ERC721("ExperienceNFT", "EXP") {}

  function mintExperience(string memory name, string memory description, string memory location, uint price) public{
    uint256 tokenId = _tokenIdCounter.current();
    _mint(msg.sender, tokenId);
    experiences[tokenId] = Experience(name, description, location, price);
    _tokenIdCounter.increment();
  }
}
