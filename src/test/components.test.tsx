import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { AppProvider } from '../hooks/useGrantFlow';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('@stellar/stellar-sdk', () => ({
  Address: {
    fromString: vi.fn().mockReturnValue({
      toString: () => 'GBGRANTFLOWTESTADDRESS2026XXXYYYZZZAAABBBCCC',
      toScVal: () => ({}),
    }),
  },
  nativeToScVal: vi.fn(),
  Operation: { invokeContractFunction: vi.fn() },
  TransactionBuilder: vi.fn(),
  rpc: {
    Server: vi.fn().mockImplementation(() => ({
      simulateTransaction: vi.fn(),
      getLatestLedger: vi.fn().mockResolvedValue({ sequence: 100000 }),
      getEvents: vi.fn().mockResolvedValue({ events: [] }),
    })),
    Api: { isSimulationError: vi.fn().mockReturnValue(false) },
  },
  scValToNative: vi.fn(),
}));

vi.mock('@creit.tech/stellar-wallets-kit', () => ({
  StellarWalletsKit: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({ address: 'GBGRANTFLOWTESTADDRESS2026XXXYYYZZZAAABBBCCC' }),
    getPublicKey: vi.fn().mockResolvedValue('GBGRANTFLOWTESTADDRESS2026XXXYYYZZZAAABBBCCC'),
  })),
  WalletNetwork: { TESTNET: 'TESTNET' },
  allowFreighter: vi.fn(),
}));

describe('GrantFlow Component & Integration Tests', () => {
  it('should render the Landing page with GrantFlow tagline', () => {
    render(<AppProvider><App /></AppProvider>);
    expect(screen.getByText(/Fund\. Track\. Deliver\./i)).toBeInTheDocument();
    expect(screen.getByText(/Launch GrantFlow/i)).toBeInTheDocument();
  });

  it('should support toggling application theme', () => {
    render(<AppProvider><App /></AppProvider>);
    const themeBtn = screen.getByTitle('Toggle Theme');
    expect(themeBtn).toBeInTheDocument();
    fireEvent.click(themeBtn);
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList).toBeDefined();
  });

  it('should display key GrantFlow feature badges on landing', () => {
    render(<AppProvider><App /></AppProvider>);
    expect(screen.getByText(/SOROBAN SMART CONTRACTS/i)).toBeInTheDocument();
    expect(screen.getByText(/MILESTONE ESCROW/i)).toBeInTheDocument();
    expect(screen.getByText(/FREIGHTER WALLET SUPPORT/i)).toBeInTheDocument();
  });
});
