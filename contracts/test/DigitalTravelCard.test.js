const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("DigitalTravelCard", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DigitalTravelCard");
    const card = await Factory.deploy();
    await card.waitForDeployment();
    return { card, owner, alice, bob };
  }

  it("creates a card with initial balance", async function () {
    const { card, alice } = await loadFixture(deployFixture);
    await expect(card.connect(alice).createCard("USD", 1000))
      .to.emit(card, "CardCreated")
      .withArgs(alice.address, "USD", 1000);

    const stored = await card.getCard(alice.address);
    expect(stored.balance).to.equal(1000n);
    expect(stored.cryptoBalance).to.equal(0n);
    expect(stored.currency).to.equal("USD");
    expect(stored.isActive).to.equal(true);
    expect(await card.totalCards()).to.equal(1n);
    expect(await card.checkCardExists(alice.address)).to.equal(true);
  });

  it("rejects duplicate cards, invalid currency, and zero amount", async function () {
    const { card, alice } = await loadFixture(deployFixture);
    await card.connect(alice).createCard("EUR", 100);

    await expect(card.connect(alice).createCard("USD", 50)).to.be.revertedWithCustomError(
      card,
      "CardAlreadyExists"
    );
    await expect(card.connect(alice).createCard("ABC", 50)).to.be.revertedWithCustomError(
      card,
      "InvalidCurrency"
    );
    await expect(card.createCard("USD", 0)).to.be.revertedWithCustomError(card, "InvalidAmount");
  });

  it("loads funds and converts fiat to crypto at the default rate", async function () {
    const { card, alice } = await loadFixture(deployFixture);
    await card.connect(alice).createCard("USD", 1000);

    await expect(card.connect(alice).loadFunds(500))
      .to.emit(card, "FundsLoaded")
      .withArgs(alice.address, 500);

    await expect(card.connect(alice).convertToCrypto(200))
      .to.emit(card, "CryptoConverted")
      .withArgs(alice.address, 200, 2000);

    const [fiat, crypto] = await card.getBalance(alice.address);
    expect(fiat).to.equal(1300n);
    expect(crypto).to.equal(2000n);
    expect(await card.calculateCryptoAmount(10)).to.equal(100n);
  });

  it("withdraws funds and enforces insufficient balance", async function () {
    const { card, alice } = await loadFixture(deployFixture);
    await card.connect(alice).createCard("GBP", 100);

    await expect(card.connect(alice).withdrawFunds(40))
      .to.emit(card, "FundsWithdrawn")
      .withArgs(alice.address, 40);

    expect((await card.getCard(alice.address)).balance).to.equal(60n);
    await expect(card.connect(alice).withdrawFunds(100)).to.be.revertedWithCustomError(
      card,
      "InsufficientBalance"
    );
    await expect(card.connect(alice).convertToCrypto(100)).to.be.revertedWithCustomError(
      card,
      "InsufficientBalance"
    );
  });

  it("changes currency and toggles card activity", async function () {
    const { card, alice } = await loadFixture(deployFixture);
    await card.connect(alice).createCard("USD", 10);

    await expect(card.connect(alice).changeCurrency("JPY"))
      .to.emit(card, "CurrencyChanged")
      .withArgs(alice.address, "USD", "JPY");

    await card.connect(alice).deactivateCard();
    expect((await card.getCard(alice.address)).isActive).to.equal(false);
    await card.connect(alice).reactivateCard();
    expect((await card.getCard(alice.address)).isActive).to.equal(true);
  });

  it("reverts view calls when a card is missing", async function () {
    const { card, bob } = await loadFixture(deployFixture);
    await expect(card.getCard(bob.address)).to.be.revertedWithCustomError(card, "CardNotFound");
    await expect(card.getBalance(bob.address)).to.be.revertedWithCustomError(card, "CardNotFound");
    await expect(card.connect(bob).loadFunds(1)).to.be.revertedWithCustomError(card, "CardNotFound");
  });

  it("lets the owner manage rates, currencies, and pause", async function () {
    const { card, owner, alice } = await loadFixture(deployFixture);
    await card.connect(owner).updateConversionRate(5n * 10n ** 18n);
    expect(await card.getConversionRate()).to.equal(5n * 10n ** 18n);
    await expect(card.connect(alice).updateConversionRate(1)).to.be.revertedWithCustomError(
      card,
      "OwnableUnauthorizedAccount"
    );

    await card.connect(owner).addSupportedCurrency("CAD");
    await card.connect(alice).createCard("CAD", 1);
    await card.connect(owner).removeSupportedCurrency("CAD");
    await expect(card.connect(alice).changeCurrency("CAD")).to.be.revertedWithCustomError(
      card,
      "InvalidCurrency"
    );

    await card.connect(owner).pause();
    await expect(card.connect(alice).loadFunds(1)).to.be.revertedWithCustomError(card, "EnforcedPause");
    await card.connect(owner).unpause();
    await card.connect(alice).loadFunds(1);
  });
});
