const HARDHAT_CHAIN_HEX = '0x7A69';
const CONNECT_TIMEOUT_MS = 20000;

function getEthereum() {
  return window.ethereum;
}

export function isWalletAvailable(): boolean {
  return Boolean(getEthereum());
}

export function isEmbeddedFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function ensureLocalNetwork(): Promise<void> {
  const ethereum = getEthereum();
  if (!ethereum) {
    return;
  }

  const targetChainId = import.meta.env.VITE_CHAIN_ID
    ? `0x${Number(import.meta.env.VITE_CHAIN_ID).toString(16)}`
    : HARDHAT_CHAIN_HEX;
  const chainId = await ethereum.request({ method: 'eth_chainId' });
  if (String(chainId).toLowerCase() === targetChainId.toLowerCase()) {
    return;
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainId }],
    });
  } catch (error: any) {
    if (error?.code !== 4902) {
      throw error;
    }
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: targetChainId,
          chainName: 'Hardhat Local',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [import.meta.env.VITE_ETHEREUM_RPC_URL || 'http://127.0.0.1:8545'],
        },
      ],
    });
  }
}

export async function connectWallet(): Promise<string> {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new Error('MetaMask is not installed. Install the extension, then open this page in a new tab.');
  }

  if (isEmbeddedFrame()) {
    throw new Error('MetaMask cannot open inside an embedded preview. Open this page in a new browser tab, then try again.');
  }

  const request = ethereum.request({ method: 'eth_requestAccounts' });
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('MetaMask did not respond. Check the extension popup, or unlock MetaMask and retry.'));
    }, CONNECT_TIMEOUT_MS);
  });

  const accounts: string[] = await Promise.race([request, timeout]);
  if (!accounts?.[0]) {
    throw new Error('No account selected in MetaMask');
  }

  try {
    await ensureLocalNetwork();
  } catch {
    // Address is still usable if the local chain is not added
  }

  return accounts[0];
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}


