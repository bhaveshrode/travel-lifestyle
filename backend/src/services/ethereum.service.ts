import { Contract, JsonRpcProvider, ethers } from 'ethers';
import { logger } from '../config/logger';
import { config } from '../config';
import travelCardAbi from '../abis/DigitalTravelCard.json';
import nftsAbi from '../abis/ExperienceNFTs.json';
import pointsAbi from '../abis/TravelPointsExchange.json';
import {
  getUserSigner,
  parseEvent,
  requireAddress,
  sendTx,
  toAmount,
} from './ethereum.helpers';

class EthereumService {
  private provider: JsonRpcProvider | null = null;
  private travelCardAddress = config.ethereum.travelCardAddress;
  private nftsAddress = config.ethereum.nftsAddress;
  private pointsAddress = config.ethereum.pointsAddress;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      this.provider = new JsonRpcProvider(config.ethereum.rpcUrl || 'http://127.0.0.1:8545');
      logger.info(`Ethereum provider initialized: ${config.ethereum.rpcUrl}`);
    } catch (error: any) {
      logger.error('Failed to initialize Ethereum provider:', error.message);
    }
  }

  public setContractAddresses(travelCard: string, nfts: string, points: string): void {
    this.travelCardAddress = travelCard;
    this.nftsAddress = nfts;
    this.pointsAddress = points;
  }

  public toWei(amount: string | number): bigint {
    return ethers.parseEther(amount.toString());
  }

  public fromWei(amount: bigint): string {
    return ethers.formatEther(amount);
  }

  public generateAddress(): string {
    return ethers.Wallet.createRandom().address;
  }

  public isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  private requireProvider(): JsonRpcProvider {
    if (!this.provider) {
      throw new Error('Ethereum provider not initialized');
    }
    return this.provider;
  }

  private read(address: string, abi: any): Contract {
    if (!address) {
      throw new Error('Contract address is not configured');
    }
    return new Contract(address, abi, this.requireProvider());
  }

  private async write(address: string, abi: any, userAddress: string): Promise<Contract> {
    const signer = await getUserSigner(this.requireProvider(), userAddress);
    return new Contract(address, abi, signer);
  }

  async createTravelCard(userAddress: string, currency: string, initialBalance: string | number) {
    const c = await this.write(this.travelCardAddress, travelCardAbi, userAddress);
    return sendTx(c.createCard(currency, toAmount(initialBalance)));
  }

  async loadFunds(userAddress: string, amount: string | number) {
    const c = await this.write(this.travelCardAddress, travelCardAbi, userAddress);
    return sendTx(c.loadFunds(toAmount(amount)));
  }

  async convertToCrypto(userAddress: string, amount: string | number) {
    const c = await this.write(this.travelCardAddress, travelCardAbi, userAddress);
    return sendTx(c.convertToCrypto(toAmount(amount)));
  }

  async mintNFT(
    ownerAddress: string,
    description: string,
    category: string,
    location: string,
    price: string | number,
    tokenURI: string
  ) {
    const c = await this.write(this.nftsAddress, nftsAbi, ownerAddress);
    const tx = await c.mintNFT(description, category || '', location || '', toAmount(price), tokenURI || '');
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('NFT mint was not mined');
    }
    const parsed = parseEvent(receipt, c, 'NFTMinted');
    return { txHash: receipt.hash, tokenId: parsed?.args?.tokenId?.toString() || '0' };
  }

  async listNFT(ownerAddress: string, tokenId: string, price: string | number) {
    const c = await this.write(this.nftsAddress, nftsAbi, ownerAddress);
    return sendTx(c.listNFT(BigInt(tokenId), toAmount(price)));
  }

  async unlistNFT(ownerAddress: string, tokenId: string) {
    const c = await this.write(this.nftsAddress, nftsAbi, ownerAddress);
    return sendTx(c.unlistNFT(BigInt(tokenId)));
  }

  async purchaseNFT(buyerAddress: string, tokenId: string, price: bigint) {
    const c = await this.write(this.nftsAddress, nftsAbi, buyerAddress);
    return sendTx(c.purchaseNFT(BigInt(tokenId), { value: price }));
  }

  async offerNFTTransfer(tokenId: string, fromAddress: string, toAddress: string) {
    const c = await this.write(this.nftsAddress, nftsAbi, fromAddress);
    return sendTx(c.offerNFTTransfer(BigInt(tokenId), requireAddress(toAddress, 'recipient')));
  }

  async claimNFTTransfer(tokenId: string, recipientAddress: string) {
    const c = await this.write(this.nftsAddress, nftsAbi, recipientAddress);
    return sendTx(c.claimNFTTransfer(BigInt(tokenId)));
  }

  async cancelNFTTransfer(tokenId: string, ownerAddress: string) {
    const c = await this.write(this.nftsAddress, nftsAbi, ownerAddress);
    return sendTx(c.cancelNFTTransfer(BigInt(tokenId)));
  }

  async createPointsAccount(userAddress: string, initialPoints: number) {
    const c = await this.write(this.pointsAddress, pointsAbi, userAddress);
    return sendTx(c.createAccount(toAmount(initialPoints)));
  }

  async addPoints(userAddress: string, amount: number, reason: string) {
    const c = await this.write(this.pointsAddress, pointsAbi, userAddress);
    return sendTx(c.addPoints(toAmount(amount), reason || ''));
  }

  async swapPoints(userAddress: string, pointsAmount: number) {
    const c = await this.write(this.pointsAddress, pointsAbi, userAddress);
    const tx = await c.swapPointsForCrypto(toAmount(pointsAmount));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Points swap was not mined');
    }
    const parsed = parseEvent(receipt, c, 'PointsSwapped');
    return { txHash: receipt.hash, cryptoEarned: parsed?.args?.cryptoAmount?.toString() || '0' };
  }

  async getGasPrice() {
    return (await this.requireProvider().getFeeData()).gasPrice || BigInt(0);
  }

  async getTransactionReceipt(txHash: string) {
    return this.requireProvider().getTransactionReceipt(txHash);
  }

  async getBlockNumber() {
    return this.requireProvider().getBlockNumber();
  }

  async getTravelCardBalance(userAddress: string) {
    const address = requireAddress(userAddress, 'user');
    const c = this.read(this.travelCardAddress, travelCardAbi);
    if (!(await c.checkCardExists(address))) return '0';
    const [fiatBalance] = await c.getBalance(address);
    return fiatBalance.toString();
  }

  async getCryptoBalance(userAddress: string) {
    const address = requireAddress(userAddress, 'user');
    const c = this.read(this.travelCardAddress, travelCardAbi);
    if (!(await c.checkCardExists(address))) return '0';
    const [, cryptoBalance] = await c.getBalance(address);
    return cryptoBalance.toString();
  }

  async getPointsBalance(userAddress: string) {
    const address = requireAddress(userAddress, 'user');
    const c = this.read(this.pointsAddress, pointsAbi);
    if (!(await c.checkAccountExists(address))) return '0';
    return (await c.getPointsBalance(address)).toString();
  }

  async getPointsCryptoValue(userAddress: string) {
    const address = requireAddress(userAddress, 'user');
    const c = this.read(this.pointsAddress, pointsAbi);
    if (!(await c.checkAccountExists(address))) return '0';
    return (await c.getCryptoValue(address)).toString();
  }

  async getExchangeRate() {
    return (await this.read(this.pointsAddress, pointsAbi).getExchangeRate()).toString();
  }
}

export default new EthereumService();
