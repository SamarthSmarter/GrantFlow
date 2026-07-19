import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { getWalletState, type WalletState, fundWithFriendbot, connectWallet as connectWalletService, disconnectWallet as disconnectWalletService } from '../services/wallet';
import { getNetworkConfig, setNetworkMode, setContractId, setContractIds, type NetworkConfig } from '../services/network';
import { submitGrant, releaseMilestone, rejectGrant, type GrantFormInput } from '../services/grant';
import confetti from 'canvas-confetti';
import { syncOnChainGrants, syncOnChainEvents } from '../services/contract';

export type PageName = 'landing' | 'dashboard' | 'create-grant' | 'grants' | 'grant-details' | 'milestones' | '404';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface TransactionModalState {
  isOpen: boolean;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  message: string;
  txHash: string;
  grantId: string;
}

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  wallet: WalletState;
  networkConfig: NetworkConfig;
  currentPage: PageName;
  currentGrantId: string | null;
  navigateTo: (page: PageName, grantId?: string | null) => void;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  changeNetworkMode: (mode: 'testnet' | 'sandbox') => void;
  updateContractIdVal: (contractId: string, escrowContractId?: string) => void;
  fundWalletAccount: () => Promise<void>;
  submitGrantAction: (input: GrantFormInput) => Promise<boolean>;
  releaseMilestoneAction: (grantId: string) => Promise<boolean>;
  rejectGrantAction: (grantId: string) => Promise<boolean>;
  txModal: TransactionModalState;
  closeTxModal: () => void;
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  refreshWallet: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('grantflow_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Wallet state
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: '0.0000',
    isConnected: false,
    walletType: null,
    network: 'GrantFlow Sandbox',
    isAccountActive: false,
  });

  // Network configuration
  const [networkConfig, setNetworkConfigState] = useState<NetworkConfig>(getNetworkConfig());

  // Routing state
  const [currentPage, setCurrentPage] = useState<PageName>('landing');
  const [currentGrantId, setCurrentGrantId] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Transaction Modal state
  const [txModal, setTxModal] = useState<TransactionModalState>({
    isOpen: false,
    status: 'pending',
    message: '',
    txHash: '',
    grantId: '',
  });

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('grantflow_theme', theme);
  }, [theme]);

  // Route based on URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#landing';
      if (hash === '#landing') {
        setCurrentPage('landing');
      } else if (hash === '#dashboard') {
        setCurrentPage('dashboard');
      } else if (hash === '#create-grant') {
        setCurrentPage('create-grant');
      } else if (hash === '#grants') {
        setCurrentPage('grants');
      } else if (hash.startsWith('#grant/')) {
        const id = hash.split('/')[1];
        if (id) {
          setCurrentGrantId(id);
          setCurrentPage('grant-details');
        } else {
          setCurrentPage('404');
        }
      } else if (hash === '#milestones') {
        setCurrentPage('milestones');
      } else {
        setCurrentPage('404');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run once on mount

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update wallet and network state
  const refreshWallet = async () => {
    const state = await getWalletState();
    setWallet(state);
    const config = getNetworkConfig();
    setNetworkConfigState(config);
    
    // Background sync of on-chain grants and events
    if (config.mode === 'testnet') {
      try {
        await syncOnChainGrants();
        await syncOnChainEvents();
      } catch (err) {
        console.error('Error during on-chain background sync:', err);
      }
    }
  };

  useEffect(() => {
    refreshWallet();

    const wasConnected = localStorage.getItem('grantflow_wallet_connected') === 'true' || 
                        localStorage.getItem('grantflow_sandbox_connected') === 'true';
    if (wasConnected) {
      if (networkConfig.mode === 'sandbox') {
        localStorage.setItem('grantflow_sandbox_connected', 'true');
      } else {
        localStorage.setItem('grantflow_wallet_connected', 'true');
      }
      refreshWallet();
    }

    const updateHandler = () => {
      refreshWallet();
    };

    window.addEventListener('grantflow_balance_change', updateHandler);
    window.addEventListener('grantflow_network_change', updateHandler);
    window.addEventListener('grantflow_contract_change', updateHandler);
    window.addEventListener('storage', updateHandler);

    // Poll wallet state every 5 seconds
    const interval = setInterval(refreshWallet, 5000);

    return () => {
      window.removeEventListener('grantflow_balance_change', updateHandler);
      window.removeEventListener('grantflow_network_change', updateHandler);
      window.removeEventListener('grantflow_contract_change', updateHandler);
      window.removeEventListener('storage', updateHandler);
      clearInterval(interval);
    };
  }, [networkConfig.mode]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navigateTo = (page: PageName, grantIdVal: string | null = null) => {
    if (page === 'landing') window.location.hash = 'landing';
    else if (page === 'dashboard') window.location.hash = 'dashboard';
    else if (page === 'create-grant') window.location.hash = 'create-grant';
    else if (page === 'grants') window.location.hash = 'grants';
    else if (page === 'grant-details' && grantIdVal) window.location.hash = `grant/${grantIdVal}`;
    else if (page === 'milestones') window.location.hash = 'milestones';
    else window.location.hash = '404';
  };

  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const connectWallet = async (): Promise<boolean> => {
    try {
      const res = await connectWalletService();
      if (res) {
        await refreshWallet();
        showToast(`${res.walletType === 'sandbox' ? 'Sandbox' : res.walletType.toUpperCase()} wallet connected successfully!`, 'success');
        return true;
      } else {
        showToast('Wallet connection cancelled.', 'error');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to connect wallet', 'error');
      return false;
    }
  };

  const disconnectWallet = () => {
    disconnectWalletService();
    setWallet(prev => ({
      ...prev,
      address: null,
      balance: '0.0000',
      isConnected: false,
      walletType: null,
      isAccountActive: false,
    }));
    showToast('Wallet disconnected', 'info');
  };

  const changeNetworkMode = (mode: 'testnet' | 'sandbox') => {
    setNetworkMode(mode);
    setNetworkConfigState(getNetworkConfig());
    
    localStorage.setItem('grantflow_sandbox_connected', 'false');
    localStorage.setItem('grantflow_wallet_connected', 'false');
    
    showToast(`Switched to ${mode === 'testnet' ? 'Stellar Testnet' : 'GrantFlow Sandbox'}`, 'info');
    refreshWallet();
  };

  const updateContractIdVal = (contractId: string, escrowContractId?: string) => {
    if (escrowContractId) {
      setContractIds(contractId, escrowContractId);
    } else {
      setContractId(contractId);
    }
    setNetworkConfigState(getNetworkConfig());
    showToast(`Soroban contract configuration updated`, 'success');
  };

  const fundWalletAccount = async () => {
    if (!wallet.address) {
      showToast('Connect wallet first', 'error');
      return;
    }
    
    showToast('Requesting Friendbot XLM funding...', 'info');
    const success = await fundWithFriendbot(wallet.address);
    
    if (success) {
      showToast('Account funded with +1000 XLM!', 'success');
      await refreshWallet();
    } else {
      showToast('Friendbot funding request failed. Try again later.', 'error');
    }
  };

  const submitGrantAction = async (input: GrantFormInput): Promise<boolean> => {
    setTxModal({
      isOpen: true,
      status: 'pending',
      message: 'Preparing grant submission. Please approve the signing request in your wallet...',
      txHash: '',
      grantId: '',
    });

    try {
      const res = await submitGrant(input);
      if (res.success) {
        setTxModal(prev => ({
          ...prev,
          status: 'success',
          message: 'Grant application submitted successfully on the Stellar network!',
          txHash: res.txHash,
          grantId: res.grantId,
        }));
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
        });
        showToast('Grant application submitted!', 'success');
        refreshWallet();
        return true;
      } else {
        setTxModal(prev => ({
          ...prev,
          status: 'failed',
          message: res.error || 'Transaction simulation failed or rejected by wallet.',
        }));
        showToast(res.error || 'Grant submission failed', 'error');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      setTxModal(prev => ({
        ...prev,
        status: 'failed',
        message: err.message || 'Transaction execution failed.',
      }));
      showToast(err.message || 'Transaction failed', 'error');
      return false;
    }
  };

  const releaseMilestoneAction = async (grantId: string): Promise<boolean> => {
    setTxModal({
      isOpen: true,
      status: 'pending',
      message: 'Preparing milestone release transaction. Please sign in your wallet...',
      txHash: '',
      grantId,
    });

    try {
      const res = await releaseMilestone(grantId);
      if (res.success) {
        setTxModal(prev => ({
          ...prev,
          status: 'success',
          message: 'Milestone funds released! XLM disbursed to applicant on-chain.',
          txHash: res.txHash,
        }));
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#059669', '#34d399', '#f59e0b'],
        });
        showToast('Milestone funds released!', 'success');
        refreshWallet();
        return true;
      } else {
        setTxModal(prev => ({
          ...prev,
          status: 'failed',
          message: res.error || 'Milestone release failed or was rejected.',
        }));
        showToast(res.error || 'Release failed', 'error');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      setTxModal(prev => ({
        ...prev,
        status: 'failed',
        message: err.message || 'Release execution failed.',
      }));
      showToast(err.message || 'Release failed', 'error');
      return false;
    }
  };

  const rejectGrantAction = async (grantId: string): Promise<boolean> => {
    setTxModal({
      isOpen: true,
      status: 'pending',
      message: 'Preparing withdrawal request. Please sign the transaction in your wallet...',
      txHash: '',
      grantId,
    });

    try {
      const res = await rejectGrant(grantId);
      if (res.success) {
        setTxModal(prev => ({
          ...prev,
          status: 'cancelled',
          message: 'Grant application withdrawn successfully on-chain.',
          txHash: res.txHash,
        }));
        showToast('Grant application withdrawn', 'info');
        refreshWallet();
        return true;
      } else {
        setTxModal(prev => ({
          ...prev,
          status: 'failed',
          message: res.error || 'Withdrawal failed or was rejected.',
        }));
        showToast(res.error || 'Withdrawal failed', 'error');
        return false;
      }
    } catch (err: any) {
      console.error(err);
      setTxModal(prev => ({
        ...prev,
        status: 'failed',
        message: err.message || 'Withdrawal execution failed.',
      }));
      showToast(err.message || 'Withdrawal failed', 'error');
      return false;
    }
  };

  const closeTxModal = () => {
    setTxModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        wallet,
        networkConfig,
        currentPage,
        currentGrantId,
        navigateTo,
        connectWallet,
        disconnectWallet,
        changeNetworkMode,
        updateContractIdVal,
        fundWalletAccount,
        submitGrantAction,
        releaseMilestoneAction,
        rejectGrantAction,
        txModal,
        closeTxModal,
        toasts,
        showToast,
        dismissToast,
        refreshWallet,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useGrantFlow() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useGrantFlow must be used within an AppProvider');
  }
  return context;
}
