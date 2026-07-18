import { 
  submitGrantContract, 
  releaseMilestoneContract, 
  rejectGrantContract, 
  getSandboxGrants,
  getSandboxEvents,
  type GrantContractState
} from './contract';
import { getWalletState } from './wallet';
import { getTransactionHistory } from './transactions';

export interface GrantFormInput {
  grantorName: string;
  grantorEmail: string;
  grantorAddress: string;
  title: string;
  proposal: string;
  amount: string;
  milestoneDeadline: string;
  milestoneRequirements: string;
}

export function validateGrantInput(input: GrantFormInput): string | null {
  if (!input.grantorName.trim()) return 'Grantor / organization name is required';
  if (!input.grantorEmail.trim()) return 'Grantor email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.grantorEmail.trim())) return 'Invalid grantor email address';
  if (!input.grantorAddress.trim()) return 'Grantor Stellar address is required';
  if (!/^G[A-Z2-7]{55}$/.test(input.grantorAddress.trim())) return 'Invalid Stellar address (must start with G, 56 characters)';
  if (!input.title.trim()) return 'Grant title is required';
  if (!input.proposal.trim()) return 'Project proposal is required';
  
  const amt = parseFloat(input.amount);
  if (isNaN(amt) || amt <= 0) return 'Grant amount must be a positive number';
  if (!input.milestoneDeadline) return 'Milestone deadline is required';
  
  const deadlineObj = new Date(input.milestoneDeadline);
  if (isNaN(deadlineObj.getTime())) return 'Invalid milestone deadline';
  
  return null;
}

export async function submitGrant(input: GrantFormInput): Promise<{ success: boolean; grantId: string; txHash: string; error?: string }> {
  const validationError = validateGrantInput(input);
  if (validationError) {
    return { success: false, grantId: '', txHash: '', error: validationError };
  }

  const wallet = await getWalletState();
  if (!wallet.isConnected || !wallet.address) {
    return { success: false, grantId: '', txHash: '', error: 'Wallet not connected' };
  }

  return await submitGrantContract(wallet.address, {
    grantorName: input.grantorName.trim(),
    grantorEmail: input.grantorEmail.trim(),
    grantorAddress: input.grantorAddress.trim(),
    title: input.title.trim(),
    proposal: input.proposal.trim(),
    amount: input.amount.trim(),
    milestoneDeadline: input.milestoneDeadline,
    milestoneRequirements: input.milestoneRequirements.trim(),
  });
}

export async function releaseMilestone(grantId: string): Promise<{ success: boolean; txHash: string; error?: string }> {
  const wallet = await getWalletState();
  if (!wallet.isConnected || !wallet.address) {
    return { success: false, txHash: '', error: 'Wallet not connected' };
  }

  const grants = getGrants();
  const grant = grants.find((g) => g.id === grantId);
  if (!grant) {
    return { success: false, txHash: '', error: 'Grant not found' };
  }

  if (grant.status !== 'pending') {
    return { success: false, txHash: '', error: `Grant is already ${grant.status}` };
  }

  const walletBalance = parseFloat(wallet.balance);
  const grantAmount = parseFloat(grant.amount);
  if (walletBalance < grantAmount) {
    return { success: false, txHash: '', error: 'Insufficient XLM balance to release milestone funds' };
  }

  return await releaseMilestoneContract(wallet.address, grantId, grant.amount, grant.grantorName);
}

export async function rejectGrant(grantId: string): Promise<{ success: boolean; txHash: string; error?: string }> {
  const wallet = await getWalletState();
  if (!wallet.isConnected || !wallet.address) {
    return { success: false, txHash: '', error: 'Wallet not connected' };
  }

  const grants = getGrants();
  const grant = grants.find((g) => g.id === grantId);
  if (!grant) {
    return { success: false, txHash: '', error: 'Grant not found' };
  }

  if (grant.applicant !== wallet.address) {
    return { success: false, txHash: '', error: 'Only the grant applicant can reject or withdraw this application' };
  }

  if (grant.status !== 'pending') {
    return { success: false, txHash: '', error: `Grant is already ${grant.status}` };
  }

  return await rejectGrantContract(wallet.address, grantId, grant.grantorName, grant.amount);
}

export function getGrants(): GrantContractState[] {
  return getSandboxGrants();
}

export function getGrantById(id: string): GrantContractState | undefined {
  return getGrants().find((g) => g.id === id);
}

export interface ActivityFeedItem {
  id: string;
  type: 'grant_submitted' | 'milestone_released' | 'grant_rejected' | 'tx_processing' | 'tx_failed';
  title: string;
  description: string;
  timestamp: number;
  hash: string;
}

export function getCombinedActivityFeed(): ActivityFeedItem[] {
  const events = getSandboxEvents();
  const txs = getTransactionHistory();

  const feed: ActivityFeedItem[] = [];

  // Map events
  events.forEach((evt) => {
    let type: ActivityFeedItem['type'] = 'grant_submitted';
    let title = 'Grant Submitted';
    let description = `Grant application of ${evt.amount} XLM submitted`;

    if (evt.type === 'funded') {
      type = 'milestone_released';
      title = 'Milestone Funded';
      description = `Milestone released: +${evt.amount} XLM disbursed to applicant`;
    } else if (evt.type === 'rejected') {
      type = 'grant_rejected';
      title = 'Grant Rejected';
      description = `Grant application was withdrawn or rejected`;
    }

    feed.push({
      id: evt.id,
      type,
      title,
      description,
      timestamp: evt.timestamp,
      hash: evt.txHash,
    });
  });

  // Map pending or failed transactions
  txs.forEach((tx) => {
    if (tx.status === 'processing') {
      feed.push({
        id: tx.id,
        type: 'tx_processing',
        title: 'Transaction Broadcasting',
        description: `Broadcasting ${tx.type === 'release' ? 'milestone release' : tx.type === 'reject' ? 'grant rejection' : 'grant submission'} transaction...`,
        timestamp: tx.timestamp,
        hash: tx.hash || tx.id,
      });
    } else if (tx.status === 'failed') {
      feed.push({
        id: tx.id,
        type: 'tx_failed',
        title: 'Transaction Failed',
        description: `${tx.type === 'release' ? 'Milestone release' : tx.type === 'reject' ? 'Grant rejection' : 'Grant submission'} transaction failed or was rejected`,
        timestamp: tx.timestamp,
        hash: tx.hash || tx.id,
      });
    }
  });

  // Sort by timestamp descending
  return feed.sort((a, b) => b.timestamp - a.timestamp);
}
