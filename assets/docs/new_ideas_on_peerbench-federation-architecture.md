# PeerBench Federation Protocol

## Architecture Design Document

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** December 2024

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals and Requirements](#2-goals-and-requirements)
3. [System Overview](#3-system-overview)
4. [Identity System](#4-identity-system)
5. [Data Model](#5-data-model)
6. [Federation Protocol](#6-federation-protocol)
7. [Reveal Mechanism](#7-reveal-mechanism)
8. [Cryptographic Design](#8-cryptographic-design)
9. [API Specification](#9-api-specification)
10. [Security Model](#10-security-model)
11. [Implementation Guide](#11-implementation-guide)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

PeerBench is a decentralized network for creating trustworthy AI benchmark data. Multiple independent groups contribute portions of a benchmark dataset, with most data kept secret while random samples are revealed for public validation. This document specifies the federation protocol that enables nodes to discover each other, exchange data, and maintain cryptographic integrity across the network.

### 1.2 Core Concept

The system implements a **commit-then-reveal** scheme:

1. **Commit Phase:** Contributors submit hashes of prompts and responses along with scores
2. **Reveal Phase:** Random selection (via external randomness) determines which items become public
3. **Validation Phase:** Community reviews revealed data to assess contributor trustworthiness

This prevents model providers from gaming benchmarks while enabling public verification of data quality.

### 1.3 Design Philosophy

| Principle | Approach |
|-----------|----------|
| **Resilience** | Each node fully functional standalone; no critical dependencies |
| **Cheat Resistance** | Cryptographic commitments; external randomness for reveals |
| **Ease of Use** | Server-managed keys; simple HTTP APIs; minimal configuration |
| **Simplicity** | Focused scope; leverage existing standards; avoid over-engineering |

### 1.4 Prior Art

This design draws inspiration from:

- **Email/SMTP:** DNS-based discovery, server-to-server federation
- **AT Protocol:** Self-authenticating data with signatures
- **Nostr:** Simple record types, server signs on behalf of users
- **drand:** Distributed randomness for fair selection

---

## 2. Goals and Requirements

### 2.1 Functional Requirements

| ID | Requirement |
|----|-------------|
| F1 | Nodes can create and administer benchmark groups |
| F2 | Contributors can publish commitments (hashes + scores) to groups |
| F3 | Random reveal events select which commitments become public |
| F4 | Revealed data propagates to all participating nodes |
| F5 | New model scores can be added to existing commitments |
| F6 | Group admins control membership (invite/ban) |
| F7 | All federated data is cryptographically signed |
| F8 | Aggregate scores (ELO) computable from synced data |

### 2.2 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| N1 | **Resilience:** Node operates fully offline; syncs when connected |
| N2 | **Portability:** All data exportable with signatures preserved |
| N3 | **Simplicity:** Single binary deployment; SQLite storage option |
| N4 | **Low Cost:** Runnable on free-tier cloud instances |
| N5 | **No External Dependencies:** Only requires DNS and drand |

### 2.3 Out of Scope

The following are handled by existing PeerBench implementation, not this spec:

- Benchmark execution logic
- Scoring algorithms
- Review/voting system internals
- ELO calculation
- User interface
- Local draft management

---

## 3. System Overview

### 3.1 Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PEERBENCH FEDERATION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌──────────────────┐         ┌──────────────────┐                │
│    │   GROUP OWNER    │◄───────►│   GROUP OWNER    │                │
│    │  (reasoning-v1)  │         │   (coding-v1)    │                │
│    │                  │         │                  │                │
│    │ benchmarks.org   │         │ codebench.io     │                │
│    └────────┬─────────┘         └────────┬─────────┘                │
│             │                            │                          │
│     ┌───────┴───────┐            ┌───────┴───────┐                  │
│     │               │            │               │                  │
│     ▼               ▼            ▼               ▼                  │
│ ┌────────┐     ┌────────┐   ┌────────┐     ┌────────┐              │
│ │CONTRIB │     │CONTRIB │   │CONTRIB │     │CONTRIB │              │
│ │  A     │     │   B    │   │   A    │     │   C    │              │
│ │        │     │        │   │        │     │        │              │
│ │uni.edu │     │lab.org │   │uni.edu │     │ai.co   │              │
│ └────────┘     └────────┘   └────────┘     └────────┘              │
│                                                                      │
│  ◄──────── Data flows to group owner ────────►                      │
│  ◄──────── Sync pulls from group owner ──────►                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Node Roles

| Role | Responsibilities | Data Storage |
|------|-----------------|--------------|
| **Group Owner** | Creates/administers benchmark group; aggregates all group data; serves sync endpoint | All commitments, reveals, scores for owned groups |
| **Contributor** | Submits benchmark data; stores sealed prompts; responds to score requests | Own data forever; sealed prompts locally |
| **Participant** | Syncs group data; may review revealed content | Optional replication |

A single node can play multiple roles (e.g., own some groups, contribute to others).

### 3.3 Node Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        PEERBENCH NODE                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Web UI    │  │  REST API   │  │    Federation API       │ │
│  │  (Users)    │  │  (Clients)  │  │  (Other Nodes)          │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                     │               │
│         └────────────────┼─────────────────────┘               │
│                          ▼                                     │
│              ┌───────────────────────┐                         │
│              │     Core Engine       │                         │
│              ├───────────────────────┤                         │
│              │ • Identity Manager    │                         │
│              │ • Signature Service   │                         │
│              │ • Sync Controller     │                         │
│              │ • Reveal Coordinator  │                         │
│              │ • Score Aggregator    │                         │
│              └───────────┬───────────┘                         │
│                          │                                     │
│         ┌────────────────┼────────────────┐                    │
│         ▼                ▼                ▼                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐           │
│  │  Data      │  │   Key      │  │  Sealed        │           │
│  │  Store     │  │   Store    │  │  Prompts       │           │
│  │ (SQLite/   │  │            │  │  (Encrypted)   │           │
│  │  Postgres) │  │            │  │                │           │
│  └────────────┘  └────────────┘  └────────────────┘           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### 3.4 External Dependencies

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| **DNS** | Server identity verification | Cache with TTL |
| **drand** | Randomness for reveal selection | Retry until available |
| **HTTPS** | Transport security | Required, no fallback |

---

## 4. Identity System

### 4.1 Overview

PeerBench uses a two-level identity system:

1. **Server Identity:** Domain-based, verified via DNS
2. **User Identity:** Username@domain, keys managed by server

### 4.2 Server Identity

Each node is identified by its domain and an Ed25519 keypair.

#### 4.2.1 Key Generation

```python
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

# Generate on first run, store securely
private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

# Serialize for storage/transmission
public_key_bytes = public_key.public_bytes_raw()  # 32 bytes
public_key_b64 = base64.b64encode(public_key_bytes).decode()
```

#### 4.2.2 DNS Verification

Server publishes public key in DNS TXT record:

```
_peerbench.benchmarks.example.com. IN TXT "v=pb1; k=<base64 public key>"
```

Format:
- `v=pb1` — Protocol version
- `k=<key>` — Base64-encoded Ed25519 public key (44 characters)

#### 4.2.3 Well-Known Endpoint

```
GET https://benchmarks.example.com/.well-known/peerbench
```

Response:
```json
{
  "version": "1.0",
  "domain": "benchmarks.example.com",
  "public_key": "abc123...base64...xyz=",
  "federation_endpoint": "https://benchmarks.example.com/federation",
  "groups_owned": [
    {
      "id": "reasoning-v1",
      "name": "Reasoning Benchmark v1"
    }
  ],
  "groups_participating": [
    {
      "id": "coding-v1",
      "owner": "codebench.io"
    }
  ]
}
```

### 4.3 User Identity

Users are identified as `username@server-domain`.

#### 4.3.1 Key Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER KEY LIFECYCLE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User logs in (email/password/OAuth)                         │
│                     │                                            │
│                     ▼                                            │
│  2. Client checks local storage for existing key                │
│                     │                                            │
│         ┌──────────┴──────────┐                                 │
│         │                     │                                  │
│         ▼                     ▼                                  │
│    [Key exists]          [No key]                               │
│         │                     │                                  │
│         │                     ▼                                  │
│         │         3. Client generates Ed25519 keypair           │
│         │                     │                                  │
│         │                     ▼                                  │
│         │         4. Client sends public key to server          │
│         │                     │                                  │
│         │                     ▼                                  │
│         │         5. Server creates attestation record          │
│         │                     │                                  │
│         └─────────┬───────────┘                                 │
│                   │                                              │
│                   ▼                                              │
│  6. User can sign records with local private key                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Key Attestation Record

Server attests that a public key belongs to a user:

```json
{
  "type": "user_key_attestation",
  "user_id": "alice@benchmarks.example.com",
  "public_key": "def456...base64...=",
  "device_name": "Alice's Laptop",
  "attested_at": "2024-12-27T10:00:00Z",
  "expires_at": null,
  "status": "active",
  "server_signature": "<signature of above fields by server key>"
}
```

#### 4.3.3 Multiple Devices

Users can have multiple active keys (one per device). All are valid for signing. Server can revoke keys by updating status to `"revoked"`.

### 4.4 Identity Resolution

To verify a record signed by `alice@benchmarks.example.com`:

```python
def verify_identity(user_id, public_key):
    # 1. Parse user_id
    username, domain = user_id.split('@')
    
    # 2. Fetch server's public key (with caching)
    server_info = fetch_well_known(domain)
    server_pubkey = server_info['public_key']
    
    # 3. Verify server key matches DNS (with caching)
    dns_key = fetch_dns_txt(f"_peerbench.{domain}")
    assert dns_key == server_pubkey
    
    # 4. Fetch user's key attestation from server
    attestations = fetch_user_attestations(domain, username)
    
    # 5. Find matching attestation
    for att in attestations:
        if att['public_key'] == public_key and att['status'] == 'active':
            # 6. Verify attestation signature
            if verify_signature(att, server_pubkey):
                return True
    
    return False
```

---

## 5. Data Model

### 5.1 Record Types Overview

| Record Type | Purpose | Created By | Propagation |
|-------------|---------|------------|-------------|
| `benchmark_group` | Defines a benchmark group | Group admin | To all participants |
| `membership_update` | Invite/ban servers or users | Group admin | To all participants |
| `commitment` | Hash-based commitment to benchmark data | Contributors | To group owner |
| `reveal` | Actual prompt/response content | Contributors | To group owner, then all |
| `reveal_event` | Coordinates a reveal | Group admin or auto | To all participants |
| `score_update` | New model scores for existing commitment | Contributors | To group owner |
| `score_request` | Admin requests scoring of new models | Group admin | To all participants |
| `user_key_attestation` | Links user to public key | Server | To requesters |

### 5.2 Common Record Structure

All federated records share this structure:

```json
{
  "type": "<record type>",
  "id": "<unique identifier>",
  
  "<type-specific fields>": "...",
  
  "created_at": "<ISO 8601 timestamp>",
  "signatures": {
    "user": {
      "key_id": "<user_id>",
      "public_key": "<base64 public key used>",
      "signature": "<base64 signature>"
    },
    "server": {
      "key_id": "<server domain>",
      "public_key": "<base64 public key>",
      "signature": "<base64 signature>"
    }
  }
}
```

### 5.3 Record Specifications

#### 5.3.1 Benchmark Group

```json
{
  "type": "benchmark_group",
  "id": "reasoning-v1",
  
  "name": "Reasoning Benchmark v1",
  "description": "Tests logical and analytical reasoning capabilities of language models",
  
  "owner_server": "benchmarks.example.com",
  "admins": ["alice@benchmarks.example.com", "bob@benchmarks.example.com"],
  
  "membership_mode": "invite_only",
  "invited_servers": ["partner.org", "university.edu"],
  "banned_servers": [],
  "banned_users": [],
  
  "reveal_policy": {
    "on_publish": {
      "enabled": true,
      "percent": 0.01,
      "min_count": 2
    },
    "scheduled": {
      "enabled": true,
      "percent": 0.01,
      "interval_days": 90
    },
    "on_new_model": {
      "enabled": true,
      "percent": 0.005,
      "min_count": 1
    }
  },
  
  "created_at": "2024-12-27T10:00:00Z",
  "updated_at": "2024-12-27T10:00:00Z",
  
  "signatures": { ... }
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (lowercase, alphanumeric + hyphen) |
| `name` | string | Human-readable name |
| `description` | string | Detailed description |
| `owner_server` | string | Domain of owning server |
| `admins` | array | User IDs with admin privileges |
| `membership_mode` | enum | `"invite_only"` or `"public"` |
| `invited_servers` | array | Servers allowed to contribute (if invite_only) |
| `banned_servers` | array | Servers blocked from contributing |
| `banned_users` | array | Individual users blocked |
| `reveal_policy` | object | Rules for automatic reveals |

**Membership modes:**

- `invite_only`: Only servers in `invited_servers` can contribute
- `public`: Any server can contribute unless in `banned_servers`

#### 5.3.2 Membership Update

```json
{
  "type": "membership_update",
  "id": "upd-abc123",
  
  "benchmark_group": "reasoning-v1",
  "action": "invite",
  "target_type": "server",
  "target": "newpartner.org",
  "reason": "Approved research partner",
  
  "updated_by": "alice@benchmarks.example.com",
  "updated_at": "2024-12-27T10:00:00Z",
  
  "signatures": { ... }
}
```

**Actions:**

| Action | Target Type | Description |
|--------|-------------|-------------|
| `invite` | server | Add server to invited list |
| `revoke_invite` | server | Remove server from invited list |
| `ban` | server or user | Add to ban list |
| `unban` | server or user | Remove from ban list |
| `add_admin` | user | Grant admin privileges |
| `remove_admin` | user | Revoke admin privileges |

#### 5.3.3 Commitment

```json
{
  "type": "commitment",
  "id": "cmt-789xyz",
  
  "benchmark_group": "reasoning-v1",
  "author": "researcher@university.edu",
  "origin_server": "university.edu",
  
  "prompt_hash": "sha256:a1b2c3d4e5f6...",
  "prompt_metadata": {
    "category": "logical_reasoning",
    "difficulty": "hard",
    "language": "en"
  },
  
  "scores": [
    {
      "model_id": "gpt-4-0125-preview",
      "system_prompt_hash": "sha256:1a2b3c4d...",
      "parameters_hash": "sha256:5e6f7a8b...",
      "score": 0.85,
      "response_hash": "sha256:9c0d1e2f...",
      "scored_at": "2024-12-27T09:30:00Z"
    },
    {
      "model_id": "claude-3-opus-20240229",
      "system_prompt_hash": "sha256:1a2b3c4d...",
      "parameters_hash": "sha256:5e6f7a8b...",
      "score": 0.92,
      "response_hash": "sha256:3g4h5i6j...",
      "scored_at": "2024-12-27T09:35:00Z"
    }
  ],
  
  "status": "committed",
  "published_at": "2024-12-27T10:00:00Z",
  "created_at": "2024-12-27T08:00:00Z",
  
  "signatures": { ... }
}
```

**Status values:**

| Status | Description |
|--------|-------------|
| `committed` | Published, hidden, awaiting potential reveal |
| `revealed` | Selected for reveal, full content published |

**Hash format:** `sha256:<64 hex characters>`

#### 5.3.4 Reveal Event

```json
{
  "type": "reveal_event",
  "id": "rev-evt-456",
  
  "benchmark_group": "reasoning-v1",
  
  "trigger_type": "admin_manual",
  "triggered_by": "alice@benchmarks.example.com",
  "origin_server": "benchmarks.example.com",
  
  "reveal_config": {
    "percent": 0.01,
    "min_count": 2,
    "max_count": null,
    "scope": "all_unrevealed"
  },
  
  "randomness": {
    "source": "drand",
    "chain_hash": "8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce",
    "round": 12345679,
    "signature": "abcdef123456..."
  },
  
  "triggered_at": "2024-12-27T11:59:57Z",
  "effective_at": "2024-12-27T12:00:00Z",
  
  "signatures": { ... }
}
```

**Trigger types:**

| Type | Description |
|------|-------------|
| `on_publish` | Automatic when contributor publishes new data |
| `scheduled` | Periodic based on group's reveal_policy |
| `on_new_model` | When new model scores are added |
| `admin_manual` | Manually triggered by group admin |

#### 5.3.5 Reveal

```json
{
  "type": "reveal",
  "id": "rev-content-789",
  
  "commitment_id": "cmt-789xyz",
  "reveal_event_id": "rev-evt-456",
  
  "author": "researcher@university.edu",
  "origin_server": "university.edu",
  
  "prompt": {
    "text": "Consider the following argument: All mammals are warm-blooded...",
    "metadata": {
      "category": "logical_reasoning",
      "difficulty": "hard",
      "language": "en"
    }
  },
  
  "responses": [
    {
      "model_id": "gpt-4-0125-preview",
      "system_prompt": "You are a helpful assistant specializing in logic.",
      "parameters": {
        "temperature": 0.7,
        "max_tokens": 1024
      },
      "response_text": "The argument contains a logical flaw known as...",
      "score": 0.85
    },
    {
      "model_id": "claude-3-opus-20240229",
      "system_prompt": "You are a helpful assistant specializing in logic.",
      "parameters": {
        "temperature": 0.7,
        "max_tokens": 1024
      },
      "response_text": "This argument exhibits the fallacy of...",
      "score": 0.92
    }
  ],
  
  "revealed_at": "2024-12-27T12:00:30Z",
  
  "signatures": { ... }
}
```

#### 5.3.6 Score Update

```json
{
  "type": "score_update",
  "id": "score-upd-101",
  
  "commitment_id": "cmt-789xyz",
  
  "author": "researcher@university.edu",
  "origin_server": "university.edu",
  
  "new_scores": [
    {
      "model_id": "gpt-5-preview",
      "system_prompt_hash": "sha256:1a2b3c4d...",
      "parameters_hash": "sha256:5e6f7a8b...",
      "score": 0.94,
      "response_hash": "sha256:7k8l9m0n...",
      "scored_at": "2024-12-28T15:00:00Z"
    }
  ],
  
  "request_id": "score-req-202",
  
  "created_at": "2024-12-28T15:05:00Z",
  
  "signatures": { ... }
}
```

#### 5.3.7 Score Request

```json
{
  "type": "score_request",
  "id": "score-req-202",
  
  "benchmark_group": "reasoning-v1",
  
  "requested_by": "alice@benchmarks.example.com",
  "origin_server": "benchmarks.example.com",
  
  "models": [
    {
      "model_id": "gpt-5-preview",
      "system_prompt": "You are a helpful assistant specializing in logic.",
      "parameters": {
        "temperature": 0.7,
        "max_tokens": 1024
      }
    }
  ],
  
  "scope": "all_committed",
  "deadline": "2024-12-30T00:00:00Z",
  
  "requested_at": "2024-12-28T10:00:00Z",
  
  "signatures": { ... }
}
```

### 5.4 Record Identifiers

**Format:** `<type-prefix>-<random-alphanumeric>`

| Type | Prefix | Example |
|------|--------|---------|
| commitment | `cmt` | `cmt-a1b2c3d4` |
| reveal | `rev` | `rev-e5f6g7h8` |
| reveal_event | `revt` | `revt-i9j0k1l2` |
| score_update | `scup` | `scup-m3n4o5p6` |
| score_request | `scrq` | `scrq-q7r8s9t0` |
| membership_update | `memb` | `memb-u1v2w3x4` |

IDs are generated by the creating node. Collision is astronomically unlikely with sufficient randomness (recommend 16+ random characters).

### 5.5 Record Immutability

| Record Type | Mutable? | Notes |
|-------------|----------|-------|
| `benchmark_group` | Yes | Admins can update settings |
| `membership_update` | No | Append new update to change |
| `commitment` | Append-only | Can add scores, never remove |
| `reveal` | No | Immutable once created |
| `reveal_event` | No | Immutable once created |
| `score_update` | No | Immutable; create new for corrections |
| `score_request` | No | Immutable once sent |

**Deletion:** Soft-delete only. Records marked `"deleted": true` with `deleted_at` timestamp. Original content preserved for audit.

---

## 6. Federation Protocol

### 6.1 Overview

Federation uses a **hub-and-spoke model per group**:

- **Group owner** is the hub: aggregates all data, serves sync
- **Contributors** push to owner, pull from owner
- **No peer-to-peer sync** required (simplifies protocol)

### 6.2 Discovery

#### 6.2.1 Finding a Node

Given a server domain:

```
1. Fetch https://<domain>/.well-known/peerbench
2. Verify response.public_key matches DNS TXT record
3. Cache result with TTL (recommend: 1 hour)
```

#### 6.2.2 Finding a Group

Groups are identified as `<group-id>@<owner-domain>`:

```
reasoning-v1@benchmarks.example.com
```

To join/sync:
1. Resolve owner domain via discovery
2. Fetch group details from owner's federation API

### 6.3 Sync Protocol

#### 6.3.1 Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│   CONTRIBUTOR   │                    │   GROUP OWNER   │
│                 │                    │                 │
│  ┌───────────┐  │    Push Records    │  ┌───────────┐  │
│  │ Local     │──┼───────────────────►│  │ Group     │  │
│  │ Records   │  │                    │  │ Store     │  │
│  └───────────┘  │                    │  └───────────┘  │
│                 │                    │        │        │
│  ┌───────────┐  │    Pull Sync       │        │        │
│  │ Synced    │◄─┼────────────────────┼────────┘        │
│  │ Records   │  │                    │                 │
│  └───────────┘  │                    │                 │
│                 │                    │                 │
└─────────────────┘                    └─────────────────┘
```

#### 6.3.2 Sync State

Each node tracks sync state per group:

```json
{
  "group_id": "reasoning-v1@benchmarks.example.com",
  "last_sync": "2024-12-27T10:00:00Z",
  "last_cursor": "cursor_abc123",
  "sync_status": "ok"
}
```

#### 6.3.3 Sync Flow

**Periodic sync (every 5 minutes recommended):**

```python
async def sync_group(group):
    owner = resolve_server(group.owner_server)
    
    # 1. Pull updates from owner
    last_sync = get_last_sync(group.id)
    
    while True:
        response = await fetch(
            f"{owner.federation_endpoint}/groups/{group.id}/sync",
            params={"since": last_sync, "limit": 100},
            auth=server_signature()
        )
        
        for record in response.records:
            if await verify_record(record):
                await store_record(record)
            else:
                log_warning(f"Invalid record: {record.id}")
        
        if not response.has_more:
            break
        last_sync = response.cursor
    
    update_last_sync(group.id, response.server_time)
    
    # 2. Push our new records to owner
    our_records = get_unpushed_records(group.id)
    if our_records:
        await push_records(owner, group.id, our_records)
```

### 6.4 Server Authentication

Server-to-server requests use HTTP signatures.

#### 6.4.1 Signature Format

```http
POST /federation/groups/reasoning-v1/records HTTP/1.1
Host: benchmarks.example.com
Date: Fri, 27 Dec 2024 10:00:00 GMT
Content-Type: application/json
X-PeerBench-Server: contributor.org
X-PeerBench-Signature: keyId="contributor.org",
                       algorithm="ed25519",
                       headers="(request-target) host date content-type x-peerbench-server",
                       signature="base64signature..."

{"records": [...]}
```

#### 6.4.2 Signing Algorithm

```python
def sign_request(request, private_key, domain):
    # 1. Build signing string
    headers_to_sign = ["(request-target)", "host", "date", "content-type", "x-peerbench-server"]
    
    signing_parts = []
    for header in headers_to_sign:
        if header == "(request-target)":
            value = f"{request.method.lower()} {request.path}"
        else:
            value = request.headers[header]
        signing_parts.append(f"{header}: {value}")
    
    signing_string = "\n".join(signing_parts)
    
    # 2. Sign
    signature = private_key.sign(signing_string.encode())
    
    # 3. Build header
    return (
        f'keyId="{domain}",'
        f'algorithm="ed25519",'
        f'headers="{" ".join(headers_to_sign)}",'
        f'signature="{base64.b64encode(signature).decode()}"'
    )
```

#### 6.4.3 Verification

```python
async def verify_request(request):
    # 1. Extract signature header
    sig_header = parse_signature_header(request.headers["X-PeerBench-Signature"])
    
    # 2. Get server's public key
    server_domain = request.headers["X-PeerBench-Server"]
    server_info = await resolve_server(server_domain)
    
    # 3. Reconstruct signing string
    signing_string = build_signing_string(request, sig_header.headers)
    
    # 4. Verify signature
    public_key = load_public_key(server_info.public_key)
    return public_key.verify(sig_header.signature, signing_string.encode())
```

### 6.5 Error Handling

#### 6.5.1 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (malformed data) |
| 401 | Authentication failed |
| 403 | Not authorized (not a member, banned) |
| 404 | Group or record not found |
| 409 | Conflict (duplicate record ID) |
| 429 | Rate limited |
| 500 | Server error |

#### 6.5.2 Error Response Format

```json
{
  "error": {
    "code": "NOT_MEMBER",
    "message": "Server contributor.org is not a member of reasoning-v1",
    "details": {
      "group": "reasoning-v1",
      "server": "contributor.org"
    }
  }
}
```

#### 6.5.3 Retry Strategy

| Error Type | Retry? | Backoff |
|------------|--------|---------|
| Network error | Yes | Exponential (1s, 2s, 4s, ..., max 5m) |
| 429 Rate Limited | Yes | Use Retry-After header |
| 5xx Server Error | Yes | Exponential |
| 4xx Client Error | No | Fix request |

---

## 7. Reveal Mechanism

### 7.1 Overview

Reveals ensure that randomly-selected benchmark data becomes public for validation. The selection uses external randomness (drand) to prevent manipulation.

### 7.2 drand Integration

#### 7.2.1 drand Basics

[drand](https://drand.love/) is a distributed randomness beacon. Key properties:

- Publishes random values every 3 seconds
- Values are unpredictable until published
- Publicly verifiable

**Chain used:** League of Entropy mainnet
```
Chain Hash: 8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce
Period: 3 seconds
Genesis: 1677685200 (March 1, 2023)
```

#### 7.2.2 Fetching Randomness

```python
import httpx

DRAND_CHAIN = "8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce"
DRAND_ENDPOINTS = [
    "https://api.drand.sh",
    "https://drand.cloudflare.com",
]

async def fetch_drand_round(round_number: int) -> dict:
    for endpoint in DRAND_ENDPOINTS:
        try:
            url = f"{endpoint}/{DRAND_CHAIN}/public/{round_number}"
            response = await httpx.get(url, timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception:
            continue
    raise Exception(f"Failed to fetch drand round {round_number}")

async def fetch_drand_latest() -> dict:
    for endpoint in DRAND_ENDPOINTS:
        try:
            url = f"{endpoint}/{DRAND_CHAIN}/public/latest"
            response = await httpx.get(url, timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception:
            continue
    raise Exception("Failed to fetch latest drand")
```

#### 7.2.3 drand Response

```json
{
  "round": 12345679,
  "randomness": "a1b2c3d4e5f6...",
  "signature": "98f7e6d5c4b3..."
}
```

### 7.3 Reveal Flows

#### 7.3.1 On-Publish Reveal (Automatic)

Triggered when contributor publishes new commitments:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ON-PUBLISH REVEAL FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Contributor                           drand           Owner    │
│      │                                   │               │      │
│      │ 1. Publish commitments            │               │      │
│      ├───────────────────────────────────┼──────────────►│      │
│      │                                   │               │      │
│      │ 2. Fetch current round            │               │      │
│      ├──────────────────────────────────►│               │      │
│      │◄──────────────────────────────────┤               │      │
│      │    round N                        │               │      │
│      │                                   │               │      │
│      │ 3. Wait ~3 seconds                │               │      │
│      │                                   │               │      │
│      │ 4. Fetch round N+1                │               │      │
│      ├──────────────────────────────────►│               │      │
│      │◄──────────────────────────────────┤               │      │
│      │    randomness                     │               │      │
│      │                                   │               │      │
│      │ 5. Select commitments to reveal   │               │      │
│      │    (deterministic algorithm)      │               │      │
│      │                                   │               │      │
│      │ 6. Send reveal_event + reveals    │               │      │
│      ├───────────────────────────────────┼──────────────►│      │
│      │                                   │               │      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation:**

```python
async def publish_and_reveal(commitments, group):
    # 1. Send commitments to group owner
    await push_records(group.owner, group.id, commitments)
    
    # 2. Get current drand round
    current = await fetch_drand_latest()
    target_round = current["round"] + 1
    
    # 3. Wait for next round
    await asyncio.sleep(3.5)  # Slightly more than 3s to ensure availability
    
    # 4. Fetch target round
    beacon = await fetch_drand_round(target_round)
    
    # 5. Select for reveal
    policy = group.reveal_policy["on_publish"]
    selected = select_for_reveal(
        commitments=commitments,
        percent=policy["percent"],
        min_count=policy["min_count"],
        beacon=beacon,
        context=f"{group.id}:on_publish:{OUR_DOMAIN}:{now_iso()}"
    )
    
    # 6. Create reveal event
    reveal_event = create_reveal_event(
        group=group,
        trigger_type="on_publish",
        beacon=beacon,
        config=policy
    )
    
    # 7. Create reveals
    reveals = [create_reveal(c, reveal_event) for c in selected]
    
    # 8. Send to owner
    await push_records(group.owner, group.id, [reveal_event] + reveals)
```

#### 7.3.2 Admin-Triggered Reveal

Admin broadcasts reveal event; all contributors respond:

```
┌─────────────────────────────────────────────────────────────────┐
│                  ADMIN-TRIGGERED REVEAL FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Admin/Owner       drand       Contributor A    Contributor B   │
│      │               │               │               │          │
│      │ 1. Get round  │               │               │          │
│      ├──────────────►│               │               │          │
│      │◄──────────────┤               │               │          │
│      │  round N      │               │               │          │
│      │               │               │               │          │
│      │ 2. Broadcast reveal_event (round N+1)         │          │
│      ├───────────────┼──────────────►├──────────────►│          │
│      │               │               │               │          │
│      │               │ 3. Wait for round N+1         │          │
│      │               │               │               │          │
│      │               │ 4. Fetch round N+1            │          │
│      │               │◄──────────────┤               │          │
│      │               │◄──────────────┼───────────────┤          │
│      │               │               │               │          │
│      │               │ 5. Select & reveal            │          │
│      │◄──────────────┼───────────────┤               │          │
│      │◄──────────────┼───────────────┼───────────────┤          │
│      │  reveals      │               │               │          │
│      │               │               │               │          │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Selection Algorithm

Deterministic selection ensures all nodes agree on which commitments are revealed:

```python
import hashlib
import random

def select_for_reveal(
    commitments: list,
    percent: float,
    min_count: int,
    beacon: dict,
    context: str
) -> list:
    """
    Deterministically select commitments for reveal.
    
    Args:
        commitments: List of commitment records
        percent: Fraction to reveal (e.g., 0.01 for 1%)
        min_count: Minimum number to reveal
        beacon: drand beacon response
        context: Unique context string for this selection
    
    Returns:
        List of selected commitments
    """
    # 1. Filter to unrevealed only
    unrevealed = [c for c in commitments if c["status"] == "committed"]
    
    if not unrevealed:
        return []
    
    # 2. Create deterministic seed
    seed_input = (
        beacon["signature"].encode() +  # drand signature (unpredictable)
        context.encode()                  # context (unique per selection)
    )
    seed = hashlib.sha256(seed_input).digest()
    
    # 3. Seed RNG
    rng = random.Random(int.from_bytes(seed[:8], 'big'))
    
    # 4. Calculate count
    count = max(min_count, int(len(unrevealed) * percent))
    count = min(count, len(unrevealed))
    
    # 5. Sort commitments by ID for determinism
    sorted_commitments = sorted(unrevealed, key=lambda c: c["id"])
    
    # 6. Shuffle deterministically
    shuffled = sorted_commitments.copy()
    rng.shuffle(shuffled)
    
    # 7. Select first N
    return shuffled[:count]
```

### 7.5 Verification

Anyone can verify a reveal was correctly selected:

```python
def verify_reveal_selection(reveal, reveal_event, all_commitments):
    """Verify that a reveal was correctly selected."""
    
    # 1. Verify drand beacon (cryptographic verification)
    beacon = fetch_and_verify_drand(reveal_event["randomness"]["round"])
    assert beacon["signature"] == reveal_event["randomness"]["signature"]
    
    # 2. Get commitments that were unrevealed at event time
    unrevealed = [
        c for c in all_commitments
        if c["published_at"] < reveal_event["effective_at"]
        and c["status"] == "committed"  # at that time
    ]
    
    # 3. Re-run selection
    expected = select_for_reveal(
        commitments=unrevealed,
        percent=reveal_event["reveal_config"]["percent"],
        min_count=reveal_event["reveal_config"]["min_count"],
        beacon=beacon,
        context=build_context(reveal_event)
    )
    
    # 4. Check reveal is in expected set
    return reveal["commitment_id"] in [c["id"] for c in expected]
```

---

## 8. Cryptographic Design

### 8.1 Algorithms

| Purpose | Algorithm | Key Size |
|---------|-----------|----------|
| Signing | Ed25519 | 256-bit |
| Hashing | SHA-256 | 256-bit |

### 8.2 Canonical Serialization

Records are serialized deterministically before signing:

```python
import json

def canonical(obj: dict) -> bytes:
    """
    Produce canonical JSON bytes for signing.
    
    Rules:
    - Keys sorted alphabetically
    - No whitespace
    - UTF-8 encoding
    - No trailing newline
    """
    return json.dumps(
        obj,
        sort_keys=True,
        separators=(',', ':'),
        ensure_ascii=False
    ).encode('utf-8')
```

### 8.3 Signature Process

#### 8.3.1 What Gets Signed

For a record:

```json
{
  "type": "commitment",
  "id": "cmt-abc123",
  "benchmark_group": "reasoning-v1",
  "...": "other fields"
}
```

#### 8.3.2 User Signature

User signs the canonical record (without signatures field):

```python
def sign_as_user(record, user_private_key, user_id, user_public_key):
    # 1. Canonical bytes of record
    record_bytes = canonical(record)
    
    # 2. Sign
    signature = user_private_key.sign(record_bytes)
    
    return {
        "key_id": user_id,
        "public_key": base64.b64encode(user_public_key.public_bytes_raw()).decode(),
        "signature": base64.b64encode(signature).decode()
    }
```

#### 8.3.3 Server Signature

Server signs the canonical record PLUS the user signature:

```python
def sign_as_server(record, user_signature, server_private_key, server_domain, server_public_key):
    # 1. Canonical bytes of record
    record_bytes = canonical(record)
    
    # 2. Append user signature bytes
    user_sig_bytes = base64.b64decode(user_signature["signature"])
    signing_input = record_bytes + user_sig_bytes
    
    # 3. Sign
    signature = server_private_key.sign(signing_input)
    
    return {
        "key_id": server_domain,
        "public_key": base64.b64encode(server_public_key.public_bytes_raw()).decode(),
        "signature": base64.b64encode(signature).decode()
    }
```

#### 8.3.4 Complete Signed Record

```python
def create_signed_record(record, user_private_key, user_info, server_private_key, server_info):
    # 1. User signs record
    user_sig = sign_as_user(
        record,
        user_private_key,
        user_info.id,
        user_info.public_key
    )
    
    # 2. Server signs record + user signature
    server_sig = sign_as_server(
        record,
        user_sig,
        server_private_key,
        server_info.domain,
        server_info.public_key
    )
    
    # 3. Assemble final record
    return {
        **record,
        "signatures": {
            "user": user_sig,
            "server": server_sig
        }
    }
```

### 8.4 Verification Process

```python
async def verify_record(record):
    """Verify a record's signatures."""
    
    # 1. Extract components
    signatures = record.pop("signatures")
    user_sig = signatures["user"]
    server_sig = signatures["server"]
    
    # 2. Verify user signature
    record_bytes = canonical(record)
    user_pubkey = load_public_key(user_sig["public_key"])
    
    if not verify_signature(user_pubkey, user_sig["signature"], record_bytes):
        return False, "Invalid user signature"
    
    # 3. Verify server signature
    user_sig_bytes = base64.b64decode(user_sig["signature"])
    server_signing_input = record_bytes + user_sig_bytes
    server_pubkey = load_public_key(server_sig["public_key"])
    
    if not verify_signature(server_pubkey, server_sig["signature"], server_signing_input):
        return False, "Invalid server signature"
    
    # 4. Verify server public key matches DNS
    server_domain = server_sig["key_id"]
    expected_key = await fetch_server_key_from_dns(server_domain)
    
    if server_sig["public_key"] != expected_key:
        return False, "Server key doesn't match DNS"
    
    # 5. Verify user key is attested by server
    user_id = user_sig["key_id"]
    attestations = await fetch_user_attestations(server_domain, user_id)
    
    valid_attestation = any(
        a["public_key"] == user_sig["public_key"] and a["status"] == "active"
        for a in attestations
    )
    
    if not valid_attestation:
        return False, "User key not attested by server"
    
    return True, None
```

### 8.5 Hash Verification

When a reveal is published, verify it matches the commitment:

```python
def verify_reveal(reveal, commitment):
    """Verify reveal matches commitment hashes."""
    
    # 1. Verify prompt hash
    prompt_hash = "sha256:" + hashlib.sha256(
        reveal["prompt"]["text"].encode()
    ).hexdigest()
    
    if prompt_hash != commitment["prompt_hash"]:
        return False, "Prompt hash mismatch"
    
    # 2. Verify response hashes
    for revealed_response in reveal["responses"]:
        model_id = revealed_response["model_id"]
        
        # Find corresponding commitment score
        committed_score = next(
            (s for s in commitment["scores"] if s["model_id"] == model_id),
            None
        )
        
        if not committed_score:
            return False, f"No commitment for model {model_id}"
        
        response_hash = "sha256:" + hashlib.sha256(
            revealed_response["response_text"].encode()
        ).hexdigest()
        
        if response_hash != committed_score["response_hash"]:
            return False, f"Response hash mismatch for {model_id}"
        
        # 3. Verify system prompt hash
        system_hash = "sha256:" + hashlib.sha256(
            revealed_response["system_prompt"].encode()
        ).hexdigest()
        
        if system_hash != committed_score["system_prompt_hash"]:
            return False, f"System prompt hash mismatch for {model_id}"
    
    return True, None
```

---

## 9. API Specification

### 9.1 Endpoints Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/.well-known/peerbench` | GET | None | Server discovery |
| `/federation/groups` | GET | Server | List groups |
| `/federation/groups/{id}` | GET | Server | Get group details |
| `/federation/groups/{id}/sync` | GET | Server | Sync records |
| `/federation/groups/{id}/records` | POST | Server | Submit records |
| `/federation/groups/{id}/servers` | GET | Server | List participating servers |
| `/federation/users/{id}/keys` | GET | None | Get user key attestations |
| `/public/groups/{id}/scores` | GET | None | Public score data |
| `/public/groups/{id}/reveals` | GET | None | Public revealed data |

### 9.2 Discovery

#### GET /.well-known/peerbench

**Response:**
```json
{
  "version": "1.0",
  "domain": "benchmarks.example.com",
  "public_key": "MCowBQYDK2VwAyEA...",
  "federation_endpoint": "https://benchmarks.example.com/federation",
  "groups_owned": [
    {
      "id": "reasoning-v1",
      "name": "Reasoning Benchmark v1",
      "membership_mode": "invite_only"
    }
  ],
  "groups_participating": [
    {
      "id": "coding-v1",
      "owner": "codebench.io",
      "role": "contributor"
    }
  ],
  "capabilities": ["sync", "reveal", "score"]
}
```

### 9.3 Sync

#### GET /federation/groups/{group_id}/sync

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `since` | ISO timestamp | No | Return records updated after this time |
| `types` | comma-separated | No | Filter by record types |
| `limit` | integer | No | Max records per page (default: 100, max: 1000) |
| `cursor` | string | No | Pagination cursor |

**Response:**
```json
{
  "records": [
    {
      "type": "commitment",
      "id": "cmt-abc123",
      "...": "..."
    },
    {
      "type": "reveal",
      "id": "rev-def456",
      "...": "..."
    }
  ],
  "cursor": "next_page_cursor_xyz",
  "has_more": true,
  "server_time": "2024-12-27T10:05:00Z"
}
```

### 9.4 Record Submission

#### POST /federation/groups/{group_id}/records

**Request:**
```json
{
  "records": [
    {
      "type": "commitment",
      "id": "cmt-new123",
      "...": "...",
      "signatures": { ... }
    }
  ]
}
```

**Response:**
```json
{
  "accepted": ["cmt-new123"],
  "rejected": [
    {
      "id": "cmt-bad456",
      "error": {
        "code": "INVALID_SIGNATURE",
        "message": "User signature verification failed"
      }
    }
  ]
}
```

### 9.5 User Keys

#### GET /federation/users/{user_id}/keys

**Response:**
```json
{
  "user_id": "alice@benchmarks.example.com",
  "keys": [
    {
      "public_key": "MCowBQYDK2VwAyEA...",
      "device_name": "Alice's Laptop",
      "status": "active",
      "attested_at": "2024-12-27T10:00:00Z",
      "server_signature": "..."
    },
    {
      "public_key": "MCowBQYDK2VwAyEB...",
      "device_name": "Alice's Phone",
      "status": "active",
      "attested_at": "2024-12-28T14:00:00Z",
      "server_signature": "..."
    }
  ]
}
```

### 9.6 Public Data

#### GET /public/groups/{group_id}/scores

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | Filter by model ID |
| `since` | ISO timestamp | Scores after this time |

**Response:**
```json
{
  "group_id": "reasoning-v1",
  "scores": [
    {
      "model_id": "gpt-4-0125-preview",
      "total_samples": 1523,
      "revealed_samples": 47,
      "average_score": 0.847,
      "score_distribution": {
        "p10": 0.65,
        "p50": 0.85,
        "p90": 0.95
      }
    }
  ],
  "updated_at": "2024-12-27T10:00:00Z"
}
```

#### GET /public/groups/{group_id}/reveals

**Response:**
```json
{
  "group_id": "reasoning-v1",
  "reveals": [
    {
      "id": "rev-abc123",
      "prompt": "Consider the following argument...",
      "responses": [...],
      "revealed_at": "2024-12-27T12:00:00Z",
      "reviews_summary": {
        "valid": 12,
        "invalid": 1,
        "disputed": 0
      }
    }
  ],
  "cursor": "...",
  "has_more": true
}
```

---

## 10. Security Model

### 10.1 Threat Model

#### 10.1.1 Assumptions

| Assumption | Rationale |
|------------|-----------|
| Most participants are honest | Benchmark contributors want accurate data |
| DNS is secure | DNSSEC available; registrar attacks are rare |
| drand is reliable | Distributed, threshold cryptography |
| TLS is secure | Industry standard |

#### 10.1.2 Adversaries

| Adversary | Goal | Capability |
|-----------|------|------------|
| **Model Provider** | Inflate own model's scores | Create fake benchmark data; bribe contributors |
| **Malicious Contributor** | Gain undeserved reputation | Submit low-quality data; game reveals |
| **Malicious Server Admin** | Impersonate users | Full control of server |
| **Network Attacker** | Intercept/modify data | Man-in-the-middle |

### 10.2 Mitigations

| Threat | Mitigation |
|--------|-----------|
| **Fake data submission** | Commit-then-reveal; random selection prevents knowing what will be audited |
| **Score manipulation** | Append-only model; historical scores preserved |
| **Impersonation** | Dual signatures (user + server); DNS verification |
| **Biased reveal selection** | External randomness (drand); deterministic algorithm |
| **Retroactive changes** | Cryptographic hashes; signatures over content |
| **Sybil attacks** | Group admin controls membership; reputation system |
| **Data interception** | TLS required for all federation traffic |

### 10.3 Server Compromise

If a server is compromised:

**What attacker CAN do:**
- Sign new records as any user on that server
- Access all sealed prompts on that server
- Stop participating in groups

**What attacker CANNOT do:**
- Modify already-distributed records (signatures won't verify)
- Impersonate other servers (DNS verification)
- Predict future reveals (drand randomness)
- Access sealed prompts on other servers

**Recovery:**
- Rotate server key
- Update DNS TXT record
- Other nodes will reject old signatures
- Users can move to different servers

### 10.4 Trust Hierarchy

```
DNS Root
    │
    ▼
Domain Registrar
    │
    ▼
Server (domain owner)
    │
    ├──► Server Key (verified via DNS)
    │
    └──► User Keys (attested by server)
```

Users ultimately trust their server. Servers are identified by DNS-verified domains.

---

## 11. Implementation Guide

### 11.1 Technology Choices

**Recommended stack:**

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| Language | Python 3.11+ or Go | Mature crypto libraries |
| Database | SQLite (small) or PostgreSQL (large) | Simple, reliable |
| Web Framework | FastAPI (Python) or Chi (Go) | Async support, easy |
| Crypto | PyNaCl / libsodium | Ed25519 support |
| HTTP Client | httpx (Python) | Async, HTTP/2 |

### 11.2 Database Schema

```sql
-- Server identity
CREATE TABLE server_config (
    domain TEXT PRIMARY KEY,
    private_key BLOB NOT NULL,  -- Encrypted at rest
    public_key TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- User keys
CREATE TABLE user_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    public_key TEXT NOT NULL,
    device_name TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    attested_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    server_signature TEXT NOT NULL
);

-- Benchmark groups
CREATE TABLE benchmark_groups (
    id TEXT PRIMARY KEY,
    owner_server TEXT NOT NULL,
    data JSON NOT NULL,  -- Full group record
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- All federated records
CREATE TABLE records (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    group_id TEXT,
    author TEXT NOT NULL,
    origin_server TEXT NOT NULL,
    data JSON NOT NULL,  -- Full record with signatures
    created_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_records_group ON records(group_id);
CREATE INDEX idx_records_type ON records(type);
CREATE INDEX idx_records_author ON records(author);
CREATE INDEX idx_records_created ON records(created_at);

-- Sync state per group
CREATE TABLE sync_state (
    group_id TEXT PRIMARY KEY,
    last_sync TIMESTAMP,
    last_cursor TEXT,
    status TEXT
);

-- Sealed prompts (contributor only, never federated)
CREATE TABLE sealed_prompts (
    commitment_id TEXT PRIMARY KEY,
    prompt_text TEXT NOT NULL,  -- Encrypted at rest
    responses JSON NOT NULL,    -- Encrypted at rest
    created_at TIMESTAMP NOT NULL
);
```

### 11.3 Implementation Phases

#### Phase 1: Foundation (Week 1-2)

- [ ] Server key generation and storage
- [ ] DNS TXT record setup tooling
- [ ] Well-known endpoint
- [ ] Basic signature creation/verification
- [ ] Canonical JSON serialization

#### Phase 2: Identity (Week 2-3)

- [ ] User key generation (client-side)
- [ ] Key attestation by server
- [ ] User key storage and retrieval API
- [ ] Multi-device key management

#### Phase 3: Groups (Week 3-4)

- [ ] Benchmark group CRUD
- [ ] Membership management (invite/ban)
- [ ] Group directory

#### Phase 4: Core Federation (Week 4-6)

- [ ] HTTP signature authentication
- [ ] Sync endpoint (pull)
- [ ] Record submission endpoint (push)
- [ ] Record validation
- [ ] Sync scheduler

#### Phase 5: Commits & Reveals (Week 6-8)

- [ ] Commitment record creation
- [ ] drand integration
- [ ] Reveal selection algorithm
- [ ] On-publish reveal flow
- [ ] Admin-triggered reveal flow
- [ ] Reveal verification

#### Phase 6: Scoring (Week 8-9)

- [ ] Score update records
- [ ] Score request signals
- [ ] Automatic scoring trigger

#### Phase 7: Polish (Week 9-10)

- [ ] Export/import functionality
- [ ] Monitoring and logging
- [ ] Rate limiting
- [ ] Documentation

### 11.4 Testing Strategy

| Test Type | Coverage |
|-----------|----------|
| Unit | Signature creation/verification, canonical serialization, reveal selection |
| Integration | Full sync flow between two test nodes |
| End-to-end | Complete commit → reveal → verify cycle |
| Security | Signature forgery attempts, replay attacks |

### 11.5 Deployment

**Minimum requirements:**
- 1 vCPU
- 512MB RAM
- 10GB storage
- Domain with DNS control
- TLS certificate (Let's Encrypt)

**Docker deployment:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  peerbench:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=sqlite:///data/peerbench.db
      - SERVER_DOMAIN=benchmarks.example.com
```

---

## 12. Appendices

### A. Glossary

| Term | Definition |
|------|------------|
| **Commitment** | Hash-based promise of benchmark data before reveal |
| **Reveal** | Publication of actual prompt/response content |
| **Reveal Event** | Coordinated reveal across multiple contributors |
| **Group Owner** | Server that administers a benchmark group |
| **Contributor** | Server that submits benchmark data to a group |
| **Sealed Prompt** | Encrypted/hidden prompt stored only on contributor |
| **drand** | Distributed randomness beacon network |
| **Attestation** | Server's signature vouching for a user's key |

### B. References

| Reference | URL |
|-----------|-----|
| Ed25519 | https://ed25519.cr.yp.to/ |
| drand | https://drand.love/ |
| HTTP Signatures | https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures |
| JSON Canonicalization | https://datatracker.ietf.org/doc/html/rfc8785 |
| PeerBench Paper | https://arxiv.org/abs/2510.07575 |
| PeerBench Prototype | https://github.com/peerbench/peerBench |

### C. Example Records

#### C.1 Complete Signed Commitment

```json
{
  "type": "commitment",
  "id": "cmt-7f8a9b0c1d2e",
  "benchmark_group": "reasoning-v1@benchmarks.example.com",
  "author": "researcher@university.edu",
  "origin_server": "university.edu",
  "prompt_hash": "sha256:3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
  "prompt_metadata": {
    "category": "logical_reasoning",
    "difficulty": "hard",
    "language": "en"
  },
  "scores": [
    {
      "model_id": "gpt-4-0125-preview",
      "system_prompt_hash": "sha256:8b9f2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
      "parameters_hash": "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      "score": 0.85,
      "response_hash": "sha256:2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c",
      "scored_at": "2024-12-27T09:30:00Z"
    }
  ],
  "status": "committed",
  "published_at": "2024-12-27T10:00:00Z",
  "created_at": "2024-12-27T08:00:00Z",
  "signatures": {
    "user": {
      "key_id": "researcher@university.edu",
      "public_key": "MCowBQYDK2VwAyEAabcdefghijklmnopqrstuvwxyz0123456789ABCDEFG=",
      "signature": "MEUCIQC9x8..."
    },
    "server": {
      "key_id": "university.edu",
      "public_key": "MCowBQYDK2VwAyEA0123456789abcdefghijklmnopqrstuvwxyzABCDEFG=",
      "signature": "MEYCIQDvKl..."
    }
  }
}
```

### D. Protocol Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12 | Initial specification |

---

*End of Document*
