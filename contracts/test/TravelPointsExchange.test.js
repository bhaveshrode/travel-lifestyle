const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TravelPointsExchange", function () {
  let points;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TravelPointsExchange");
    points = await Factory.deploy();
    await points.waitForDeployment();
  });

  it("creates an account and adds points", async function () {
    await points.connect(user).createAccount(150);
    expect(await points.getPointsBalance(user.address)).to.equal(150);

    await points.connect(user).addPoints(50, "hotel stay");
    expect(await points.getPointsBalance(user.address)).to.equal(200);
  });

  it("swaps points for crypto at 100:1", async function () {
    await points.connect(user).createAccount(250);
    await points.connect(user).swapPointsForCrypto(200);

    expect(await points.getPointsBalance(user.address)).to.equal(50);
    expect(await points.getCryptoValue(user.address)).to.equal(ethers.parseEther("2"));
  });

  it("lets the owner create, grant, and swap for a user", async function () {
    await points.createAccountFor(user.address, 100);
    await points.grantPoints(user.address, 50, "bonus");
    await points.swapPointsForCryptoFor(user.address, 100);

    expect(await points.getPointsBalance(user.address)).to.equal(50);
    expect(await points.getCryptoValue(user.address)).to.equal(ethers.parseEther("1"));
  });

  it("reverts swaps below the minimum", async function () {
    await points.connect(user).createAccount(50);
    await expect(points.connect(user).swapPointsForCrypto(50)).to.be.revertedWithCustomError(
      points,
      "BelowMinimumSwap"
    );
  });
});
