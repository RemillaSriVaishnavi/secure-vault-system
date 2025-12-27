# Secure Vault with On-Chain Authorization Manager

## Overview

This project implements a **secure, two-contract vault system** that separates **asset custody** from **withdrawal authorization**, reflecting real-world decentralized architecture patterns.

The system ensures that **fund withdrawals are permitted only after a valid, off-chain authorization is verified on-chain**, and that **each authorization can be used exactly once**.

Key goals achieved:
- Clear separation of responsibilities
- Deterministic, replay-safe authorization
- Exactly-once state transitions
- Fully reproducible local deployment using Docker

---

## High-Level Architecture

The system consists of **two on-chain smart contracts**:

### 1. AuthorizationManager
- Validates off-chain generated withdrawal authorizations
- Verifies cryptographic signatures
- Enforces replay protection
- Tracks authorization consumption (exactly once)

### 2. SecureVault
- Holds native blockchain currency (ETH)
- Accepts deposits from any address
- Executes withdrawals **only after authorization confirmation**
- Does **not** perform any signature verification itself

### Trust Boundary

| Responsibility | AuthorizationManager | SecureVault |
|---------------|----------------------|-------------|
| Holds ETH | ❌ | ✅ |
| Signature verification | ✅ | ❌ |
| Replay protection | ✅ | ❌ |
| Executes transfers | ❌ | ✅ |

This intentional split reduces risk and mirrors production Web3 custody systems.

---

## Authorization Design

### Off-Chain Authorization

Withdrawals are approved off-chain by a trusted signer.  
Each authorization cryptographically signs a deterministic message containing:

- Vault contract address
- Blockchain `chainId`
- Recipient address
- Withdrawal amount
- Unique nonce

### Deterministic Message Construction

```

hash = keccak256(
vaultAddress,
chainId,
recipient,
amount,
nonce
)
```

This ensures:
- No cross-vault replay
- No cross-chain replay
- No amount or recipient tampering

---

## Replay Protection & Exactly-Once Semantics

Replay protection is enforced by the **AuthorizationManager** using:

```solidity
mapping(bytes32 => bool) consumed;
```

### Lifecycle of an Authorization

```
OFF-CHAIN → UNUSED → CONSUMED
```

* An authorization starts unused
* On successful verification, it is **atomically marked as consumed**
* Any reuse attempt reverts deterministically

Authorization consumption happens **before** any value transfer, ensuring correctness even under adversarial execution paths.

---

## Vault Behavior

### Deposits

* Any address may deposit ETH
* Deposits are accepted via `receive()`
* Deposit events are emitted

### Withdrawals

Withdrawals succeed **only if**:

1. AuthorizationManager confirms validity
2. Authorization has not been used before
3. Vault balance is sufficient

Order of execution:

1. Validate authorization
2. AuthorizationManager consumes authorization
3. Vault transfers ETH
4. Withdrawal event emitted

Vault balance can never become negative.

---

## System Guarantees

* Exactly-once authorization usage
* Deterministic reverts on failure
* No signature logic in the vault
* No duplicated effects across contracts
* Safe behavior under unexpected call ordering
* Initialization logic executed only once

---

## Events & Observability

The system emits events for:

* Deposits
* Authorization consumption
* Withdrawals

This allows easy inspection via logs and enables evaluators to verify correct behavior.

---

## Repository Structure

```
.
├── contracts/
│   ├── AuthorizationManager.sol
│   └── SecureVault.sol
├── scripts/
│   └── deploy.js
├── docker/
│   ├── Dockerfile
│   └── entrypoint.sh
├── docker-compose.yml
└── README.md
```

---

## Local Deployment (One Command)

### Prerequisites

* Docker
* Docker Compose

### Run the System

From the project root:

```bash
docker-compose up
```

This command will automatically:

1. Build the Docker image
2. Install dependencies
3. Compile smart contracts
4. Start a local Hardhat blockchain
5. Deploy AuthorizationManager
6. Deploy SecureVault
7. Expose RPC endpoint on `localhost:8545`

No manual steps are required.

---

## Deployment Output

Deployed contract addresses and network details are printed to the logs:

```bash
docker logs secure-vault-blockchain
```

Example output:

```
Network: localhost
Chain ID: 31337
AuthorizationManager deployed at: 0x...
SecureVault deployed at: 0x...
```

---

## RPC Access

The local blockchain RPC endpoint is available at:

```
http://localhost:8545
```

This can be used for testing, inspection, or integration.

---

## Assumptions & Limitations

* A single trusted signer authorizes withdrawals
* Native ETH only (no ERC-20 support)
* No upgradability mechanism included
* Designed for demonstration and evaluation purposes

---

## Security Considerations

* Authorization is consumed before any value transfer
* Vault never performs cryptographic verification
* Cross-contract interactions are deterministic
* Replay and reentrancy risks are mitigated by design


## Local Validation / Manual Testing Flow

This section describes how the system can be manually validated on a local environment.

### 1. Deposit Funds

Any address can deposit native ETH into the `SecureVault` contract by sending ETH directly to the vault address.

- The vault accepts deposits via the `receive()` function
- A `Deposit` event is emitted
- The ETH balance is held securely by the vault

---

### 2. Generate Withdrawal Authorization (Off-Chain)

A trusted signer generates an off-chain authorization by signing a deterministic message containing:

- Vault contract address
- Blockchain `chainId`
- Recipient address
- Withdrawal amount
- Unique nonce

This signed message represents permission for a **single withdrawal**.

---

### 3. Successful Withdrawal

To withdraw funds:

1. The caller submits the withdrawal request to the `SecureVault`
2. The vault calls `AuthorizationManager.verifyAuthorization`
3. The authorization is cryptographically verified
4. The authorization is marked as consumed
5. ETH is transferred to the recipient
6. A `Withdrawal` event is emitted

This flow succeeds only once per authorization.

---

### 4. Failed Withdrawal (Replay Protection)

If the same authorization is submitted again:

- The `AuthorizationManager` detects that the authorization has already been consumed
- The transaction reverts deterministically
- No ETH is transferred
- No state is modified

This demonstrates replay protection and exactly-once authorization semantics.
