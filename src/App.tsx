import { useState, useEffect } from 'react';
import { 
  AnimatePresence, 
  motion 
} from 'framer-motion';
import { 
  Wallet, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Sun, 
  Moon, 
  ExternalLink, 
  FileText, 
  Activity, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X, 
  History, 
  Sparkles, 
  Globe, 
  RefreshCw,
  Copy,
  Info,
  Target,
  TrendingUp,
  Shield,
  Zap,
  BookOpen,
  Award,
  Clock
} from 'lucide-react';
import { AppProvider, useGrantFlow, type PageName } from './hooks/useGrantFlow';
import { getGrants, getCombinedActivityFeed, getGrantById, type GrantFormInput } from './services/grant';
import { getTransactionHistory, type TransactionItem } from './services/transactions';
import { type GrantContractState } from './services/contract';

// Helper to format addresses for display
const formatAddress = (address: string | null) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
};

// Helper for date formatting
const formatDate = (dateString: string) => {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

// Notification Toast Container Component
function ToastsContainer() {
  const { toasts, dismissToast } = useGrantFlow();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`p-4 rounded-xl shadow-lg flex items-start gap-3 border ${
              toast.type === 'success' 
                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/40' 
                : toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800/40'
                : 'bg-zinc-50 text-zinc-800 border-zinc-200 dark:bg-zinc-950/40 dark:text-zinc-200 dark:border-zinc-800/40'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />}
            <div className="flex-1 text-sm font-dm font-medium leading-relaxed">
              {toast.message}
            </div>
            <button 
              onClick={() => dismissToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Transaction Status Modal Component
function TransactionStatusModal() {
  const { txModal, closeTxModal } = useGrantFlow();

  if (!txModal.isOpen) return null;

  const renderStatusIcon = () => {
    switch (txModal.status) {
      case 'pending':
      case 'processing':
        return (
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary-dark dark:text-brand-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
            <AlertCircle className="w-10 h-10" />
          </div>
        );
      case 'failed':
      default:
        return (
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
            <XCircle className="w-10 h-10" />
          </div>
        );
    }
  };

  const getStatusTitle = () => {
    switch (txModal.status) {
      case 'pending': return 'Preparing Transaction';
      case 'processing': return 'Broadcasting to Stellar';
      case 'success': return 'Transaction Succeeded';
      case 'cancelled': return 'Application Withdrawn';
      case 'failed': return 'Transaction Failed';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-brand-dark/95 border border-brand-border/30 dark:border-white/10 shadow-2xl relative"
      >
        <button 
          onClick={closeTxModal}
          disabled={txModal.status === 'processing' || txModal.status === 'pending'}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          {renderStatusIcon()}

          <h3 className="mt-4 text-xl font-sora font-bold text-gray-900 dark:text-white">
            {getStatusTitle()}
          </h3>

          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-dm px-2 leading-relaxed">
            {txModal.message}
          </p>

          {txModal.txHash && (
            <div className="mt-6 w-full p-3 rounded-lg bg-brand-surface/50 dark:bg-brand-dark/50 border border-brand-border/20 text-left">
              <span className="text-xs text-gray-400 block font-mono">TRANSACTION HASH</span>
              <a 
                href={txModal.txHash.startsWith('sandbox_hash_') ? '#' : `https://stellar.expert/explorer/testnet/tx/${txModal.txHash}`}
                target={txModal.txHash.startsWith('sandbox_hash_') ? '_self' : '_blank'}
                rel="noreferrer"
                className="text-xs text-brand-primary-dark dark:text-brand-primary hover:underline break-all mt-1 flex items-center gap-1 font-mono"
              >
                {txModal.txHash}
                {!txModal.txHash.startsWith('sandbox_hash_') && <ExternalLink className="w-3 h-3 inline" />}
              </a>
            </div>
          )}

          {txModal.grantId && txModal.status === 'success' && (
            <div className="mt-2 w-full p-3 rounded-lg bg-brand-surface/50 dark:bg-brand-dark/50 border border-brand-border/20 text-left">
              <span className="text-xs text-gray-400 block font-mono">GRANT ID</span>
              <span className="text-xs text-brand-primary-dark dark:text-brand-primary font-mono">
                {txModal.grantId}
              </span>
            </div>
          )}

          {(txModal.status === 'success' || txModal.status === 'failed' || txModal.status === 'cancelled') && (
            <button
              onClick={closeTxModal}
              className="mt-6 w-full py-2.5 rounded-xl bg-brand-primary-dark text-white hover:bg-opacity-90 font-semibold text-sm transition-all"
            >
              Dismiss
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Wallet Connection Modal
function WalletModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { 
    wallet, 
    networkConfig, 
    changeNetworkMode, 
    connectWallet, 
    fundWalletAccount,
    updateContractIdVal,
    showToast,
    disconnectWallet
  } = useGrantFlow();

  const [sandboxAddressInput, setSandboxAddressInput] = useState(
    () => localStorage.getItem('grantflow_sandbox_address') || 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111'
  );

  const [contractIdInput, setContractIdInput] = useState(
    () => networkConfig.contractId
  );

  const [escrowContractIdInput, setEscrowContractIdInput] = useState(
    () => networkConfig.milestoneEscrowContractId
  );

  useEffect(() => {
    setContractIdInput(networkConfig.contractId);
    setEscrowContractIdInput(networkConfig.milestoneEscrowContractId);
  }, [networkConfig]);

  const handleSaveSandboxAddress = () => {
    if (!sandboxAddressInput.trim() || !sandboxAddressInput.startsWith('G')) {
      showToast('Address must start with G (Stellar Public Key format)', 'error');
      return;
    }
    localStorage.setItem('grantflow_sandbox_address', sandboxAddressInput.trim());
    showToast('Sandbox address updated', 'success');
  };

  const handleSaveContractIds = () => {
    if (!contractIdInput.trim() || !/^C[A-Z2-7]{55}$/.test(contractIdInput.trim())) {
      showToast('Grant Registry Contract ID must be a valid 56-character Soroban contract ID starting with C', 'error');
      return;
    }
    if (!escrowContractIdInput.trim() || !/^C[A-Z2-7]{55}$/.test(escrowContractIdInput.trim())) {
      showToast('Milestone Escrow Contract ID must be a valid 56-character Soroban contract ID starting with C', 'error');
      return;
    }
    updateContractIdVal(contractIdInput.trim(), escrowContractIdInput.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-brand-dark/95 border border-brand-border/30 dark:border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-brand-border/20 dark:border-white/5 flex justify-between items-center bg-brand-surface/30 dark:bg-brand-dark/50">
          <h3 className="text-lg font-sora font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-brand-primary" />
            Wallet Configuration
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Network Selection */}
          <div>
            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 block mb-2 font-mono">
              SELECT NETWORK MODE
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => changeNetworkMode('sandbox')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  networkConfig.mode === 'sandbox'
                    ? 'border-brand-primary-dark bg-brand-primary/10 dark:border-brand-primary dark:bg-brand-primary/10'
                    : 'border-brand-border/30 hover:border-brand-border dark:border-white/5'
                }`}
              >
                <div className="text-sm font-semibold flex items-center gap-1.5 dark:text-white">
                  <Sparkles className="w-4 h-4 text-brand-primary" />
                  GrantFlow Sandbox
                </div>
                <span className="text-xs text-gray-500">Test grant flows instantly. No wallet extension needed.</span>
              </button>

              <button
                onClick={() => changeNetworkMode('testnet')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  networkConfig.mode === 'testnet'
                    ? 'border-brand-secondary bg-brand-secondary/10 dark:border-brand-secondary dark:bg-brand-secondary/10'
                    : 'border-brand-border/30 hover:border-brand-border dark:border-white/5'
                }`}
              >
                <div className="text-sm font-semibold flex items-center gap-1.5 dark:text-white">
                  <Globe className="w-4 h-4 text-brand-secondary" />
                  Stellar Testnet
                </div>
                <span className="text-xs text-gray-500">Execute real Soroban contracts signed via Freighter.</span>
              </button>
            </div>
          </div>

          {/* Connection Status Section */}
          <div className="p-4 rounded-xl bg-brand-surface/30 dark:bg-brand-dark border border-brand-border/20">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-400 block font-mono">CONNECTION STATE</span>
                <span className="text-sm font-semibold dark:text-white mt-0.5 block">
                  {wallet.isConnected ? 'Connected' : 'Disconnected'} 
                  <span className="text-xs text-gray-400 font-normal"> ({wallet.network})</span>
                </span>
              </div>
              <div>
                {wallet.isConnected ? (
                  <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold font-mono">
                    ACTIVE
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-500 dark:bg-brand-dark dark:text-gray-400 font-semibold font-mono border border-brand-border/25">
                    INACTIVE
                  </span>
                )}
              </div>
            </div>

            {wallet.isConnected && wallet.address && (
              <div className="mt-3 pt-3 border-t border-brand-border/10">
                <span className="text-xs text-gray-400 block font-mono">WALLET ADDRESS</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs font-mono dark:text-gray-300 select-all break-all pr-2">
                    {wallet.address}
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(wallet.address || '');
                      showToast('Address copied to clipboard', 'info');
                    }}
                    className="p-1 hover:bg-brand-surface dark:hover:bg-brand-dark/40 rounded transition-all text-gray-500"
                    title="Copy Address"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <span className="text-xs text-gray-400 block mt-2 font-mono">ACCOUNT BALANCE</span>
                <span className="text-lg font-bold font-mono text-brand-primary-dark dark:text-white">
                  {wallet.balance} XLM
                </span>

                {!wallet.isAccountActive && networkConfig.mode === 'testnet' && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/30 text-xs">
                    <p className="font-semibold mb-1">Account not active on Testnet!</p>
                    Your address has not been registered on the Stellar Testnet ledger yet. Click fund to request 10,000 XLM from Friendbot faucet.
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {!wallet.isConnected ? (
                <button
                  onClick={async () => {
                    const success = await connectWallet();
                    if (success) onClose();
                  }}
                  className="flex-1 py-2 rounded-xl bg-brand-primary-dark text-white hover:bg-opacity-95 text-sm font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              ) : (
                <>
                  {(!wallet.isAccountActive || networkConfig.mode === 'sandbox') && (
                    <button
                      onClick={fundWalletAccount}
                      className="py-2 px-4 rounded-xl bg-brand-secondary text-white hover:bg-opacity-90 text-sm font-semibold transition-all"
                    >
                      Fund Wallet
                    </button>
                  )}
                  <button
                    onClick={() => {
                      disconnectWallet();
                    }}
                    className="flex-1 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20 text-sm font-semibold transition-all"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Config Settings Form based on Network Mode */}
          {networkConfig.mode === 'sandbox' ? (
            <div className="space-y-3 pt-3 border-t border-brand-border/10">
              <label className="text-xs font-bold text-gray-400 block font-mono">
                SANDBOX CUSTOM ADDRESS (MOCK SENDER/RECEIVER)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sandboxAddressInput}
                  onChange={(e) => setSandboxAddressInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-brand-border/30 rounded-lg focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white"
                />
                <button
                  onClick={handleSaveSandboxAddress}
                  className="px-3 py-2 text-xs rounded-lg bg-brand-primary-dark text-white hover:bg-opacity-90 font-semibold transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-3 border-t border-brand-border/10">
              <div>
                <label className="text-xs font-bold text-gray-400 block font-mono mb-1">
                  GRANT REGISTRY CONTRACT ADDRESS (TESTNET)
                </label>
                <input
                  type="text"
                  value={contractIdInput}
                  onChange={(e) => setContractIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border/30 rounded-lg focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block font-mono mb-1">
                  MILESTONE ESCROW CONTRACT ADDRESS (TESTNET)
                </label>
                <input
                  type="text"
                  value={escrowContractIdInput}
                  onChange={(e) => setEscrowContractIdInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-brand-border/30 rounded-lg focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white font-mono"
                />
              </div>
              <button
                onClick={handleSaveContractIds}
                className="w-full py-2 text-xs rounded-xl bg-brand-primary-dark text-white hover:bg-opacity-90 font-semibold transition-all font-mono"
              >
                SAVE CONTRACT CONFIGURATION
              </button>
              <p className="text-[10px] text-gray-500">
                Provide the active grant registry and milestone escrow contract IDs deployed on testnet.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Navigation Layout Shell
function Layout({ children, onOpenWalletModal }: { children: React.ReactNode; onOpenWalletModal: () => void }) {
  const { 
    wallet, 
    currentPage, 
    currentGrantId,
    navigateTo, 
    theme, 
    toggleTheme,
    networkConfig,
    disconnectWallet
  } = useGrantFlow();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPage]);

  const navItems = [
    { name: 'Dashboard', id: 'dashboard' as PageName, icon: TrendingUp },
    { name: 'Grant Applications', id: 'grants' as PageName, icon: FileText },
    { name: 'Milestones', id: 'milestones' as PageName, icon: Target },
  ];

  if (currentPage === 'landing') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-brand-surface/50 dark:bg-brand-dark/20 flex flex-col md:flex-row">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-brand-dark border-r border-brand-border/20 dark:border-white/5 shrink-0 select-none">
        {/* Brand */}
        <div 
          onClick={() => navigateTo('landing')}
          className="h-16 border-b border-brand-border/10 dark:border-white/5 flex items-center gap-2 px-6 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-primary to-brand-primary-dark flex items-center justify-center shrink-0">
            <span className="text-white font-sora font-bold text-sm">G</span>
          </div>
          <span className="font-sora text-xl font-bold bg-gradient-to-r from-brand-primary-dark to-brand-secondary dark:from-brand-primary dark:to-brand-secondary bg-clip-text text-transparent">
            GrantFlow
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-primary/10 text-brand-primary-dark dark:bg-brand-primary/20 dark:text-brand-primary mt-1 font-mono">
            v1.0
          </span>
        </div>

        {/* Wallet state card */}
        <div className="p-4 border-b border-brand-border/10 dark:border-white/5">
          <div className="p-3 rounded-xl bg-brand-surface/40 dark:bg-brand-dark/40 border border-brand-border/15">
            <span className="text-[10px] text-gray-400 block font-mono">NETWORK</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${networkConfig.mode === 'testnet' ? 'bg-brand-secondary animate-pulse' : 'bg-brand-primary'}`}></span>
              <span className="text-xs font-semibold dark:text-white">{networkConfig.mode === 'testnet' ? 'Stellar Testnet' : 'Sandbox'}</span>
            </div>

            {wallet.isConnected ? (
              <div className="mt-3">
                <span className="text-[10px] text-gray-400 block font-mono">WALLET</span>
                <span className="text-xs font-semibold font-mono dark:text-gray-200">
                  {formatAddress(wallet.address)}
                </span>
                <span className="text-sm font-bold block font-mono text-brand-primary-dark dark:text-white mt-1">
                  {wallet.balance} XLM
                </span>
              </div>
            ) : (
              <button 
                onClick={onOpenWalletModal}
                className="mt-3 w-full py-1.5 text-xs font-semibold rounded-lg bg-brand-primary-dark text-white hover:bg-opacity-90 transition-all flex items-center justify-center gap-1"
              >
                <Wallet className="w-3.5 h-3.5" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Menu Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (item.id === 'grants' && currentPage === 'grant-details');
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-primary-dark text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-brand-surface/80 dark:hover:bg-brand-dark/40 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-brand-border/10 dark:border-white/5 flex gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-brand-surface/50 dark:bg-brand-dark/40 hover:bg-brand-surface dark:hover:bg-brand-dark/80 text-gray-500 dark:text-gray-400 transition-all flex-1 flex justify-center"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={onOpenWalletModal}
            className="p-2 rounded-lg bg-brand-surface/50 dark:bg-brand-dark/40 hover:bg-brand-surface dark:hover:bg-brand-dark/80 text-gray-500 dark:text-gray-400 transition-all flex-1 flex justify-center"
            title="Configure Wallet"
          >
            <Wallet className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Top Navbar - Mobile */}
      <header className="md:hidden h-16 bg-white dark:bg-brand-dark border-b border-brand-border/20 dark:border-white/5 flex items-center justify-between px-4 z-40 select-none">
        <div 
          onClick={() => navigateTo('landing')}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-primary to-brand-primary-dark flex items-center justify-center">
            <span className="text-white font-sora font-bold text-xs">G</span>
          </div>
          <span className="font-sora text-xl font-bold bg-gradient-to-r from-brand-primary-dark to-brand-secondary dark:from-brand-primary dark:to-brand-secondary bg-clip-text text-transparent">
            GrantFlow
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded hover:bg-brand-surface dark:hover:bg-brand-dark/50 text-gray-500 dark:text-gray-400"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded hover:bg-brand-surface dark:hover:bg-brand-dark/50 text-gray-500 dark:text-gray-400"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white dark:bg-brand-dark border-b border-brand-border/20 dark:border-white/5 overflow-hidden z-30 select-none"
          >
            <div className="p-4 space-y-3">
              <div className="p-3 rounded-xl bg-brand-surface/30 dark:bg-brand-dark/30 border border-brand-border/15 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-gray-400 block font-mono">ACTIVE MODE</span>
                  <span className="text-xs font-semibold dark:text-white">{networkConfig.mode === 'testnet' ? 'Stellar Testnet' : 'Sandbox'}</span>
                </div>
                {wallet.isConnected ? (
                  <span className="text-xs font-bold font-mono text-brand-primary-dark dark:text-white">
                    {wallet.balance} XLM
                  </span>
                ) : (
                  <button 
                    onClick={onOpenWalletModal}
                    className="py-1 px-2.5 text-xs font-bold rounded-lg bg-brand-primary-dark text-white hover:bg-opacity-90"
                  >
                    Connect
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id || (item.id === 'grants' && currentPage === 'grant-details');
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-brand-primary-dark text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-brand-surface/80 dark:hover:bg-brand-dark/40 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.name}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-border/10">
                <button
                  onClick={onOpenWalletModal}
                  className="py-2 border border-brand-border/20 dark:border-white/5 rounded-lg text-xs font-semibold dark:text-white flex items-center justify-center gap-1"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Wallet Config
                </button>
                <button
                  onClick={() => {
                    disconnectWallet();
                    setMobileMenuOpen(false);
                  }}
                  className="py-2 border border-red-100 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50"
                  disabled={!wallet.isConnected}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1400px] w-full mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage + (currentGrantId || '')}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}

// ==========================================
// LANDING PAGE
// ==========================================
function LandingPage() {
  const { navigateTo, wallet, theme, toggleTheme } = useGrantFlow();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col font-dm">
      {/* Landing Nav */}
      <header className="h-20 max-w-7xl mx-auto w-full px-6 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-brand-primary-dark flex items-center justify-center shadow-lg">
            <span className="text-white font-sora font-bold text-base">G</span>
          </div>
          <span className="font-sora text-2xl font-extrabold bg-gradient-to-r from-brand-primary-dark via-brand-primary to-brand-secondary dark:from-brand-primary dark:to-brand-secondary bg-clip-text text-transparent">
            GrantFlow
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-brand-surface/80 dark:hover:bg-brand-dark text-gray-600 dark:text-gray-400"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          
          {wallet.isConnected ? (
            <button 
              onClick={() => navigateTo('dashboard')}
              className="px-5 py-2 rounded-xl bg-brand-primary-dark hover:bg-opacity-95 text-white font-medium text-sm transition-all shadow-md flex items-center gap-1.5"
            >
              Enter Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={() => setWalletModalOpen(true)}
              className="px-5 py-2 rounded-xl border border-brand-primary-dark text-brand-primary-dark dark:border-brand-primary dark:text-brand-primary font-semibold text-sm hover:bg-brand-primary-dark hover:text-white transition-all shadow-sm flex items-center gap-1.5"
            >
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto w-full px-6 pt-12 pb-20 flex flex-col lg:flex-row items-center gap-16 flex-grow">
        <div className="flex-1 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary-dark dark:text-brand-primary text-xs font-semibold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></span>
            LIVE ON STELLAR TESTNET
          </div>
          <h1 className="text-5xl lg:text-6xl font-sora font-extrabold text-gray-900 dark:text-white leading-[1.1] tracking-tight">
            Fund. Track.<br />
            <span className="bg-gradient-to-r from-brand-primary-dark to-brand-secondary dark:from-brand-primary dark:to-brand-secondary bg-clip-text text-transparent">
              Deliver. On Stellar.
            </span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed font-dm max-w-xl">
            A decentralized grant management and milestone-based funding protocol built on Soroban smart contracts. Submit proposals, track milestones, and release XLM funds trustlessly — directly on-chain.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button 
              onClick={() => {
                if (wallet.isConnected) {
                  navigateTo('dashboard');
                } else {
                  setWalletModalOpen(true);
                }
              }}
              className="px-8 py-3.5 rounded-xl bg-brand-primary-dark text-white hover:bg-opacity-95 font-semibold text-base transition-all shadow-lg ambient-glow flex items-center gap-2"
            >
              Launch GrantFlow
              <ArrowRight className="w-5 h-5" />
            </button>
            <a 
              href="#how-it-works"
              className="px-8 py-3.5 rounded-xl border border-brand-border/40 text-gray-600 dark:text-gray-400 font-semibold text-base hover:bg-brand-surface/50 dark:hover:bg-brand-dark transition-all flex items-center justify-center"
            >
              Try Sandbox
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-semibold text-gray-400 font-mono">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> SOROBAN SMART CONTRACTS</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> FREIGHTER WALLET SUPPORT</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-brand-primary" /> MILESTONE ESCROW</span>
          </div>
        </div>

        {/* Hero Visual Mockup — Grant Card */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="p-1 rounded-2xl bg-gradient-to-tr from-brand-primary/20 via-brand-border/20 to-brand-secondary/20 shadow-2xl"
          >
            <div className="rounded-xl bg-white dark:bg-brand-dark/95 border border-brand-border/10 p-6 space-y-5">
              {/* Mock Grant header */}
              <div className="flex justify-between items-start border-b border-brand-border/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-brand-primary block font-mono">GRANTFLOW PREVIEW</span>
                  <h4 className="text-lg font-sora font-bold text-gray-900 dark:text-white mt-1">Open-Source DeFi Analytics</h4>
                  <span className="text-xs text-gray-400 mt-0.5 block font-mono">ID: grt_dao2026</span>
                </div>
                <div className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 font-mono">
                  PENDING
                </div>
              </div>

              {/* Mock Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-400 block font-mono">GRANTOR</span>
                  <span className="font-semibold dark:text-white">Stellar Community DAO</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-mono">MILESTONE DUE</span>
                  <span className="font-semibold dark:text-white font-mono">2026-09-30</span>
                </div>
              </div>

              {/* Milestone progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-mono">MILESTONE PROGRESS</span>
                  <span className="text-brand-primary font-mono font-semibold">2 / 3 COMPLETE</span>
                </div>
                <div className="h-2 rounded-full bg-brand-surface dark:bg-brand-dark/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '66%' }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                  />
                </div>
              </div>

              {/* Amount and release button */}
              <div className="p-4 rounded-xl bg-brand-surface/30 dark:bg-brand-dark border border-brand-border/20 flex justify-between items-center">
                <div>
                  <span className="text-xs text-gray-400 block font-mono">GRANT AMOUNT</span>
                  <span className="text-xl font-extrabold text-brand-primary-dark dark:text-white font-mono">8,500.00 XLM</span>
                </div>
                <button className="px-4 py-2 rounded-xl bg-brand-primary-dark text-white font-bold text-xs hover:bg-opacity-90 transition-all flex items-center gap-1 shadow-sm">
                  <Zap className="w-3.5 h-3.5" />
                  Release Milestone
                </button>
              </div>

              {/* Live feed */}
              <div>
                <span className="text-xs text-gray-400 block font-mono mb-2">LIVE EVENT FEED</span>
                <div className="flex gap-2.5 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5"></span>
                  <p className="flex-1 text-left leading-relaxed">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">grt_dao2026</span> submitted on-chain. <br />
                    <span className="text-[10px] text-gray-400 font-mono">Tx Hash: sandbox_hash_submit_77ac21...</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-brand-border/10 dark:border-white/5 bg-white dark:bg-brand-dark/20">
        <div className="max-w-7xl mx-auto w-full px-6 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-sora font-bold text-gray-900 dark:text-white">
              Why Decentralized Grant Funding?
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Traditional grant programs rely on trust and manual verification. GrantFlow makes it trustless, transparent, and instant.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-brand-surface/30 dark:bg-brand-dark/30 border border-brand-border/20 text-left space-y-4 hover:border-brand-primary/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold dark:text-white">Milestone Escrow</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Grant funds are locked in a Soroban escrow contract and released only upon verified milestone completion — no trust required.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-surface/30 dark:bg-brand-dark/30 border border-brand-border/20 text-left space-y-4 hover:border-brand-primary/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-brand-secondary/20 flex items-center justify-center text-brand-secondary dark:text-brand-secondary">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold dark:text-white">On-Chain Transparency</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Every grant submission, milestone release, and rejection is recorded immutably on the Stellar ledger. Fully auditable by anyone.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-surface/30 dark:bg-brand-dark/30 border border-brand-border/20 text-left space-y-4 hover:border-brand-primary/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold dark:text-white">Sub-Second Settlement</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                When milestones are approved, XLM transfers finalize in ~5 seconds. No banking delays, no wire transfer fees, no intermediaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 border-t border-brand-border/10 dark:border-white/5">
        <div className="max-w-7xl mx-auto w-full px-6 text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl font-sora font-bold text-gray-900 dark:text-white">How GrantFlow Works</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Get your grant funded in three on-chain steps.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="space-y-3 text-center">
              <span className="w-12 h-12 rounded-full border-2 border-brand-primary-dark text-brand-primary-dark dark:border-brand-primary dark:text-brand-primary flex items-center justify-center mx-auto text-xl font-bold font-mono">1</span>
              <h4 className="text-base font-bold dark:text-white">Connect & Submit</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">Link your Freighter wallet or use Sandbox mode. Submit a grant proposal with milestone requirements and funding amount.</p>
            </div>

            <div className="space-y-3 text-center">
              <span className="w-12 h-12 rounded-full border-2 border-brand-primary-dark text-brand-primary-dark dark:border-brand-primary dark:text-brand-primary flex items-center justify-center mx-auto text-xl font-bold font-mono">2</span>
              <h4 className="text-base font-bold dark:text-white">Funds Locked in Escrow</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">Grant funds are held in a Soroban milestone escrow contract until milestones are verified by the grantor.</p>
            </div>

            <div className="space-y-3 text-center">
              <span className="w-12 h-12 rounded-full border-2 border-brand-primary-dark text-brand-primary-dark dark:border-brand-primary dark:text-brand-primary flex items-center justify-center mx-auto text-xl font-bold font-mono">3</span>
              <h4 className="text-base font-bold dark:text-white">Milestone Released</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">Upon milestone approval, XLM is disbursed to the applicant's wallet atomically on-chain. No trust needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Landing Footer */}
      <footer className="py-8 border-t border-brand-border/10 dark:border-white/5 bg-white dark:bg-brand-dark/20 text-center select-none">
        <p className="text-xs text-gray-400 font-mono">
          GrantFlow © 2026. Decentralized Grant Protocol on Stellar Network.
        </p>
      </footer>

      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
    </div>
  );
}

// ==========================================
// DASHBOARD
// ==========================================
function DashboardPage({ onOpenWalletModal }: { onOpenWalletModal: () => void }) {
  const { wallet, navigateTo, networkConfig, fundWalletAccount } = useGrantFlow();
  const [grants, setGrants] = useState<GrantContractState[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  const fetchDashboardData = () => {
    setGrants(getGrants());
    setActivityFeed(getCombinedActivityFeed().slice(0, 5));
  };

  useEffect(() => {
    fetchDashboardData();

    const handleGrantUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener('grantflow_grants_change', handleGrantUpdate);
    window.addEventListener('grantflow_events_update', handleGrantUpdate);

    return () => {
      window.removeEventListener('grantflow_grants_change', handleGrantUpdate);
      window.removeEventListener('grantflow_events_update', handleGrantUpdate);
    };
  }, []);

  const activeAddress = wallet.address;
  const userGrants = grants.filter(g => g.applicant === activeAddress || !activeAddress);
  const pendingGrants = userGrants.filter(g => g.status === 'pending');
  const fundedGrants = userGrants.filter(g => g.status === 'funded');
  
  const totalDisbursed = fundedGrants.reduce((sum, g) => sum + parseFloat(g.amount), 0).toFixed(2);
  const pendingVolume = pendingGrants.reduce((sum, g) => sum + parseFloat(g.amount), 0).toFixed(2);

  return (
    <div className="space-y-6 font-dm text-left">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sora font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
            {networkConfig.mode === 'testnet' ? 'STELLAR TESTNET INTEGRATION' : 'SANDBOX MODE'}
          </p>
        </div>
        <div className="flex gap-2">
          {wallet.isConnected && networkConfig.mode === 'sandbox' && (
            <button
              onClick={fundWalletAccount}
              className="px-4 py-2 border border-brand-border/30 rounded-xl text-xs font-semibold hover:bg-brand-surface/50 dark:hover:bg-brand-dark dark:border-white/5 dark:text-white flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Request XLM Faucet
            </button>
          )}
          <button
            onClick={() => navigateTo('create-grant')}
            className="px-4 py-2 bg-brand-primary-dark text-white hover:bg-opacity-95 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Submit Grant
          </button>
        </div>
      </div>

      {/* Network Alert */}
      {!wallet.isConnected && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Wallet Not Connected</p>
            Connect Freighter or launch Sandbox to view balance details and interact with the Grant Registry contract.
            <button 
              onClick={onOpenWalletModal}
              className="underline font-semibold block mt-1 hover:text-amber-900"
            >
              Connect Wallet Now
            </button>
          </div>
        </div>
      )}

      {/* Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Wallet Connection Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm flex flex-col justify-between h-40">
          <div>
            <span className="text-[10px] text-gray-400 font-bold block font-mono">WALLET DETAILS</span>
            {wallet.isConnected ? (
              <div className="mt-2 space-y-1">
                <span className="text-sm font-semibold dark:text-white block font-mono truncate pr-4">
                  {wallet.address}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                  Network: {wallet.network}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                Connect Freighter to query your address on the Stellar ledger.
              </p>
            )}
          </div>
          <div>
            {!wallet.isConnected ? (
              <button 
                onClick={onOpenWalletModal}
                className="py-1.5 px-4 bg-brand-primary-dark text-white rounded-lg font-semibold text-xs hover:bg-opacity-95"
              >
                Connect Freighter
              </button>
            ) : (
              <div className="flex gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-mono">
                  CONNECTED
                </span>
                {wallet.isAccountActive ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400 font-mono">
                    ON-CHAIN ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-mono">
                    INACTIVE
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Balance Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm flex flex-col justify-between h-40">
          <div>
            <span className="text-[10px] text-gray-400 font-bold block font-mono">AVAILABLE BALANCE</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-brand-primary-dark dark:text-white font-mono">
                {wallet.isConnected ? wallet.balance : '0.0000'}
              </span>
              <span className="text-xs text-gray-500 font-bold font-mono">XLM</span>
            </div>
            <span className="text-[10px] text-gray-400 block mt-1">Stellar Native Gas Token</span>
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-1 font-mono border-t border-brand-border/10 pt-2">
            <RefreshCw className="w-3 h-3 text-brand-primary" />
            AUTO-REFRESH EVERY 5S
          </div>
        </div>

        {/* Contract Identity card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm flex flex-col justify-between h-40">
          <div>
            <span className="text-[10px] text-gray-400 font-bold block font-mono">GRANT REGISTRY CONTRACT</span>
            <span className="text-[10px] font-mono text-gray-500 block truncate mt-2 bg-brand-surface/30 dark:bg-brand-dark/50 p-1.5 rounded-lg select-all">
              {networkConfig.contractId}
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-brand-border/10 pt-2">
            <span className="text-[10px] text-gray-400 font-mono">STATUS: DEPLOYED</span>
            <button 
              onClick={onOpenWalletModal}
              className="text-[10px] text-brand-primary-dark dark:text-brand-primary hover:underline font-bold font-mono"
            >
              CHANGE ID
            </button>
          </div>
        </div>

      </div>

      {/* Row 2: Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-brand-dark border border-brand-border/15 rounded-2xl shadow-sm">
          <span className="text-[10px] text-gray-400 block font-mono">PENDING GRANTS</span>
          <span className="text-2xl font-bold font-mono dark:text-white mt-1 block">{pendingGrants.length}</span>
        </div>
        <div className="p-4 bg-white dark:bg-brand-dark border border-brand-border/15 rounded-2xl shadow-sm">
          <span className="text-[10px] text-gray-400 block font-mono">FUNDED GRANTS</span>
          <span className="text-2xl font-bold font-mono dark:text-white mt-1 block">{fundedGrants.length}</span>
        </div>
        <div className="p-4 bg-white dark:bg-brand-dark border border-brand-border/15 rounded-2xl shadow-sm">
          <span className="text-[10px] text-gray-400 block font-mono">TOTAL DISBURSED</span>
          <span className="text-2xl font-bold font-mono text-brand-primary-dark dark:text-amber-400 mt-1 block">{totalDisbursed} XLM</span>
        </div>
        <div className="p-4 bg-white dark:bg-brand-dark border border-brand-border/15 rounded-2xl shadow-sm">
          <span className="text-[10px] text-gray-400 block font-mono">PENDING AMOUNT</span>
          <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">{pendingVolume} XLM</span>
        </div>
      </div>

      {/* Row 3: Recent Grants & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Grants */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm flex flex-col min-h-[350px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-sora font-bold text-gray-900 dark:text-white">Recent Grant Applications</h3>
            <button 
              onClick={() => navigateTo('grants')}
              className="text-xs text-brand-primary-dark dark:text-brand-primary hover:underline font-semibold"
            >
              View All Grants
            </button>
          </div>

          {userGrants.length === 0 ? (
            <div className="py-12 text-center text-gray-400 flex-1 flex flex-col items-center justify-center">
              <Award className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
              <p className="text-sm font-dm">No Grant Applications Found</p>
              <p className="text-xs text-gray-400 mt-1">Submit your first grant proposal to initialize the smart contract registry.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userGrants.slice(0, 3).map((grant) => (
                <div 
                  key={grant.id}
                  onClick={() => navigateTo('grant-details', grant.id)}
                  className="p-3.5 rounded-xl border border-brand-border/15 hover:border-brand-primary/30 dark:border-white/5 dark:hover:bg-brand-dark/40 cursor-pointer flex justify-between items-center transition-all bg-brand-surface/10"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      grant.status === 'funded' 
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' 
                        : grant.status === 'rejected'
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                        : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{grant.title}</h4>
                      <span className="text-[11px] text-gray-400 block font-mono mt-0.5">
                        GRANTOR: {grant.grantorName} | DUE: {formatDate(grant.milestoneDeadline)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold block dark:text-white font-mono">
                      {parseFloat(grant.amount).toFixed(2)} XLM
                    </span>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full inline-block mt-1 ${
                      grant.status === 'funded'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        : grant.status === 'rejected'
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      {grant.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm min-h-[350px]">
          <h3 className="text-lg font-sora font-bold text-gray-900 dark:text-white mb-4">Live Event Feed</h3>
          {activityFeed.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Activity className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-700 mb-2" />
              <p className="text-xs">No events yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activityFeed.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                    item.type === 'milestone_released' ? 'bg-brand-primary' 
                    : item.type === 'grant_rejected' ? 'bg-red-400'
                    : item.type === 'tx_failed' ? 'bg-red-400'
                    : item.type === 'tx_processing' ? 'bg-amber-400 animate-pulse'
                    : 'bg-brand-secondary'
                  }`}></span>
                  <div>
                    <p className="text-xs font-semibold dark:text-white">{item.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
                    <span className="text-[10px] text-gray-400 font-mono block mt-1 truncate">{item.hash.substring(0, 24)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==========================================
// CREATE GRANT PAGE
// ==========================================
function CreateGrantPage() {
  const { submitGrantAction, wallet, navigateTo, showToast, networkConfig } = useGrantFlow();
  const [formData, setFormData] = useState<GrantFormInput>({
    grantorName: '',
    grantorEmail: '',
    grantorAddress: '',
    title: '',
    proposal: '',
    amount: '',
    milestoneDeadline: '',
    milestoneRequirements: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof GrantFormInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast('Please connect your wallet to submit a grant application.', 'error');
      return;
    }
    setIsSubmitting(true);
    const success = await submitGrantAction(formData);
    setIsSubmitting(false);
    if (success) {
      navigateTo('grants');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-dm">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigateTo('grants')}
          className="p-2 rounded-lg hover:bg-brand-surface dark:hover:bg-brand-dark/40 text-gray-500 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-sora font-bold text-gray-900 dark:text-white">Submit Grant Application</h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {networkConfig.mode === 'testnet' ? 'STELLAR TESTNET — SOROBAN CONTRACT CALL' : 'SANDBOX SIMULATION MODE'}
          </p>
        </div>
      </div>

      {!wallet.isConnected && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          Connect your wallet before submitting a grant application.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Grantor Information */}
        <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm space-y-4">
          <h3 className="text-base font-sora font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-brand-primary" />
            Grantor / Funder Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">ORGANIZATION / GRANTOR NAME *</label>
              <input
                type="text"
                value={formData.grantorName}
                onChange={(e) => handleChange('grantorName', e.target.value)}
                placeholder="e.g. Stellar Community DAO"
                className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">GRANTOR EMAIL *</label>
              <input
                type="email"
                value={formData.grantorEmail}
                onChange={(e) => handleChange('grantorEmail', e.target.value)}
                placeholder="grants@organization.org"
                className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white placeholder-gray-400"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">GRANTOR STELLAR ADDRESS *</label>
            <input
              type="text"
              value={formData.grantorAddress}
              onChange={(e) => handleChange('grantorAddress', e.target.value)}
              placeholder="GBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white placeholder-gray-400 font-mono"
              required
            />
          </div>
        </div>

        {/* Grant Details */}
        <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm space-y-4">
          <h3 className="text-base font-sora font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-primary" />
            Grant Proposal Details
          </h3>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">PROJECT TITLE *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Open-Source DeFi Analytics Dashboard for Soroban"
              className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white placeholder-gray-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">PROJECT PROPOSAL *</label>
            <textarea
              value={formData.proposal}
              onChange={(e) => handleChange('proposal', e.target.value)}
              placeholder="Describe your project, what problem it solves, your approach, and expected deliverables..."
              rows={5}
              className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white placeholder-gray-400 resize-none"
              required
            />
          </div>
        </div>

        {/* Funding & Milestones */}
        <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm space-y-4">
          <h3 className="text-base font-sora font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-brand-primary" />
            Funding & Milestones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">GRANT AMOUNT (XLM) *</label>
              <input
                type="number"
                step="0.0001"
                min="1"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white placeholder-gray-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">MILESTONE DEADLINE *</label>
              <input
                type="date"
                value={formData.milestoneDeadline}
                onChange={(e) => handleChange('milestoneDeadline', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5 font-mono">MILESTONE REQUIREMENTS</label>
            <textarea
              value={formData.milestoneRequirements}
              onChange={(e) => handleChange('milestoneRequirements', e.target.value)}
              placeholder="Describe the milestones that must be completed for funds to be released, e.g. M1: Design doc (Week 4). M2: MVP (Week 8). M3: Launch (Week 12)."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark/40 dark:border-white/10 dark:text-white placeholder-gray-400 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !wallet.isConnected}
          className="w-full py-4 rounded-2xl bg-brand-primary-dark text-white font-semibold text-base hover:bg-opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg ambient-glow flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting to Stellar Network...
            </>
          ) : (
            <>
              <Award className="w-5 h-5" />
              Submit Grant Application
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ==========================================
// GRANTS LIST PAGE
// ==========================================
function GrantsPage() {
  const { navigateTo } = useGrantFlow();
  const [grants, setGrants] = useState<GrantContractState[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'amount' | 'status'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'funded' | 'rejected'>('all');
  const [currentPage, setCurrentPageNum] = useState(1);
  const PAGE_SIZE = 8;

  const fetchGrants = () => {
    setGrants(getGrants());
  };

  useEffect(() => {
    fetchGrants();
    window.addEventListener('grantflow_grants_change', fetchGrants);
    return () => window.removeEventListener('grantflow_grants_change', fetchGrants);
  }, []);

  const filtered = grants
    .filter(g => {
      const matchSearch = !search || 
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.grantorName.toLowerCase().includes(search.toLowerCase()) ||
        g.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === 'all' || g.status === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp;
      if (sortBy === 'amount') return parseFloat(b.amount) - parseFloat(a.amount);
      return a.status.localeCompare(b.status);
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6 font-dm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sora font-bold text-gray-900 dark:text-white">Grant Applications</h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{filtered.length} APPLICATIONS FOUND</p>
        </div>
        <button
          onClick={() => navigateTo('create-grant')}
          className="px-4 py-2 bg-brand-primary-dark text-white hover:bg-opacity-95 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPageNum(1); }}
            placeholder="Search grant title, grantor, or ID..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark dark:border-white/10 dark:text-white placeholder-gray-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 text-sm border border-brand-border/30 rounded-xl focus:outline-none focus:border-brand-primary dark:bg-brand-dark dark:border-white/10 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="funded">Funded</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={() => setSortBy(prev => prev === 'newest' ? 'amount' : prev === 'amount' ? 'status' : 'newest')}
          className="px-3 py-2 text-sm border border-brand-border/30 rounded-xl hover:bg-brand-surface dark:border-white/10 dark:text-white flex items-center gap-1.5"
        >
          <ArrowUpDown className="w-4 h-4" />
          Sort: {sortBy}
        </button>
      </div>

      {/* Grants Table */}
      {paginated.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <Award className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-base font-dm">No grant applications found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or submit a new application.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((grant) => (
            <motion.div
              key={grant.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigateTo('grant-details', grant.id)}
              className="p-4 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/15 dark:border-white/5 cursor-pointer hover:border-brand-primary/30 dark:hover:bg-brand-dark/50 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    grant.status === 'funded' 
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' 
                      : grant.status === 'rejected'
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{grant.title}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-gray-400 font-mono">
                        {grant.id}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        GRANTOR: {grant.grantorName}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        DUE: {formatDate(grant.milestoneDeadline)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold block dark:text-white font-mono">
                    {parseFloat(grant.amount).toFixed(2)} XLM
                  </span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full inline-block mt-1 ${
                    grant.status === 'funded'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                      : grant.status === 'rejected'
                      ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  }`}>
                    {grant.status.toUpperCase()}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-brand-border/30 dark:border-white/5 disabled:opacity-40 hover:bg-brand-surface dark:hover:bg-brand-dark/40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-mono dark:text-white">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-brand-border/30 dark:border-white/5 disabled:opacity-40 hover:bg-brand-surface dark:hover:bg-brand-dark/40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// GRANT DETAIL PAGE
// ==========================================
function GrantDetailPage() {
  const { currentGrantId, navigateTo, releaseMilestoneAction, rejectGrantAction, wallet, showToast } = useGrantFlow();
  const [grant, setGrant] = useState<GrantContractState | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    if (currentGrantId) {
      const g = getGrantById(currentGrantId);
      setGrant(g || null);
    }
    const handleUpdate = () => {
      if (currentGrantId) {
        const g = getGrantById(currentGrantId);
        setGrant(g || null);
      }
    };
    window.addEventListener('grantflow_grants_change', handleUpdate);
    return () => window.removeEventListener('grantflow_grants_change', handleUpdate);
  }, [currentGrantId]);

  if (!grant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-base font-dm text-gray-400">Grant application not found</p>
        <button onClick={() => navigateTo('grants')} className="mt-4 text-brand-primary-dark hover:underline text-sm">
          Back to Grants
        </button>
      </div>
    );
  }

  const handleRelease = async () => {
    if (!wallet.isConnected) { showToast('Connect your wallet first', 'error'); return; }
    setIsActioning(true);
    await releaseMilestoneAction(grant.id);
    setIsActioning(false);
  };

  const handleReject = async () => {
    if (!wallet.isConnected) { showToast('Connect your wallet first', 'error'); return; }
    setIsActioning(true);
    await rejectGrantAction(grant.id);
    setIsActioning(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-dm">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigateTo('grants')}
          className="p-2 rounded-lg hover:bg-brand-surface dark:hover:bg-brand-dark/40 text-gray-500 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-sora font-bold text-gray-900 dark:text-white">Grant Details</h2>
          <span className="text-xs text-gray-400 font-mono">{grant.id}</span>
        </div>
        <span className={`ml-auto px-3 py-1 text-xs font-bold rounded-full font-mono ${
          grant.status === 'funded'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            : grant.status === 'rejected'
            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
        }`}>
          {grant.status.toUpperCase()}
        </span>
      </div>

      {/* Grant Info Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/20 shadow-sm space-y-5">
        <h3 className="text-xl font-sora font-bold text-gray-900 dark:text-white">{grant.title}</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] text-gray-400 block font-mono">GRANTOR</span>
            <span className="text-sm font-semibold dark:text-white">{grant.grantorName}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block font-mono">GRANTOR EMAIL</span>
            <span className="text-sm dark:text-gray-300">{grant.grantorEmail}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block font-mono">MILESTONE DUE</span>
            <span className="text-sm font-semibold dark:text-white">{formatDate(grant.milestoneDeadline)}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 block font-mono">GRANT AMOUNT</span>
            <span className="text-xl font-extrabold text-brand-primary-dark dark:text-white font-mono">{parseFloat(grant.amount).toFixed(2)} XLM</span>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] text-gray-400 block font-mono">GRANTOR ADDRESS</span>
            <span className="text-xs font-mono dark:text-gray-300 break-all">{grant.grantorAddress}</span>
          </div>
        </div>

        <div className="border-t border-brand-border/10 pt-4 space-y-3">
          <div>
            <span className="text-[10px] text-gray-400 block font-mono mb-1">PROJECT PROPOSAL</span>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{grant.proposal}</p>
          </div>
          {grant.milestoneRequirements && (
            <div>
              <span className="text-[10px] text-gray-400 block font-mono mb-1">MILESTONE REQUIREMENTS</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{grant.milestoneRequirements}</p>
            </div>
          )}
        </div>

        {/* Transaction Hash */}
        <div className="p-3 rounded-xl bg-brand-surface/30 dark:bg-brand-dark/50 border border-brand-border/15 space-y-2">
          <div>
            <span className="text-[10px] text-gray-400 block font-mono">SUBMISSION TX HASH</span>
            <a
              href={grant.txHash.startsWith('sandbox_hash_') ? '#' : `https://stellar.expert/explorer/testnet/tx/${grant.txHash}`}
              target={grant.txHash.startsWith('sandbox_hash_') ? '_self' : '_blank'}
              rel="noreferrer"
              className="text-xs text-brand-primary-dark dark:text-brand-primary hover:underline break-all font-mono flex items-center gap-1"
            >
              {grant.txHash}
              {!grant.txHash.startsWith('sandbox_hash_') && <ExternalLink className="w-3 h-3" />}
            </a>
          </div>
          {grant.releaseTxHash && (
            <div>
              <span className="text-[10px] text-gray-400 block font-mono">MILESTONE RELEASE TX HASH</span>
              <a
                href={grant.releaseTxHash.startsWith('sandbox_hash_') ? '#' : `https://stellar.expert/explorer/testnet/tx/${grant.releaseTxHash}`}
                target={grant.releaseTxHash.startsWith('sandbox_hash_') ? '_self' : '_blank'}
                rel="noreferrer"
                className="text-xs text-brand-primary-dark dark:text-brand-primary hover:underline break-all font-mono flex items-center gap-1"
              >
                {grant.releaseTxHash}
                {!grant.releaseTxHash.startsWith('sandbox_hash_') && <ExternalLink className="w-3 h-3" />}
              </a>
            </div>
          )}
          {grant.rejectTxHash && (
            <div>
              <span className="text-[10px] text-gray-400 block font-mono">REJECTION TX HASH</span>
              <span className="text-xs text-red-500 dark:text-red-400 break-all font-mono">{grant.rejectTxHash}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {grant.status === 'pending' && wallet.isConnected && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleRelease}
            disabled={isActioning}
            className="flex-1 py-3.5 rounded-2xl bg-brand-primary-dark text-white font-semibold hover:bg-opacity-95 disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isActioning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Release Milestone Funds
          </button>
          <button
            onClick={handleReject}
            disabled={isActioning}
            className="flex-1 py-3.5 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20 font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isActioning ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
            Withdraw Application
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MILESTONES / TRANSACTION HISTORY PAGE
// ==========================================
function MilestonesPage() {
  const {} = useGrantFlow();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  const fetchTxs = () => {
    setTransactions(getTransactionHistory());
  };

  useEffect(() => {
    fetchTxs();
    window.addEventListener('grantflow_transactions_change', fetchTxs);
    return () => window.removeEventListener('grantflow_transactions_change', fetchTxs);
  }, []);

  const getTypeLabel = (type: string) => {
    if (type === 'submit') return 'Grant Submitted';
    if (type === 'release') return 'Milestone Released';
    if (type === 'reject') return 'Application Withdrawn';
    return type;
  };

  const getTypeColor = (type: string) => {
    if (type === 'release') return 'text-amber-600 dark:text-amber-400';
    if (type === 'reject') return 'text-red-500 dark:text-red-400';
    return 'text-brand-secondary dark:text-brand-secondary';
  };

  return (
    <div className="space-y-6 font-dm">
      <div>
        <h2 className="text-2xl font-sora font-bold text-gray-900 dark:text-white">Milestones & Transactions</h2>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{transactions.length} RECORDS</p>
      </div>

      {transactions.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <History className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-base font-dm">No transactions recorded</p>
          <p className="text-sm mt-1">Submit a grant application to see transaction history here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-4 rounded-2xl bg-white dark:bg-brand-dark border border-brand-border/15 dark:border-white/5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  tx.status === 'success' ? 'bg-amber-50 dark:bg-amber-950/20' 
                  : tx.status === 'failed' ? 'bg-red-50 dark:bg-red-950/20'
                  : tx.status === 'processing' ? 'bg-amber-50 dark:bg-amber-950/20'
                  : 'bg-gray-50 dark:bg-gray-900/20'
                }`}>
                  {tx.status === 'success' && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
                  {tx.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                  {tx.status === 'processing' && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
                  {(tx.status === 'pending' || tx.status === 'cancelled') && <Clock className="w-4 h-4 text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${getTypeColor(tx.type)}`}>{getTypeLabel(tx.type)}</p>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{tx.hash || tx.id}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold font-mono dark:text-white">{parseFloat(tx.amount).toFixed(2)} XLM</p>
                <p className={`text-[10px] font-mono font-bold ${
                  tx.status === 'success' ? 'text-amber-600 dark:text-amber-400'
                  : tx.status === 'failed' ? 'text-red-500'
                  : 'text-amber-500'
                }`}>{tx.status.toUpperCase()}</p>
                <p className="text-[10px] text-gray-400 font-mono">{new Date(tx.timestamp).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// 404 PAGE
// ==========================================
function NotFoundPage() {
  const { navigateTo } = useGrantFlow();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-6xl font-sora font-extrabold text-brand-primary/20 dark:text-brand-primary/10">404</span>
      <p className="mt-4 text-lg font-sora font-bold text-gray-900 dark:text-white">Page Not Found</p>
      <p className="text-sm text-gray-400 mt-2">The page you're looking for doesn't exist.</p>
      <button 
        onClick={() => navigateTo('landing')}
        className="mt-6 px-6 py-2.5 rounded-xl bg-brand-primary-dark text-white font-semibold text-sm hover:bg-opacity-95 transition-all"
      >
        Return Home
      </button>
    </div>
  );
}

// ==========================================
// MAIN APP SHELL
// ==========================================
function AppShell() {
  const { currentPage } = useGrantFlow();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'landing': return <LandingPage />;
      case 'dashboard': return <DashboardPage onOpenWalletModal={() => setWalletModalOpen(true)} />;
      case 'create-grant': return <CreateGrantPage />;
      case 'grants': return <GrantsPage />;
      case 'grant-details': return <GrantDetailPage />;
      case 'milestones': return <MilestonesPage />;
      case '404': return <NotFoundPage />;
      default: return <LandingPage />;
    }
  };

  return (
    <>
      <Layout onOpenWalletModal={() => setWalletModalOpen(true)}>
        {renderPage()}
      </Layout>
      <WalletModal isOpen={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      <TransactionStatusModal />
      <ToastsContainer />
    </>
  );
}

// ==========================================
// ROOT EXPORT
// ==========================================
function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
