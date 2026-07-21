import { 
  Operation, 
  TransactionBuilder, 
  Networks, 
  rpc, 
  nativeToScVal, 
  Horizon,
  Address,
  Account,
  scValToNative
} from '@stellar/stellar-sdk';
import { getNetworkConfig } from './network';
import { signTxWithWallet } from './wallet';
import { addTransaction, updateTransactionStatus } from './transactions';

export interface GrantContractState {
  id: string;
  grantorName: string;
  grantorEmail: string;
  grantorAddress: string;
  title: string;
  proposal: string;
  amount: string; // XLM
  milestoneDeadline: string;
  milestoneRequirements: string;
  applicant: string;
  status: 'pending' | 'funded' | 'rejected';
  txHash: string;
  releaseTxHash?: string;
  rejectTxHash?: string;
  timestamp: number;
}

// Global in-memory list for sandbox mode, backed by LocalStorage
const SANDBOX_GRANTS_KEY = 'grantflow_sandbox_grants';

const MOCK_GRANTS: GrantContractState[] = [
  {
    id: 'grt_dao2026',
    grantorName: 'Stellar Community DAO',
    grantorEmail: 'grants@stellarcommunity.org',
    grantorAddress: 'GBMOCKGRANTORDAO2026XXXYYYZZZAAABBBCCC',
    title: 'Open-Source DeFi Analytics Dashboard',
    proposal: 'Build a real-time, open-source analytics dashboard tracking Soroban DeFi protocol metrics — TVL, transaction volume, unique wallets, and yield rates — with public REST API endpoints.',
    amount: '8500.0000',
    milestoneDeadline: '2026-09-30',
    milestoneRequirements: 'M1: Architecture design doc (Week 4). M2: Working MVP with 3 protocol integrations (Week 8). M3: Public API + documentation (Week 12).',
    applicant: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    status: 'pending',
    txHash: 'sandbox_hash_submit_dao0192830293',
    timestamp: Date.now() - 3 * 3600 * 1000,
  },
  {
    id: 'grt_sdf2026',
    grantorName: 'Stellar Development Foundation',
    grantorEmail: 'scf@stellar.org',
    grantorAddress: 'GBMOCKGRANTORSDF2026XXXYYYZZZAAABBBCCC',
    title: 'Soroban SDK Developer Tooling Extension',
    proposal: 'Develop advanced TypeScript bindings and developer experience improvements for the Soroban SDK including contract inspection tools, local simulation harness, and improved error messages.',
    amount: '18000.0000',
    milestoneDeadline: '2026-10-15',
    milestoneRequirements: 'M1: SDK fork + initial bindings (Month 1). M2: Test suite + CI integration (Month 2). M3: Merged PR to official SDK + release notes (Month 3).',
    applicant: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    status: 'funded',
    txHash: 'sandbox_hash_submit_sdf9812739812',
    releaseTxHash: 'sandbox_hash_release_sdf09812039812',
    timestamp: Date.now() - 4 * 24 * 3600 * 1000,
  },
  {
    id: 'grt_edu2026',
    grantorName: 'Web3 Education Alliance',
    grantorEmail: 'funding@web3edu.org',
    grantorAddress: 'GBMOCKGRANTOREDU2026XXXYYYZZZAAABBBCCC',
    title: 'Stellar Soroban Learning Path — Beginner to Advanced',
    proposal: 'Create a comprehensive, free, 12-module online course covering Stellar fundamentals through advanced Soroban smart contract development with practical projects and community challenges.',
    amount: '6200.0000',
    milestoneDeadline: '2026-08-31',
    milestoneRequirements: 'M1: Modules 1–4 published (Week 6). M2: Modules 5–8 + video content (Week 10). M3: Full course + certification system (Week 14).',
    applicant: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    status: 'pending',
    txHash: 'sandbox_hash_submit_edu5839201948',
    timestamp: Date.now() - 1 * 24 * 3600 * 1000,
  },
  {
    id: 'grt_sec2026',
    grantorName: 'Blockchain Security Council',
    grantorEmail: 'grants@bsc-audit.org',
    grantorAddress: 'GBMOCKGRANTORSEC2026XXXYYYZZZAAABBBCCC',
    title: 'Automated Soroban Security Audit Framework',
    proposal: 'Develop a static analysis and automated testing framework for Soroban smart contracts, detecting common vulnerability patterns such as reentrancy, overflow, and unauthorized access.',
    amount: '14000.0000',
    milestoneDeadline: '2026-07-15',
    milestoneRequirements: 'M1: Threat model + detection rules spec (Week 3). M2: Scanner MVP + 10 test contracts (Week 7). M3: Public CLI tool + docs.',
    applicant: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    status: 'rejected',
    txHash: 'sandbox_hash_submit_sec7482910392',
    rejectTxHash: 'sandbox_hash_reject_sec0293029302',
    timestamp: Date.now() - 12 * 24 * 3600 * 1000,
  }
];

const MOCK_EVENTS: ContractEvent[] = [
  {
    id: 'evt_1',
    type: 'submitted',
    grantId: 'grt_dao2026',
    amount: '8500.0000',
    actor: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    timestamp: Date.now() - 3 * 3600 * 1000,
    txHash: 'sandbox_hash_submit_dao0192830293',
  },
  {
    id: 'evt_2',
    type: 'submitted',
    grantId: 'grt_edu2026',
    amount: '6200.0000',
    actor: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    timestamp: Date.now() - 1 * 24 * 3600 * 1000,
    txHash: 'sandbox_hash_submit_edu5839201948',
  },
  {
    id: 'evt_3',
    type: 'funded',
    grantId: 'grt_sdf2026',
    amount: '18000.0000',
    actor: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    timestamp: Date.now() - 3 * 24 * 3600 * 1000,
    txHash: 'sandbox_hash_release_sdf09812039812',
  },
  {
    id: 'evt_4',
    type: 'submitted',
    grantId: 'grt_sdf2026',
    amount: '18000.0000',
    actor: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    timestamp: Date.now() - 4 * 24 * 3600 * 1000,
    txHash: 'sandbox_hash_submit_sdf9812739812',
  },
  {
    id: 'evt_5',
    type: 'rejected',
    grantId: 'grt_sec2026',
    amount: '14000.0000',
    actor: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    timestamp: Date.now() - 11 * 24 * 3600 * 1000,
    txHash: 'sandbox_hash_reject_sec0293029302',
  },
  {
    id: 'evt_6',
    type: 'submitted',
    grantId: 'grt_sec2026',
    amount: '14000.0000',
    actor: 'GGRANTFLOWSANDBOXADDRESS2026XXXYYYZZZ111',
    timestamp: Date.now() - 12 * 24 * 3600 * 1000,
    txHash: 'sandbox_hash_submit_sec7482910392',
  }
];

export function getSandboxGrants(): GrantContractState[] {
  try {
    const data = localStorage.getItem(SANDBOX_GRANTS_KEY);
    if (!data) {
      localStorage.setItem(SANDBOX_GRANTS_KEY, JSON.stringify(MOCK_GRANTS));
      return MOCK_GRANTS;
    }
    const parsed: GrantContractState[] = JSON.parse(data);
    return parsed.map(g => ({
      ...g,
      grantorAddress: g.grantorAddress || 'GBMOCKGRANTORDEFAULT2026XXXYYYZZZAAABBBCCC'
    }));
  } catch {
    return MOCK_GRANTS;
  }
}

export function saveSandboxGrants(grants: GrantContractState[]): void {
  localStorage.setItem(SANDBOX_GRANTS_KEY, JSON.stringify(grants));
  window.dispatchEvent(new Event('grantflow_grants_change'));
  window.dispatchEvent(new Event('grantflow_events_update'));
}

// Soroban event interface
export interface ContractEvent {
  id: string;
  type: 'submitted' | 'funded' | 'rejected';
  grantId: string;
  amount: string;
  actor: string;
  timestamp: number;
  txHash: string;
}

export function getSandboxEvents(): ContractEvent[] {
  try {
    const data = localStorage.getItem('grantflow_sandbox_events');
    if (!data) {
      localStorage.setItem('grantflow_sandbox_events', JSON.stringify(MOCK_EVENTS));
      return MOCK_EVENTS;
    }
    return JSON.parse(data);
  } catch {
    return MOCK_EVENTS;
  }
}

export function saveSandboxEvents(events: ContractEvent[]): void {
  localStorage.setItem('grantflow_sandbox_events', JSON.stringify(events));
  window.dispatchEvent(new Event('grantflow_events_update'));
}

export function addSandboxEvent(event: Omit<ContractEvent, 'id' | 'timestamp'>) {
  const events = getSandboxEvents();
  const newEvent: ContractEvent = {
    ...event,
    id: `evt_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  events.unshift(newEvent);
  saveSandboxEvents(events);
}

// --- On-Chain Integration Helpers ---

function parseStatus(nativeStatus: any): 'pending' | 'funded' | 'rejected' {
  if (typeof nativeStatus === 'string') {
    const s = nativeStatus.toLowerCase();
    if (s.includes('funded') || s.includes('paid')) return 'funded';
    if (s.includes('reject') || s.includes('cancel')) return 'rejected';
    return 'pending';
  }
  if (typeof nativeStatus === 'object' && nativeStatus !== null) {
    const keys = Object.keys(nativeStatus);
    if (keys.length > 0) {
      const key = keys[0].toLowerCase();
      if (key.includes('funded') || key.includes('paid')) return 'funded';
      if (key.includes('reject') || key.includes('cancel')) return 'rejected';
    }
  }
  if (typeof nativeStatus === 'number') {
    if (nativeStatus === 1) return 'funded';
    if (nativeStatus === 2) return 'rejected';
  }
  return 'pending';
}

async function simulateReadOnlyCall(
  contractId: string,
  functionName: string,
  args: any[] = []
): Promise<any> {
  const config = getNetworkConfig();
  const rpcServer = new rpc.Server(config.rpcUrl);
  const dummyAccount = new Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
  
  const operation = Operation.invokeContractFunction({
    contract: contractId,
    function: functionName,
    args,
  });
  
  const tx = new TransactionBuilder(dummyAccount, {
    fee: '100000',
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();
    
  const simResult = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error for ${functionName}: ${simResult.error}`);
  }
  
  if (!simResult.result || !simResult.result.retval) {
    throw new Error(`No return value in simulation for ${functionName}`);
  }
  
  return scValToNative(simResult.result.retval);
}

export async function getOnChainGrants(): Promise<GrantContractState[]> {
  const config = getNetworkConfig();
  if (config.mode === 'sandbox') {
    return getSandboxGrants();
  }
  
  try {
    const ids: any = await simulateReadOnlyCall(
      config.contractId,
      'get_all_grants'
    );
    
    if (!ids || !Array.isArray(ids)) {
      return getSandboxGrants();
    }
    
    const localGrants = getSandboxGrants();
    const grants: GrantContractState[] = [];
    
    for (const idVal of ids) {
      try {
        const id = typeof idVal === 'string' ? idVal : idVal.toString();
        const nativeGrant = await simulateReadOnlyCall(
          config.contractId,
          'get_grant',
          [nativeToScVal(id, { type: 'string' })]
        );
        
        const status = parseStatus(nativeGrant.status);
        const amount = (Number(nativeGrant.amount) / 10000000).toFixed(4);
        const milestoneDeadline = new Date(Number(nativeGrant.milestone_deadline) * 1000).toISOString().split('T')[0];
        
        const localMatch = localGrants.find(g => g.id === id);
        
        grants.push({
          id,
          grantorName: localMatch?.grantorName || `Grantor (${nativeGrant.grantor.toString().substring(0, 6)}...)`,
          grantorEmail: localMatch?.grantorEmail || 'grantor@grantflow.org',
          grantorAddress: nativeGrant.grantor.toString(),
          title: nativeGrant.title?.toString() || '',
          proposal: nativeGrant.proposal?.toString() || '',
          amount,
          milestoneDeadline,
          milestoneRequirements: localMatch?.milestoneRequirements || '',
          applicant: nativeGrant.applicant.toString(),
          status,
          txHash: localMatch?.txHash || '',
          releaseTxHash: localMatch?.releaseTxHash || (status === 'funded' ? 'onchain_release' : undefined),
          rejectTxHash: localMatch?.rejectTxHash || (status === 'rejected' ? 'onchain_rejection' : undefined),
          timestamp: localMatch?.timestamp || (Number(nativeGrant.milestone_deadline) * 1000),
        });
      } catch (e) {
        console.error(`Error decoding grant ${idVal}:`, e);
      }
    }
    
    return grants.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to fetch on-chain grants:', error);
    return getSandboxGrants();
  }
}

export async function syncOnChainGrants(): Promise<GrantContractState[]> {
  const config = getNetworkConfig();
  if (config.mode === 'sandbox') {
    return getSandboxGrants();
  }
  
  try {
    const onChainGrants = await getOnChainGrants();
    localStorage.setItem(SANDBOX_GRANTS_KEY, JSON.stringify(onChainGrants));
    window.dispatchEvent(new Event('grantflow_grants_change'));
    window.dispatchEvent(new Event('grantflow_events_update'));
    return onChainGrants;
  } catch (error) {
    console.error('Failed to sync on-chain grants:', error);
    return getSandboxGrants();
  }
}

function parseEvent(event: any): ContractEvent | null {
  try {
    const topics = event.topic.map((t: any) => scValToNative(t));
    const value = scValToNative(event.value);
    const txHash = event.txHash;
    const timestamp = event.ledgerClosedAt ? new Date(event.ledgerClosedAt).getTime() : Date.now();
    
    if (topics.length === 0) return null;
    const eventTypeSymbol = topics[0];
    const eventType = typeof eventTypeSymbol === 'string' ? eventTypeSymbol : eventTypeSymbol?.toString();
    
    if (eventType === 'grant_submitted') {
      const grantId = topics[1];
      const applicant = topics[2];
      const amount = (Number(value[1]) / 10000000).toFixed(4);
      return {
        id: event.id,
        type: 'submitted',
        grantId,
        amount,
        actor: applicant,
        timestamp,
        txHash,
      };
    } else if (eventType === 'milestone_released') {
      const grantId = topics[1];
      const applicant = topics[2];
      const amount = (Number(value[1]) / 10000000).toFixed(4);
      return {
        id: event.id,
        type: 'funded',
        grantId,
        amount,
        actor: applicant,
        timestamp,
        txHash,
      };
    } else if (eventType === 'grant_rejected') {
      const grantId = topics[1];
      const applicant = value;
      return {
        id: event.id,
        type: 'rejected',
        grantId,
        amount: '0.0000',
        actor: applicant,
        timestamp,
        txHash,
      };
    }
  } catch (err) {
    console.error('Error parsing contract event:', err);
  }
  return null;
}

export async function syncOnChainEvents(): Promise<ContractEvent[]> {
  const config = getNetworkConfig();
  if (config.mode === 'sandbox') {
    return getSandboxEvents();
  }
  
  try {
    const rpcServer = new rpc.Server(config.rpcUrl);
    const latestLedgerResponse = await rpcServer.getLatestLedger();
    const startLedger = Math.max(1, latestLedgerResponse.sequence - 5000);
    
    const eventsResponse = await rpcServer.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [config.contractId, config.milestoneEscrowContractId],
        }
      ],
      limit: 100,
    });
    
    const parsedEvents: ContractEvent[] = [];
    if (eventsResponse && eventsResponse.events) {
      for (const rawEvt of eventsResponse.events) {
        const parsed = parseEvent(rawEvt);
        if (parsed) {
          parsedEvents.push(parsed);
        }
      }
    }
    
    const cachedEvents = getSandboxEvents();
    const allEvents = [...parsedEvents, ...cachedEvents];
    const uniqueEvents = allEvents.filter(
      (evt, index, self) => self.findIndex(e => e.id === evt.id) === index
    );
    
    localStorage.setItem('grantflow_sandbox_events', JSON.stringify(uniqueEvents));
    window.dispatchEvent(new Event('grantflow_events_update'));
    return uniqueEvents;
  } catch (error) {
    console.error('Failed to sync on-chain events:', error);
    return getSandboxEvents();
  }
}

/**
 * Submits a grant application
 */
export async function submitGrantContract(
  applicantAddress: string,
  params: {
    grantorName: string;
    grantorEmail: string;
    grantorAddress: string;
    title: string;
    proposal: string;
    amount: string;
    milestoneDeadline: string;
    milestoneRequirements: string;
  }
): Promise<{ success: boolean; txHash: string; grantId: string; error?: string }> {
  const config = getNetworkConfig();
  const grantId = `grt_${Math.random().toString(36).substr(2, 9)}`;

  const txLog = addTransaction({
    id: `pending_${Math.random().toString(36).substr(2, 9)}`,
    grantId,
    type: 'submit',
    amount: params.amount,
    grantorName: params.grantorName,
    status: 'pending',
    hash: '',
    network: config.mode,
  });

  if (config.mode === 'sandbox') {
    updateTransactionStatus(txLog.id, 'processing');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const grants = getSandboxGrants();
    const txHash = `sandbox_hash_submit_${Math.random().toString(36).substr(2, 16)}`;
    
    const newGrant: GrantContractState = {
      id: grantId,
      grantorName: params.grantorName,
      grantorEmail: params.grantorEmail,
      grantorAddress: params.grantorAddress,
      title: params.title,
      proposal: params.proposal,
      amount: params.amount,
      milestoneDeadline: params.milestoneDeadline,
      milestoneRequirements: params.milestoneRequirements,
      applicant: applicantAddress,
      status: 'pending',
      txHash,
      timestamp: Date.now(),
    };

    grants.unshift(newGrant);
    saveSandboxGrants(grants);
    
    addSandboxEvent({
      type: 'submitted',
      grantId,
      amount: params.amount,
      actor: applicantAddress,
      txHash,
    });

    updateTransactionStatus(txLog.id, 'success', txHash);
    return { success: true, txHash, grantId };
  } else {
    // Testnet Mode
    try {
      updateTransactionStatus(txLog.id, 'processing');
      const rpcServer = new rpc.Server(config.rpcUrl);
      const horizonServer = new Horizon.Server(config.horizonUrl);

      const account = await horizonServer.loadAccount(applicantAddress);
      
      const operation = Operation.invokeContractFunction({
        contract: config.contractId,
        function: 'submit_grant',
        args: [
          Address.fromString(applicantAddress).toScVal(),
          nativeToScVal(grantId, { type: 'string' }),
          Address.fromString(params.grantorAddress).toScVal(),
          nativeToScVal(BigInt(Math.round(parseFloat(params.amount) * 10000000)), { type: 'i128' }),
          nativeToScVal(params.title, { type: 'string' }),
          nativeToScVal(params.proposal, { type: 'string' }),
          nativeToScVal(BigInt(Math.floor(new Date(params.milestoneDeadline).getTime() / 1000)), { type: 'u64' }),
        ],
      });

      const tx = new TransactionBuilder(account, {
        fee: '100000',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simResult = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`);
      }

      const assembledTx = rpc.assembleTransaction(tx, simResult).build();
      const signedTxXdr = await signTxWithWallet((assembledTx as any).toXDR(), applicantAddress);
      const finalTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      
      const sendResult = await rpcServer.sendTransaction(finalTx);
      if (sendResult.status === 'ERROR') {
        throw new Error(`RPC submission error: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
      }

      let txResult = await rpcServer.getTransaction(sendResult.hash);
      let attempts = 0;
      while (txResult.status === 'NOT_FOUND' || (txResult.status === 'SUCCESS' && txResult.resultMetaXdr === undefined)) {
        if (attempts > 30) throw new Error('Transaction execution timeout');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        txResult = await rpcServer.getTransaction(sendResult.hash);
        attempts++;
      }

      if (txResult.status === 'FAILED') {
        throw new Error('Soroban contract execution failed');
      }

      const grants = getSandboxGrants();
      const newGrant: GrantContractState = {
        id: grantId,
        grantorName: params.grantorName,
        grantorEmail: params.grantorEmail,
        grantorAddress: params.grantorAddress,
        title: params.title,
        proposal: params.proposal,
        amount: params.amount,
        milestoneDeadline: params.milestoneDeadline,
        milestoneRequirements: params.milestoneRequirements,
        applicant: applicantAddress,
        status: 'pending',
        txHash: sendResult.hash,
        timestamp: Date.now(),
      };
      grants.unshift(newGrant);
      saveSandboxGrants(grants);

      addSandboxEvent({
        type: 'submitted',
        grantId,
        amount: params.amount,
        actor: applicantAddress,
        txHash: sendResult.hash,
      });

      updateTransactionStatus(txLog.id, 'success', sendResult.hash);
      return { success: true, txHash: sendResult.hash, grantId };
    } catch (err: any) {
      console.error('Testnet Grant Submission Failed:', err);
      updateTransactionStatus(txLog.id, 'failed');
      return { success: false, txHash: '', grantId: '', error: err.message || 'Unknown transaction error' };
    }
  }
}

/**
 * Releases milestone funds for a grant
 */
export async function releaseMilestoneContract(
  callerAddress: string,
  grantId: string,
  amount: string,
  grantorName: string
): Promise<{ success: boolean; txHash: string; error?: string }> {
  const config = getNetworkConfig();
  
  const txLog = addTransaction({
    id: `pending_${Math.random().toString(36).substr(2, 9)}`,
    grantId,
    type: 'release',
    amount,
    grantorName,
    status: 'pending',
    hash: '',
    network: config.mode,
  });

  if (config.mode === 'sandbox') {
    updateTransactionStatus(txLog.id, 'processing');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const grants = getSandboxGrants();
    const index = grants.findIndex((g) => g.id === grantId);
    const txHash = `sandbox_hash_release_${Math.random().toString(36).substr(2, 16)}`;

    if (index !== -1) {
      const currentBal = parseFloat(localStorage.getItem('grantflow_sandbox_balance') || '12000.00');
      const releaseAmount = parseFloat(amount);
      if (currentBal < releaseAmount) {
        updateTransactionStatus(txLog.id, 'failed');
        return { success: false, txHash: '', error: 'Insufficient sandbox balance!' };
      }
      
      localStorage.setItem('grantflow_sandbox_balance', (currentBal - releaseAmount).toFixed(4));
      
      grants[index].status = 'funded';
      grants[index].releaseTxHash = txHash;
      saveSandboxGrants(grants);
      
      addSandboxEvent({
        type: 'funded',
        grantId,
        amount,
        actor: callerAddress,
        txHash,
      });

      updateTransactionStatus(txLog.id, 'success', txHash);
      window.dispatchEvent(new Event('grantflow_balance_change'));
      return { success: true, txHash };
    }
    
    updateTransactionStatus(txLog.id, 'failed');
    return { success: false, txHash: '', error: 'Grant not found!' };
  } else {
    // Testnet Mode
    try {
      updateTransactionStatus(txLog.id, 'processing');
      const rpcServer = new rpc.Server(config.rpcUrl);
      const horizonServer = new Horizon.Server(config.horizonUrl);

      const account = await horizonServer.loadAccount(callerAddress);
      
      const operation = Operation.invokeContractFunction({
        contract: config.milestoneEscrowContractId,
        function: 'release_milestone',
        args: [
          Address.fromString(callerAddress).toScVal(),
          nativeToScVal(grantId, { type: 'string' }),
        ],
      });

      const tx = new TransactionBuilder(account, {
        fee: '150000',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simResult = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`);
      }

      const assembledTx = rpc.assembleTransaction(tx, simResult).build();
      const signedTxXdr = await signTxWithWallet((assembledTx as any).toXDR(), callerAddress);
      const finalTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      
      const sendResult = await rpcServer.sendTransaction(finalTx);
      if (sendResult.status === 'ERROR') {
        throw new Error(`RPC submission error: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
      }

      let txResult = await rpcServer.getTransaction(sendResult.hash);
      while (txResult.status === 'NOT_FOUND' || (txResult.status === 'SUCCESS' && txResult.resultMetaXdr === undefined)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        txResult = await rpcServer.getTransaction(sendResult.hash);
      }

      if (txResult.status === 'FAILED') {
        throw new Error('Soroban milestone release call failed');
      }

      const grants = getSandboxGrants();
      const index = grants.findIndex((g) => g.id === grantId);
      if (index !== -1) {
        grants[index].status = 'funded';
        grants[index].releaseTxHash = sendResult.hash;
        saveSandboxGrants(grants);
      }

      addSandboxEvent({
        type: 'funded',
        grantId,
        amount,
        actor: callerAddress,
        txHash: sendResult.hash,
      });

      updateTransactionStatus(txLog.id, 'success', sendResult.hash);
      return { success: true, txHash: sendResult.hash };
    } catch (err: any) {
      console.error('Testnet Milestone Release Failed:', err);
      updateTransactionStatus(txLog.id, 'failed');
      return { success: false, txHash: '', error: err.message || 'Unknown release error' };
    }
  }
}

/**
 * Rejects a grant application
 */
export async function rejectGrantContract(
  applicantAddress: string,
  grantId: string,
  grantorName: string,
  amount: string
): Promise<{ success: boolean; txHash: string; error?: string }> {
  const config = getNetworkConfig();
  
  const txLog = addTransaction({
    id: `pending_${Math.random().toString(36).substr(2, 9)}`,
    grantId,
    type: 'reject',
    amount,
    grantorName,
    status: 'pending',
    hash: '',
    network: config.mode,
  });

  if (config.mode === 'sandbox') {
    updateTransactionStatus(txLog.id, 'processing');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const grants = getSandboxGrants();
    const index = grants.findIndex((g) => g.id === grantId);
    const txHash = `sandbox_hash_reject_${Math.random().toString(36).substr(2, 16)}`;

    if (index !== -1) {
      grants[index].status = 'rejected';
      grants[index].rejectTxHash = txHash;
      saveSandboxGrants(grants);

      addSandboxEvent({
        type: 'rejected',
        grantId,
        amount,
        actor: applicantAddress,
        txHash,
      });

      updateTransactionStatus(txLog.id, 'success', txHash);
      return { success: true, txHash };
    }
    
    updateTransactionStatus(txLog.id, 'failed');
    return { success: false, txHash: '', error: 'Grant not found!' };
  } else {
    // Testnet Mode
    try {
      updateTransactionStatus(txLog.id, 'processing');
      const rpcServer = new rpc.Server(config.rpcUrl);
      const horizonServer = new Horizon.Server(config.horizonUrl);

      const account = await horizonServer.loadAccount(applicantAddress);
      
      const operation = Operation.invokeContractFunction({
        contract: config.contractId,
        function: 'reject_grant',
        args: [
          nativeToScVal(grantId, { type: 'string' }),
        ],
      });

      const tx = new TransactionBuilder(account, {
        fee: '120000',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simResult = await rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Simulation failed: ${simResult.error}`);
      }

      const assembledTx = rpc.assembleTransaction(tx, simResult).build();
      const signedTxXdr = await signTxWithWallet((assembledTx as any).toXDR(), applicantAddress);
      const finalTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
      
      const sendResult = await rpcServer.sendTransaction(finalTx);
      if (sendResult.status === 'ERROR') {
        throw new Error(`RPC submission error: ${(sendResult as any).errorResultXdr || (sendResult as any).errorResult}`);
      }

      let txResult = await rpcServer.getTransaction(sendResult.hash);
      while (txResult.status === 'NOT_FOUND' || (txResult.status === 'SUCCESS' && txResult.resultMetaXdr === undefined)) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        txResult = await rpcServer.getTransaction(sendResult.hash);
      }

      if (txResult.status === 'FAILED') {
        throw new Error('Soroban grant rejection call failed');
      }

      const grants = getSandboxGrants();
      const index = grants.findIndex((g) => g.id === grantId);
      if (index !== -1) {
        grants[index].status = 'rejected';
        grants[index].rejectTxHash = sendResult.hash;
        saveSandboxGrants(grants);
      }

      addSandboxEvent({
        type: 'rejected',
        grantId,
        amount,
        actor: applicantAddress,
        txHash: sendResult.hash,
      });

      updateTransactionStatus(txLog.id, 'success', sendResult.hash);
      return { success: true, txHash: sendResult.hash };
    } catch (err: any) {
      console.error('Testnet Grant Rejection Failed:', err);
      updateTransactionStatus(txLog.id, 'failed');
      return { success: false, txHash: '', error: err.message || 'Unknown rejection error' };
    }
  }
}
