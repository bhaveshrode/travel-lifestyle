import { ethers, Contract } from 'ethers';
import { logger } from '../config/logger';
import { config } from '../config';
import { TRAVEL_CARD_ABI, NFTS_ABI, POINTS_ABI } from './abis';

class EthereumService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;

  private travelCardAddress: string = '';
  private nftsAddress: string = '';
  private pointsExchangeAddress: string = '';

  private travelCardContract: Contract | null = null;
  private nftsContract: Contract | null = null;
  private pointsContract: Contract | null = null;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    try {
      const rpcUrl = config.ethereum.rpcUrl;
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      if (config.ethereum.privateKey) {
        this.wallet = new ethers.Wallet(config.ethereum.privateKey, this.provider);
        logger.info('Ethereum wallet initialized');
      } else {
        logger.warn('No PRIVATE_KEY provided - blockchain transactions will fail');
      }

      this.setContractAddresses(
        config.ethereum.travelCardAddress,
        config.ethereum.nftsAddress,
        config.ethereum.pointsAddress
      );

      logger.info(`Ethereum provider initialized: ${rpcUrl}`);
    } catch (error: any) {
      logger.error('Failed to initialize Ethereum provider:', error.message);
    }
  }

  public setContractAddresses(
    travelCard: string,
    nfts: string,
    points: string
  ): void {
    this.travelCardAddress = travelCard;
    this.nftsAddress = nfts;
    this.pointsExchangeAddress = points;

    this.travelCardContract = this.tryCreateContract(travelCard, TRAVEL_CARD_ABI);
    this.nftsContract = this.tryCreateContract(nfts, NFTS_ABI);
    this.pointsContract = this.tryCreateContract(points, POINTS_ABI);

    logger.info('Contract addresses set:', {
      travelCard,
      nfts,
      points,
    });
  }

  private tryCreateContract(address: string, abi: string[]): Contract | null {
    if (!this.wallet || !address || !ethers.isAddress(address)) {
      return null;
    }
    return new ethers.Contract(address, abi, this.wallet);
  }

  private requireTravelCard(): Contract {
    if (!this.travelCardContract) {
      throw new Error('Travel card contract is not configured');
    }
    return this.travelCardContract;
  }

  private requireNfts(): Contract {
    if (!this.nftsContract) {
      throw new Error('NFT contract is not configured');
    }
    return this.nftsContract;
  }

  private requirePoints(): Contract {
    if (!this.pointsContract) {
      throw new Error('Points contract is not configured');
    }
    return this.pointsContract;
  }

  public toWei(amount: string | number): bigint {
    return ethers.parseEther(amount.toString());
  }

  public fromWei(amount: bigint): string {
    return ethers.formatEther(amount);
  }

  async createTravelCard(
    userAddress: string,
    currency: string,
    initialBalance: string
  ): Promise<string> {
    try {
      logger.info(`Creating travel card for ${userAddress}`);
      const tx = await this.requireTravelCard().createCardFor(
        userAddress,
        currency,
        BigInt(initialBalance)
      );
      const receipt = await tx.wait();
      logger.info(`Travel card created: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to create travel card:', error.message);
      throw error;
    }
  }

  async loadFunds(userAddress: string, amount: string): Promise<string> {
    try {
      logger.info(`Loading funds for ${userAddress}: ${amount}`);
      const tx = await this.requireTravelCard().loadFundsFor(userAddress, BigInt(amount));
      const receipt = await tx.wait();
      logger.info(`Funds loaded: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to load funds:', error.message);
      throw error;
    }
  }

  async convertToCrypto(userAddress: string, amount: string): Promise<string> {
    try {
      logger.info(`Converting to crypto for ${userAddress}: ${amount}`);
      const tx = await this.requireTravelCard().convertToCryptoFor(userAddress, BigInt(amount));
      const receipt = await tx.wait();
      logger.info(`Conversion complete: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to convert to crypto:', error.message);
      throw error;
    }
  }

  async mintNFT(
    ownerAddress: string,
    description: string,
    category: string,
    location: string,
    price: string,
    tokenURI: string
  ): Promise<{ txHash: string; tokenId: string }> {
    try {
      logger.info(`Minting NFT for ${ownerAddress}`);
      const tx = await this.requireNfts().mintNFTFor(
        ownerAddress,
        description,
        category,
        location,
        BigInt(price),
        tokenURI
      );
      const receipt = await tx.wait();
      const minted = receipt.logs
        .map((log: ethers.Log) => {
          try {
            return this.requireNfts().interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
          } catch {
            return null;
          }
        })
        .find((parsed: ethers.LogDescription | null) => parsed?.name === 'NFTMinted');

      const tokenId = minted ? minted.args.tokenId.toString() : '0';
      logger.info(`NFT minted: ${receipt.hash}, tokenId: ${tokenId}`);
      return { txHash: receipt.hash, tokenId };
    } catch (error: any) {
      logger.error('Failed to mint NFT:', error.message);
      throw error;
    }
  }

  async listNFT(tokenId: string, price: string): Promise<string> {
    try {
      logger.info(`Listing NFT ${tokenId} for ${price}`);
      const tx = await this.requireNfts().listNFTFor(tokenId, BigInt(price));
      const receipt = await tx.wait();
      logger.info(`NFT listed: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to list NFT:', error.message);
      throw error;
    }
  }

  async offerNFTTransfer(
    tokenId: string,
    fromAddress: string,
    toAddress: string
  ): Promise<string> {
    try {
      logger.info(`Offering NFT ${tokenId} transfer from ${fromAddress} to ${toAddress}`);
      const tx = await this.requireNfts().offerNFTTransferFor(tokenId, fromAddress, toAddress);
      const receipt = await tx.wait();
      logger.info(`NFT transfer offered: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to offer NFT transfer:', error.message);
      throw error;
    }
  }

  async claimNFTTransfer(tokenId: string, recipientAddress: string): Promise<string> {
    try {
      logger.info(`Claiming NFT ${tokenId} by ${recipientAddress}`);
      const tx = await this.requireNfts().claimNFTTransferFor(tokenId, recipientAddress);
      const receipt = await tx.wait();
      logger.info(`NFT transfer claimed: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to claim NFT transfer:', error.message);
      throw error;
    }
  }

  async createPointsAccount(userAddress: string, initialPoints: number): Promise<string> {
    try {
      logger.info(`Creating points account for ${userAddress}`);
      const tx = await this.requirePoints().createAccountFor(userAddress, BigInt(initialPoints));
      const receipt = await tx.wait();
      logger.info(`Points account created: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to create points account:', error.message);
      throw error;
    }
  }

  async addPoints(userAddress: string, amount: number, reason: string): Promise<string> {
    try {
      logger.info(`Adding ${amount} points for ${userAddress}`);
      const tx = await this.requirePoints().grantPoints(userAddress, BigInt(amount), reason);
      const receipt = await tx.wait();
      logger.info(`Points added: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      logger.error('Failed to add points:', error.message);
      throw error;
    }
  }

  async swapPoints(
    userAddress: string,
    pointsAmount: number
  ): Promise<{ txHash: string; cryptoEarned: string }> {
    try {
      logger.info(`Swapping ${pointsAmount} points for ${userAddress}`);
      const contract = this.requirePoints();
      const tx = await contract.swapPointsForCryptoFor(userAddress, BigInt(pointsAmount));
      const receipt = await tx.wait();

      const swapped = receipt.logs
        .map((log: ethers.Log) => {
          try {
            return contract.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
          } catch {
            return null;
          }
        })
        .find((parsed: ethers.LogDescription | null) => parsed?.name === 'PointsSwapped');

      const cryptoEarned = swapped ? swapped.args.cryptoAmount.toString() : '0';
      logger.info(`Points swapped: ${receipt.hash}, earned: ${cryptoEarned}`);
      return { txHash: receipt.hash, cryptoEarned };
    } catch (error: any) {
      logger.error('Failed to swap points:', error.message);
      throw error;
    }
  }

  async getGasPrice(): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || BigInt(0);
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return this.provider.getTransactionReceipt(txHash);
  }

  async getBlockNumber(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return this.provider.getBlockNumber();
  }

  generateAddress(): string {
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  async getTravelCardBalance(userAddress: string): Promise<string> {
    const [fiatBalance] = await this.requireTravelCard().getBalance(userAddress);
    return fiatBalance.toString();
  }

  async getCryptoBalance(userAddress: string): Promise<string> {
    const [, cryptoBalance] = await this.requireTravelCard().getBalance(userAddress);
    return cryptoBalance.toString();
  }

  async getPointsBalance(userAddress: string): Promise<string> {
    const points = await this.requirePoints().getPointsBalance(userAddress);
    return points.toString();
  }

  async getPointsCryptoValue(userAddress: string): Promise<string> {
    const cryptoValue = await this.requirePoints().getCryptoValue(userAddress);
    return cryptoValue.toString();
  }
}

export default new EthereumService();
