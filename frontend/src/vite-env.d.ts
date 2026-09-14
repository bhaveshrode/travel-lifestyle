/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ETHEREUM_NETWORK: string;
  readonly VITE_ETHEREUM_RPC_URL: string;
  readonly VITE_CHAIN_ID: string;
  readonly VITE_TRAVEL_CARD_ADDRESS: string;
  readonly VITE_NFTS_ADDRESS: string;
  readonly VITE_POINTS_ADDRESS: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_DESCRIPTION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on?: (event: string, handler: (...args: any[]) => void) => void;
    removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  };
}
