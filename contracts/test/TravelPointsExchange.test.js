const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("TravelPointsExchange", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TravelPointsExchange");
    const points = await Factory.deploy();
    await points.waitForDeployment();
    return { points, owner, alice, bob };
  }

  it("creates an account and adds points", async function () {
    const { points, alice } = await loadFixture(deployFixture);
    await expect(points.connect(alice).createAccount(250))
      .to.emit(points, "AccountCreated")
      .withArgs(alice.address, 250);

    await expect(points.connect(alice).addPoints(50, "flight"))
      .to.emit(points, "PointsAdded")
      .withArgs(alice.address, 50, "flight");

    const account = await points.getAccount(alice.address);
    expect(account.points).to.equal(300n);
    expect(account.totalPointsEarned).to.equal(300n);
    expect(await points.getPointsBalance(alice.address)).to.equal(300n);
    expect(await points.totalAccounts()).to.equal(1n);
    expect(await points.checkAccountExists(alice.address)).to.equal(true);
  });

  it("rejects duplicate accounts and missing accounts", async function () {
    const { points, alice, bob } = await loadFixture(deployFixture);
    await points.connect(alice).createAccount(10);
    await expect(points.connect(alice).createAccount(10)).to.be.revertedWithCustomError(
      points,
      "AccountAlreadyExists"
    );
    await expect(points.createAccount(0)).to.be.revertedWithCustomError(points, "InvalidAmount");
    await expect(points.getAccount(bob.address)).to.be.revertedWithCustomError(
      points,
      "AccountNotFound"
    );
    await expect(points.connect(bob).addPoints(1, "")).to.be.revertedWithCustomError(
      points,
      "AccountNotFound"
    );
  });

  it("swaps points for crypto at 100:1 and records history", async function () {
    const { points, alice } = await loadFixture(deployFixture);
    await points.connect(alice).createAccount(250);

    await expect(points.connect(alice).swapPointsForCrypto(50)).to.be.revertedWithCustomError(
      points,
      "BelowMinimumSwap"
    );
    await expect(points.connect(alice).swapPointsForCrypto(300)).to.be.revertedWithCustomError(
      points,
      "InsufficientPoints"
    );

    await expect(points.connect(alice).swapPointsForCrypto(200))
      .to.emit(points, "PointsSwapped")
      .withArgs(alice.address, 200, ethers.parseEther("2"));

    expect(await points.getPointsBalance(alice.address)).to.equal(50n);
    expect(await points.getCryptoValue(alice.address)).to.equal(ethers.parseEther("2"));
    expect(await points.calculateCryptoForPoints(100)).to.equal(ethers.parseEther("1"));
    expect(await points.calculatePointsForCrypto(ethers.parseEther("1"))).to.equal(100n);

    const history = await points.getUserSwapHistory(alice.address);
    expect(history.length).to.equal(1);
    expect(history[0].pointsSwapped).to.equal(200n);
    expect(await points.getTotalSwaps()).to.equal(1n);

    const stats = await points.getAccountStats(alice.address);
    expect(stats.points).to.equal(50n);
    expect(stats.totalSwapped).to.equal(200n);
    expect(stats.transactions).to.equal(1n);
  });

  it("withdraws crypto and toggles account activity", async function () {
    const { points, alice } = await loadFixture(deployFixture);
    await points.connect(alice).createAccount(200);
    await points.connect(alice).swapPointsForCrypto(100);

    await expect(points.connect(alice).withdrawCrypto(ethers.parseEther("1")))
      .to.emit(points, "CryptoWithdrawn")
      .withArgs(alice.address, ethers.parseEther("1"));
    expect(await points.getCryptoValue(alice.address)).to.equal(0n);
    await expect(points.connect(alice).withdrawCrypto(1)).to.be.revertedWithCustomError(
      points,
      "InsufficientCrypto"
    );

    await points.connect(alice).deactivateAccount();
    expect((await points.getAccount(alice.address)).isActive).to.equal(false);
    await points.connect(alice).reactivateAccount();
    expect((await points.getAccount(alice.address)).isActive).to.equal(true);
  });

  it("lets the owner grant points and update rates", async function () {
    const { points, owner, alice } = await loadFixture(deployFixture);
    await points.connect(alice).createAccount(100);

    await points.connect(owner).grantPoints(alice.address, 25, "promo");
    expect(await points.getPointsBalance(alice.address)).to.equal(125n);

    await expect(points.connect(owner).updateExchangeRate(50))
      .to.emit(points, "ExchangeRateUpdated")
      .withArgs(100, 50);
    expect(await points.getExchangeRate()).to.equal(50n);

    await expect(points.connect(owner).updateMinimumSwap(10))
      .to.emit(points, "MinimumSwapUpdated")
      .withArgs(100, 10);

    await expect(points.connect(alice).updateExchangeRate(1)).to.be.revertedWithCustomError(
      points,
      "OwnableUnauthorizedAccount"
    );
    await expect(points.connect(owner).updateExchangeRate(0)).to.be.revertedWithCustomError(
      points,
      "InvalidAmount"
    );
  });

  it("pauses account mutations", async function () {
    const { points, owner, alice } = await loadFixture(deployFixture);
    await points.connect(owner).pause();
    await expect(points.connect(alice).createAccount(10)).to.be.revertedWithCustomError(
      points,
      "EnforcedPause"
    );
    await points.connect(owner).unpause();
    await points.connect(alice).createAccount(10);
  });
});
