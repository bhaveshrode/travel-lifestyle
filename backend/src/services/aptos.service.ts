import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
} from '@aptos-labs/ts-sdk';
import { config } from '../config';
import { logger } from '../config/logger';

// Initialize Aptos client
const aptosConfig = new AptosConfig({
  network: config.aptos.network as Network,
});

export const aptosClient = new Aptos(aptosConfig);

/**
 * Service for interacting with Aptos blockchain
 */
export class AptosService {
  private moduleAddress: string;

  constructor() {
    this.moduleAddress = config.aptos.moduleAddress;
  }

  /**
   * Get account from private key
   */
  getAccountFromPrivateKey(privateKey: string): Account {
    const key = new Ed25519PrivateKey(privateKey);
    return Account.fromPrivateKey({ privateKey: key });
  }

  /**
   * Get account balance
   */
  async getAccountBalance(address: string): Promise<number> {
    try {
      const resources = await aptosClient.getAccountResource({
        accountAddress: address,
        resourceType: '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>',
      });
      return Number(resources.coin.value);
    } catch (error) {
      logger.error(`Error fetching balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Travel Card Functions
   */

  /**
   * Create a new travel card
   */
  async createTravelCard(
    account: Account,
    initialBalance: number,
    currency: string
  ) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::digital_travel_card::create_card`,
          functionArguments: [initialBalance, currency],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`Travel card created: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error creating travel card:', error);
      throw error;
    }
  }

  /**
   * Load funds to travel card
   */
  async loadFunds(account: Account, amount: number) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::digital_travel_card::load_funds`,
          functionArguments: [amount],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`Funds loaded: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error loading funds:', error);
      throw error;
    }
  }

  /**
   * Convert fiat to crypto
   */
  async convertToCrypto(account: Account, amount: number) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::digital_travel_card::convert_to_crypto`,
          functionArguments: [amount],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`Converted to crypto: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error converting to crypto:', error);
      throw error;
    }
  }

  /**
   * Get travel card balance
   */
  async getTravelCardBalance(address: string): Promise<number> {
    try {
      const payload = {
        function: `${this.moduleAddress}::digital_travel_card::get_balance`,
        type_arguments: [],
        arguments: [address],
      };

      const result = await aptosClient.view({ payload });
      return Number(result[0]);
    } catch (error) {
      logger.error('Error fetching travel card balance:', error);
      throw error;
    }
  }

  /**
   * Get crypto balance
   */
  async getCryptoBalance(address: string): Promise<number> {
    try {
      const payload = {
        function: `${this.moduleAddress}::digital_travel_card::get_crypto_balance`,
        type_arguments: [],
        arguments: [address],
      };

      const result = await aptosClient.view({ payload });
      return Number(result[0]);
    } catch (error) {
      logger.error('Error fetching crypto balance:', error);
      throw error;
    }
  }

  /**
   * NFT Functions
   */

  /**
   * Create experience NFT
   */
  async createNFT(
    account: Account,
    description: string,
    price: number
  ) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::experience_nfts::create_nft`,
          functionArguments: [description, price],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`NFT created: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error creating NFT:', error);
      throw error;
    }
  }

  /**
   * Offer NFT for transfer
   */
  async offerNFT(
    account: Account,
    recipientAddress: string,
    nftId: number
  ) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::experience_nfts::offer_nft`,
          functionArguments: [recipientAddress, nftId],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`NFT offered: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error offering NFT:', error);
      throw error;
    }
  }

  /**
   * Claim NFT
   */
  async claimNFT(
    account: Account,
    fromAddress: string,
    nftId: number
  ) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::experience_nfts::claim_nft`,
          functionArguments: [fromAddress, nftId],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`NFT claimed: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error claiming NFT:', error);
      throw error;
    }
  }

  /**
   * Points Exchange Functions
   */

  /**
   * Create points exchange account
   */
  async createPointsExchange(
    account: Account,
    points: number,
    cryptoValue: number
  ) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::travel_points_exchange::create_exchange`,
          functionArguments: [points, cryptoValue],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`Points exchange created: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error creating points exchange:', error);
      throw error;
    }
  }

  /**
   * Swap points for crypto
   */
  async swapPoints(account: Account, pointsToSwap: number) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::travel_points_exchange::swap_points`,
          functionArguments: [pointsToSwap],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`Points swapped: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error swapping points:', error);
      throw error;
    }
  }

  /**
   * Add points to account
   */
  async addPoints(account: Account, pointsToAdd: number) {
    try {
      const transaction = await aptosClient.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${this.moduleAddress}::travel_points_exchange::add_points`,
          functionArguments: [pointsToAdd],
        },
      });

      const pendingTxn = await aptosClient.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      const response = await aptosClient.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      logger.info(`Points added: ${response.hash}`);
      return response;
    } catch (error) {
      logger.error('Error adding points:', error);
      throw error;
    }
  }

  /**
   * Get points balance
   */
  async getPointsBalance(address: string): Promise<number> {
    try {
      const payload = {
        function: `${this.moduleAddress}::travel_points_exchange::get_points`,
        type_arguments: [],
        arguments: [address],
      };

      const result = await aptosClient.view({ payload });
      return Number(result[0]);
    } catch (error) {
      logger.error('Error fetching points balance:', error);
      throw error;
    }
  }

  /**
   * Get points crypto value
   */
  async getPointsCryptoValue(address: string): Promise<number> {
    try {
      const payload = {
        function: `${this.moduleAddress}::travel_points_exchange::get_crypto_value`,
        type_arguments: [],
        arguments: [address],
      };

      const result = await aptosClient.view({ payload });
      return Number(result[0]);
    } catch (error) {
      logger.error('Error fetching points crypto value:', error);
      throw error;
    }
  }
}

export const aptosService = new AptosService();
