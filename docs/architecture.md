# GrantFlow Architecture & Design Specification

This document outlines the planning, architectural decisions, and diagrams for the GrantFlow platform, built on Stellar and Soroban.

## 1. System Architecture Overview

GrantFlow uses a decoupled multi-contract architecture where the **GrantRegistry** serves as the single source of truth for grant applications, and the **MilestoneEscrow** orchestrates milestone verification, funds transfer, and updates registry entries via contract-to-contract (C2C) calls.

### Core Components
1.  **Frontend App (React / Vite):** Single Page Application providing the user interface for grantors and applicants.
2.  **Wallet Integration:** Support for Freighter and Stellar Wallets Kit for transaction signing.
3.  **Soroban Smart Contracts:**
    *   **GrantRegistry:** Creates, stores, and updates grant states (Pending, Funded, Rejected).
    *   **MilestoneEscrow:** Validates milestone conditions, transfers XLM (via Stellar Asset Contract), and invokes the `set_funded` method on the GrantRegistry.

---

## 2. Directory Structure

```text
GrantFlow/
├── contracts/
│   ├── grant_registry/       # Soroban contract for grant records
│   └── milestone_escrow/     # Routes native escrow milestone payments
├── src/
│   ├── App.tsx               # Main application routing and UI
│   ├── index.css             # Tailwind/Custom CSS tokens and styling
│   ├── services/
│   │   ├── wallet.ts         # Wallet connection and signing logic
│   │   ├── network.ts        # Contract IDs and RPC endpoint configurations
│   │   ├── grant.ts          # Core business logic for grant management
│   │   └── contract.ts       # Smart contract ABI mapping and simulated state
│   └── hooks/
│       └── useGrantFlow.tsx  # Global state context for the application
```

---

## 3. Data Models

### Grant Status Enum
*   `0`: Pending (Awaiting milestone completion)
*   `1`: Funded (Milestone verified, funds released)
*   `2`: Rejected (Applicant withdrew or grantor rejected)

### Grant Object Schema (XDR / Frontend representation)
```typescript
{
  id: string;                  // Unique grant identifier
  applicant: string;           // Stellar address of the creator
  grantor: string;             // Stellar address of the funding organization
  amount: number;              // Grant amount (stored in stroops on-chain)
  title: string;               // Grant project title
  proposal: string;            // Detailed project proposal/description
  milestone_deadline: number;  // Epoch timestamp for milestone completion
  status: GrantStatus;         // Current state
}
```

---

## 4. Smart Contract Interaction Flow

### A. Submitting a Grant (Applicant)
1.  Applicant fills out the Grant Application form in the UI.
2.  Frontend invokes `submit_grant` on the `GrantRegistry` contract.
3.  Contract authenticates the applicant's signature.
4.  Grant is stored on-chain with `Pending` status.
5.  Event `grant_submitted` is emitted.

### B. Releasing a Milestone (Grantor / Escrow)
1.  The authorized escrow agent or grantor verifies milestone deliverables.
2.  Frontend invokes `release_milestone` on the `MilestoneEscrow` contract.
3.  `MilestoneEscrow` invokes `get_grant` on `GrantRegistry` via Cross-Contract Call (C2C).
4.  `MilestoneEscrow` validates that the grant is `Pending`.
5.  `MilestoneEscrow` invokes the Stellar Asset Contract to transfer XLM from the grantor to the applicant.
6.  `MilestoneEscrow` invokes `set_funded` on `GrantRegistry` via C2C.
7.  Event `milestone_released` is emitted.

### C. Rejecting / Withdrawing (Applicant)
1.  Applicant decides to withdraw the application before funding.
2.  Frontend invokes `reject_grant` on the `GrantRegistry` contract.
3.  Contract authenticates applicant.
4.  Grant status is updated to `Rejected`.
5.  Event `grant_rejected` is emitted.

---

## 5. Security & Trust Model
*   **Decoupled State & Transfer:** By separating the registry from the escrow logic, contract upgrades can be performed on the escrow mechanism without migrating the entire grant history.
*   **Role-Based Access Control:** Only the registered `MilestoneEscrow` contract is permitted to invoke `set_funded` on the `GrantRegistry`.
*   **Atomic Settlements:** Milestone releases are fully atomic. If the token transfer fails (e.g., insufficient funds), the entire transaction rolls back, and the grant status remains `Pending`.
