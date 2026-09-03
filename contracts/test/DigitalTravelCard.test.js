const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DigitalTravelCard", function () {
  let travelCard;
  let owner;
  let user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DigitalTravelCard");
    travelCard = await Factory.deploy();
    await travelCard.waitForDeployment();
  });

  it("creates a card and loads funds", async function () {
    await travelCard.connect(user).createCard("USD", 1000);
    const card = await travelCard.getCard(user.address);
    expect(card.balance).to.equal(1000);
    expect(card.currency).to.equal("USD");

    await travelCard.connect(user).loadFunds(250);
    const [fiat] = await travelCard.getBalance(user.address);
    expect(fiat).to.equal(1250);
  });

  it("converts fiat to crypto at the configured rate", async function () {
    await travelCard.connect(user).createCard("EUR", 100);
    await travelCard.connect(user).convertToCrypto(10);

    const [fiat, crypto] = await travelCard.getBalance(user.address);
    expect(fiat).to.equal(90);
    expect(crypto).to.equal(100);
  });

  it("lets the owner create and fund a card for a user", async function () {
    await travelCard.createCardFor(user.address, "GBP", 500);
    await travelCard.loadFundsFor(user.address, 50);
    await travelCard.convertToCryptoFor(user.address, 20);

    const [fiat, crypto] = await travelCard.getBalance(user.address);
    expect(fiat).to.equal(530);
    expect(crypto).to.equal(200);
  });

  it("reverts when creating a duplicate card", async function () {
    await travelCard.connect(user).createCard("USD", 1);
    await expect(travelCard.connect(user).createCard("USD", 1)).to.be.revertedWithCustomError(
      travelCard,
      "CardAlreadyExists"
    );
  });
});
