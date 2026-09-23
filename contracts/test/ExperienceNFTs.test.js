const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ExperienceNFTs", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ExperienceNFTs");
    const nfts = await Factory.deploy();
    await nfts.waitForDeployment();
    return { nfts, owner, alice, bob };
  }

  async function mint(nfts, signer, price = ethers.parseEther("1")) {
    const tx = await nfts
      .connect(signer)
      .mintNFT("Kyoto temple tour", "culture", "Kyoto", price, "ipfs://meta/1");
    const receipt = await tx.wait();
    const parsed = receipt.logs
      .map((log) => {
        try {
          return nfts.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((event) => event && event.name === "NFTMinted");
    return parsed.args.tokenId;
  }

  it("mints an NFT and stores metadata", async function () {
    const { nfts, alice } = await loadFixture(deployFixture);
    const tokenId = await mint(nfts, alice);

    expect(await nfts.ownerOf(tokenId)).to.equal(alice.address);
    expect(await nfts.tokenURI(tokenId)).to.equal("ipfs://meta/1");
    const stored = await nfts.getNFT(tokenId);
    expect(stored.description).to.equal("Kyoto temple tour");
    expect(stored.category).to.equal("culture");
    expect(stored.isListed).to.equal(false);
    expect(await nfts.getNFTsByOwner(alice.address)).to.deep.equal([tokenId]);
  });

  it("lists, unlists, and purchases with a 2.5% platform fee", async function () {
    const { nfts, owner, alice, bob } = await loadFixture(deployFixture);
    const price = ethers.parseEther("1");
    const tokenId = await mint(nfts, alice, price);

    await expect(nfts.connect(alice).listNFT(tokenId, price))
      .to.emit(nfts, "NFTListed")
      .withArgs(tokenId, price);
    expect(await nfts.getListedNFTs()).to.deep.equal([tokenId]);

    await expect(nfts.connect(alice).listNFT(tokenId, price)).to.be.revertedWithCustomError(
      nfts,
      "NFTAlreadyListed"
    );

    const sellerBefore = await ethers.provider.getBalance(alice.address);
    await expect(
      nfts.connect(bob).purchaseNFT(tokenId, { value: ethers.parseEther("1.2") })
    )
      .to.emit(nfts, "NFTPurchased")
      .withArgs(tokenId, alice.address, bob.address, price);

    expect(await nfts.ownerOf(tokenId)).to.equal(bob.address);
    expect((await nfts.getNFT(tokenId)).isListed).to.equal(false);
    expect(await nfts.accumulatedFees()).to.equal(ethers.parseEther("0.025"));

    const sellerAfter = await ethers.provider.getBalance(alice.address);
    expect(sellerAfter - sellerBefore).to.equal(ethers.parseEther("0.975"));

    await nfts.connect(owner).withdrawFees();
    expect(await nfts.accumulatedFees()).to.equal(0n);
  });

  it("rejects invalid purchases", async function () {
    const { nfts, alice, bob } = await loadFixture(deployFixture);
    const tokenId = await mint(nfts, alice);

    await expect(nfts.connect(bob).purchaseNFT(tokenId, { value: 1 })).to.be.revertedWithCustomError(
      nfts,
      "NFTNotListed"
    );

    await nfts.connect(alice).listNFT(tokenId, ethers.parseEther("1"));
    await expect(
      nfts.connect(bob).purchaseNFT(tokenId, { value: ethers.parseEther("0.5") })
    ).to.be.revertedWithCustomError(nfts, "InsufficientPayment");
    await expect(
      nfts.connect(alice).purchaseNFT(tokenId, { value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(nfts, "TransferToSelf");
  });

  it("supports two-step transfer offer, claim, and cancel", async function () {
    const { nfts, alice, bob } = await loadFixture(deployFixture);
    const tokenId = await mint(nfts, alice);

    await expect(nfts.connect(alice).offerNFTTransfer(tokenId, bob.address))
      .to.emit(nfts, "NFTTransferOffered")
      .withArgs(tokenId, alice.address, bob.address);

    await expect(
      nfts.connect(alice).offerNFTTransfer(tokenId, bob.address)
    ).to.be.revertedWithCustomError(nfts, "TransferAlreadyPending");
    await expect(nfts.connect(alice).claimNFTTransfer(tokenId)).to.be.revertedWithCustomError(
      nfts,
      "NotTransferRecipient"
    );

    await expect(nfts.connect(alice).cancelNFTTransfer(tokenId))
      .to.emit(nfts, "NFTTransferCancelled")
      .withArgs(tokenId, alice.address);
    expect(await nfts.hasPendingTransfer(tokenId)).to.equal(false);

    await nfts.connect(alice).offerNFTTransfer(tokenId, bob.address);
    await nfts.connect(alice).listNFT(tokenId, ethers.parseEther("1"));
    await nfts.connect(bob).claimNFTTransfer(tokenId);

    expect(await nfts.ownerOf(tokenId)).to.equal(bob.address);
    expect((await nfts.getNFT(tokenId)).isListed).to.equal(false);
  });

  it("restricts owner-only listing and fee updates", async function () {
    const { nfts, owner, alice, bob } = await loadFixture(deployFixture);
    const tokenId = await mint(nfts, alice);

    await expect(nfts.connect(bob).listNFT(tokenId, 1)).to.be.revertedWithCustomError(
      nfts,
      "NotNFTOwner"
    );
    await expect(nfts.connect(alice).listNFT(tokenId, 0)).to.be.revertedWithCustomError(
      nfts,
      "InvalidPrice"
    );
    await expect(nfts.getNFT(99)).to.be.revertedWithCustomError(nfts, "NFTNotFound");

    await nfts.connect(owner).updatePlatformFee(100);
    expect(await nfts.platformFeePercentage()).to.equal(100n);
    await expect(nfts.connect(owner).updatePlatformFee(1001)).to.be.revertedWith("Fee too high");
    await expect(nfts.connect(alice).updatePlatformFee(10)).to.be.revertedWithCustomError(
      nfts,
      "OwnableUnauthorizedAccount"
    );
  });

  it("pauses minting and transfers", async function () {
    const { nfts, owner, alice } = await loadFixture(deployFixture);
    await nfts.connect(owner).pause();
    await expect(
      nfts.connect(alice).mintNFT("x", "y", "z", 1, "")
    ).to.be.revertedWithCustomError(nfts, "EnforcedPause");
    await nfts.connect(owner).unpause();
    await mint(nfts, alice);
  });
});
