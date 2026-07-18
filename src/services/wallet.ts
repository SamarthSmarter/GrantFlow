import {
  StellarWalletsKit,
  Networks,
  KitEventType
} from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { Horizon } from '@stellar/stellar-sdk';
import { getNetworkConfig } from './network';

export interface WalletState {
  address: string | null;
  balance: string;
  isConnected: boolean;
  walletType: string | null; // e.g. 'freighter', 'xbull', 'albedo', 'lobstr', 'sandbox'
  network: string;
  isAccountActive: boolean;
}

const MOCK_SANDBOX_ADDRESS = 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111';
const MOCK_SANDBOX_BALANCE = '12000.0000';

let isWalletKitInitialized = false;

export function initWalletKit(): void {
  if (isWalletKitInitialized) return;
  
  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new AlbedoModule(),
      new xBullModule(),
      new LobstrModule(),
    ],
    network: Networks.TESTNET,
  });
  
  isWalletKitInitialized = true;
}

export async function checkFreighterInstalled(): Promise<boolean> {
  return typeof window !== 'undefined' && (!!(window as any).stellar || !!(window as any).freighter);
}

export async function connectWallet(): Promise<{ address: string; walletType: string } | null> {
  const config = getNetworkConfig();
  
  if (config.mode === 'sandbox') {
    localStorage.setItem('grantflow_sandbox_connected', 'true');
    localStorage.setItem('grantflow_sandbox_address', MOCK_SANDBOX_ADDRESS);
    localStorage.setItem('grantflow_wallet_type', 'sandbox');
    if (!localStorage.getItem('grantflow_sandbox_balance')) {
      localStorage.setItem('grantflow_sandbox_balance', MOCK_SANDBOX_BALANCE);
    }
    window.dispatchEvent(new Event('grantflow_balance_change'));
    return { address: MOCK_SANDBOX_ADDRESS, walletType: 'sandbox' };
  }

  initWalletKit();

  try {
    let selectedId = 'unknown';
    const unsubscribe = StellarWalletsKit.on(KitEventType.WALLET_SELECTED, (event: any) => {
      if (event?.payload?.id) {
        selectedId = event.payload.id;
      }
    });

    const res = await StellarWalletsKit.authModal();
    
    if (unsubscribe) {
      unsubscribe();
    }

    localStorage.setItem('grantflow_wallet_connected', 'true');
    localStorage.setItem('grantflow_wallet_address', res.address);
    localStorage.setItem('grantflow_wallet_type', selectedId);
    
    window.dispatchEvent(new Event('grantflow_balance_change'));
    return { address: res.address, walletType: selectedId };
  } catch (err: any) {
    if (err?.code === -1 || err?.message?.includes('closed')) {
      console.log('User closed modal');
      return null;
    }
    console.error('Wallet connection error:', err);
    throw err;
  }
}

export function disconnectWallet(): void {
  const config = getNetworkConfig();
  if (config.mode === 'sandbox') {
    localStorage.setItem('grantflow_sandbox_connected', 'false');
  } else {
    localStorage.setItem('grantflow_wallet_connected', 'false');
  }
  localStorage.removeItem('grantflow_wallet_address');
  localStorage.removeItem('grantflow_wallet_type');
  window.dispatchEvent(new Event('grantflow_balance_change'));
  
  try {
    StellarWalletsKit.disconnect();
  } catch {
    // Ignore if not supported/active
  }
}

export async function signTxWithWallet(xdr: string, publicKey: string): Promise<string> {
  const config = getNetworkConfig();
  if (config.mode === 'sandbox') {
    return xdr;
  }

  initWalletKit();

  const walletType = localStorage.getItem('grantflow_wallet_type');
  if (walletType && walletType !== 'unknown') {
    try {
      StellarWalletsKit.setWallet(walletType);
    } catch (e) {
      console.warn('Could not set active wallet:', e);
    }
  }

  try {
    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      address: publicKey,
      networkPassphrase: config.networkPassphrase,
    });
    return signedTxXdr;
  } catch (error: any) {
    console.error('Wallet signing error:', error);
    throw new Error(error.message || 'Transaction signing rejected or failed.');
  }
}

export async function fetchHorizonBalance(address: string, horizonUrl: string): Promise<{ balance: string; isActive: boolean }> {
  try {
    const server = new Horizon.Server(horizonUrl);
    const accountInfo = await server.loadAccount(address);
    const nativeBalance = accountInfo.balances.find((b) => b.asset_type === 'native');
    return {
      balance: nativeBalance ? parseFloat(nativeBalance.balance).toFixed(4) : '0.0000',
      isActive: true,
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { balance: '0.0000', isActive: false };
    }
    console.error('Error fetching balance from Horizon:', error);
    return { balance: '0.0000', isActive: false };
  }
}

export async function fundWithFriendbot(address: string): Promise<boolean> {
  const config = getNetworkConfig();
  if (config.mode === 'sandbox') {
    const currentBal = parseFloat(localStorage.getItem('grantflow_sandbox_balance') || MOCK_SANDBOX_BALANCE);
    localStorage.setItem('grantflow_sandbox_balance', (currentBal + 1000).toFixed(4));
    window.dispatchEvent(new Event('grantflow_balance_change'));
    return true;
  }
  
  try {
    const friendbotUrl = `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`;
    const response = await fetch(friendbotUrl);
    return response.ok;
  } catch (err) {
    console.error('Friendbot funding failed:', err);
    return false;
  }
}

export async function getWalletState(): Promise<WalletState> {
  const config = getNetworkConfig();
  
  if (config.mode === 'sandbox') {
    const savedAddress = localStorage.getItem('grantflow_sandbox_address') || MOCK_SANDBOX_ADDRESS;
    const savedBalance = localStorage.getItem('grantflow_sandbox_balance') || MOCK_SANDBOX_BALANCE;
    const isConnectedVal = localStorage.getItem('grantflow_sandbox_connected') === 'true';
    
    return {
      address: isConnectedVal ? savedAddress : null,
      balance: isConnectedVal ? savedBalance : '0.0000',
      isConnected: isConnectedVal,
      walletType: 'sandbox',
      network: 'GrantFlow Sandbox',
      isAccountActive: true,
    };
  } else {
    const isConnectedVal = localStorage.getItem('grantflow_wallet_connected') === 'true';
    const address = localStorage.getItem('grantflow_wallet_address');
    const walletType = localStorage.getItem('grantflow_wallet_type');
    
    if (!isConnectedVal || !address) {
      return {
        address: null,
        balance: '0.0000',
        isConnected: false,
        walletType: null,
        network: 'Stellar Testnet',
        isAccountActive: false,
      };
    }
    
    const { balance, isActive } = await fetchHorizonBalance(address, config.horizonUrl);
    return {
      address,
      balance,
      isConnected: true,
      walletType,
      network: 'Stellar Testnet',
      isAccountActive: isActive,
    };
  }
}
