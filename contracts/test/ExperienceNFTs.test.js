const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ExperienceNFTs", function () {
  let nfts;
  let owner;
  let seller;
  let buyer;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ExperienceNFTs");
    nfts = await Factory.deploy();
    await nfts.waitForDeployment();
  });

  it("mints and lists an NFT", async function () {
    await nfts.connect(seller).mintNFT("Paris tour", "Cultural", "Paris", ethers.parseEther("1"), "ipfs://meta");
    expect(await nfts.ownerOf(0)).to.equal(seller.address);

    await nfts.connect(seller).listNFT(0, ethers.parseEther("1"));
    const nft = await nfts.getNFT(0);
    expect(nft.isListed).to.equal(true);
    expect(nft.price).to.equal(ethers.parseEther("1"));
  });

  it("purchases a listed NFT and takes a 2.5% fee", async function () {
    await nfts.connect(seller).mintNFT("Tokyo food", "Culinary", "Tokyo", ethers.parseEther("1"), "ipfs://meta");
    await nfts.connect(seller).listNFT(0, ethers.parseEther("1"));

    const sellerBefore = await ethers.provider.getBalance(seller.address);
    await nfts.connect(buyer).purchaseNFT(0, { value: ethers.parseEther("1") });

    expect(await nfts.ownerOf(0)).to.equal(buyer.address);
    expect((await nfts.getNFT(0)).isListed).to.equal(false);
    expect(await nfts.accumulatedFees()).to.equal(ethers.parseEther("0.025"));

    const sellerAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerAfter - sellerBefore).to.equal(ethers.parseEther("0.975"));
  });

  it("completes a two-step transfer", async function () {
    await nfts.connect(seller).mintNFT("Safari", "Adventure", "Kenya", 0, "ipfs://meta");
    await nfts.connect(seller).offerNFTTransfer(0, buyer.address);
    await nfts.connect(buyer).claimNFTTransfer(0);
    expect(await nfts.ownerOf(0)).to.equal(buyer.address);
  });

  it("lets the owner mint and transfer on behalf of users", async function () {
    await nfts.mintNFTFor(seller.address, "Rome walk", "Cultural", "Rome", 100, "ipfs://meta");
    expect(await nfts.ownerOf(0)).to.equal(seller.address);

    await nfts.offerNFTTransferFor(0, seller.address, buyer.address);
    await nfts.claimNFTTransferFor(0, buyer.address);
    expect(await nfts.ownerOf(0)).to.equal(buyer.address);
  });
});
