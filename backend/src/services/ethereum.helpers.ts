import { Contract, JsonRpcProvider, ethers } from 'ethers';

export function toAmount(amount: string | number | bigint): bigint {
  if (typeof amount === 'bigint') {
    return amount;
  }
  const asString = amount.toString();
  if (asString.includes('.')) {
    return BigInt(Math.floor(Number(asString)));
  }
  return BigInt(asString);
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
