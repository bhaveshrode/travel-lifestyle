import { Contract, JsonRpcProvider, ethers } from 'ethers';
import { config } from '../config';

/** Chain IDs used by local development nodes. */
const LOCAL_CHAIN_IDS = new Set([31337, 1337]);

/** Address used only to probe whether a node supports account impersonation. */
const IMPERSONATION_PROBE_ADDRESS = '0x0000000000000000000000000000000000000001';

/**
 * Capability detection per provider, so we do not repeatedly probe the node.
 */
const hardhatNodeCache = new WeakMap<object, boolean>();

/**
 * Detect whether the node supports Hardhat's account impersonation RPC methods.
 * Impersonation is a local-development-only feature; public networks reject it.
 */
async function supportsImpersonation(provider: JsonRpcProvider): Promise<boolean> {
  const cached = hardhatNodeCache.get(provider);
  if (cached !== undefined) {
    return cached;
  }

  let supported = false;
  try {
    const { chainId } = await provider.getNetwork();
    if (LOCAL_CHAIN_IDS.has(Number(chainId))) {
      await provider.send('hardhat_impersonateAccount', [IMPERSONATION_PROBE_ADDRESS]);
      supported = true;
      try {
        await provider.send('hardhat_stopImpersonatingAccount', [IMPERSONATION_PROBE_ADDRESS]);
      } catch {
        // Probe account cleanup is best-effort.
      }
    }
  } catch {
    supported = false;
  }

  hardhatNodeCache.set(provider, supported);
  return supported;
}

/**
 * Build a signer for a user address on a local node using impersonation.
 */
async function getImpersonatedSigner(
  provider: JsonRpcProvider,
  address: string
): Promise<ethers.Signer> {
  await provider.send('hardhat_impersonateAccount', [address]);
  const balance = await provider.getBalance(address);
  if (balance < ethers.parseEther('1')) {
    await provider.send('hardhat_setBalance', [
      address,
      `0x${ethers.parseEther('100').toString(16)}`,
    ]);
  }
  return provider.getSigner(address);
}

/**
 * Build a signer from the backend's configured PRIVATE_KEY, if present.
 * This only allows signing for the single account the backend controls.
 */
function getConfiguredSigner(
  provider: JsonRpcProvider,
  address: string
): ethers.Signer {
  const privateKey = config.ethereum.privateKey;
  if (!privateKey) {
    throw new Error(
      'Signing is not available on this network. The backend can only sign for user ' +
        'addresses on a local Hardhat node. Set PRIVATE_KEY in backend/.env to a funded ' +
        'account to enable on-chain writes on public networks.'
    );
  }

  let wallet: ethers.Wallet;
  try {
    wallet = new ethers.Wallet(privateKey, provider);
  } catch {
    throw new Error('PRIVATE_KEY is set but is not a valid private key.');
  }

  if (wallet.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error(
      `This backend can only sign for its configured account ${wallet.address}. ` +
        `The requested signer ${address} is not controlled by the backend.`
    );
  }

  return wallet;
}

/**
 * Parse an amount into a bigint for a uint256 contract argument.
 *
 * Contract amounts are whole units with no decimal scaling, so a fractional
 * input cannot be represented. Rather than silently truncating (which would
 * mis-state balances) or routing through Number (which loses precision above
 * 2^53), reject anything that is not an exact non-negative integer.
 */
export function toAmount(amount: string | number | bigint): bigint {
  if (typeof amount === 'bigint') {
    if (amount < 0n) {
      throw new Error('Amount must not be negative');
    }
    return amount;
  }

  if (typeof amount === 'number') {
    if (!Number.isSafeInteger(amount)) {
      throw new Error(
        'Amount must be a whole number; pass a string for values beyond the safe integer range'
      );
    }
    if (amount < 0) {
      throw new Error('Amount must not be negative');
    }
    return BigInt(amount);
  }

  const trimmed = amount.trim();
  if (!/^\+?\d+$/.test(trimmed)) {
    throw new Error(`Amount must be a non-negative whole number: "${amount}"`);
  }
  return BigInt(trimmed);
}

export function requireAddress(address: string, label: string): string {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`Invalid ${label} address`);
  }
  return ethers.getAddress(address);
}

export async function getUserSigner(
  provider: JsonRpcProvider,
  userAddress: string
): Promise<ethers.Signer> {
  const address = requireAddress(userAddress, 'user');

  if (await supportsImpersonation(provider)) {
    return getImpersonatedSigner(provider, address);
  }

  return getConfiguredSigner(provider, address);
}

export async function sendTx(txPromise: Promise<any>): Promise<string> {
  const tx = await txPromise;
  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error('Transaction was not mined');
  }
  return receipt.hash;
}

export function parseEvent(
  receipt: any,
  contract: Contract,
  eventName: string
): ethers.LogDescription | null {
  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed?.name === eventName) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}
