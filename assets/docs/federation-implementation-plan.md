# PeerBench Federation Implementation Plan

**Created:** December 2024
**Status:** Planning
**Branch:** `federated`

---

## Executive Summary

This document outlines the implementation plan to add federation capabilities to PeerBench. The existing codebase already has ~80% of the required infrastructure in place. This plan focuses on the remaining work needed to enable server-to-server federation.

### Existing Infrastructure (Already Built)

| Component | Status | Location |
|-----------|--------|----------|
| Hash commitments (CID + SHA256) | ✅ Complete | `hash_registrations` table |
| Raw data storage | ✅ Complete | `raw_data_registrations` table |
| Prompt/Response reveal flags | ✅ Complete | `isRevealed` column on prompts/responses |
| User key management | ✅ Complete | `key_to_user` table + `key.service.ts` |
| Signature infrastructure | ✅ Complete | secp256k1 via viem |
| Content hashing | ✅ Complete | CID + SHA256 on all records |

### What Needs to Be Built

| Component | Priority | Effort |
|-----------|----------|--------|
| Server identity system | P0 | Medium |
| Schema additions (origin_server, author) | P0 | Small |
| ~~Ed25519 key support~~ | N/A | Use existing secp256k1 |
| Well-known endpoint | P1 | Small |
| Federation sync protocol | P2 | Large |
| drand reveal integration | P2 | Medium |
| Public data endpoints | P3 | Small |

---

## Phase 1: Foundation (Server Identity)

### 1.1 Database Migration: Server Identity Table

**File:** `apps/webapp/drizzle/migrations/0099_add_server_identity.sql`

```sql
-- Server identity for federation
CREATE TABLE server_identity (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  private_key_encrypted BYTEA NOT NULL,
  public_key TEXT NOT NULL,
  key_type VARCHAR(50) NOT NULL DEFAULT 'secp256k1',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Only one active identity per server
CREATE UNIQUE INDEX idx_server_identity_domain ON server_identity(domain);
```

**Schema file update:** `apps/webapp/src/database/schema.ts`

```typescript
export const serverIdentityTable = pgTable("server_identity", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  domain: text("domain").notNull().unique(),
  privateKeyEncrypted: bytea("private_key_encrypted").notNull(),
  publicKey: text("public_key").notNull(),
  keyType: varchar("key_type", { length: 50 }).notNull().default("secp256k1"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### 1.2 Database Migration: Extend Existing Tables

**File:** `apps/webapp/drizzle/migrations/0100_add_federation_fields.sql`

```sql
-- Add federation fields to hash_registrations
ALTER TABLE hash_registrations
  ADD COLUMN origin_server TEXT,
  ADD COLUMN author TEXT;  -- user@server format

-- Add federation fields to key_to_user
ALTER TABLE key_to_user
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active',
  ADD COLUMN server_signature TEXT,
  ADD COLUMN device_name TEXT;

-- Add federation group link to prompt_sets
ALTER TABLE prompt_sets
  ADD COLUMN federation_group_id TEXT,
  ADD COLUMN owner_server TEXT;

-- Index for federation queries
CREATE INDEX idx_hash_registrations_origin ON hash_registrations(origin_server);
CREATE INDEX idx_prompt_sets_federation ON prompt_sets(federation_group_id);
```

### 1.3 Server Identity Service

**File:** `apps/webapp/src/services/server-identity.service.ts`

```typescript
// Key responsibilities:
// - Generate Ed25519 keypair on first run
// - Encrypt private key at rest
// - Expose public key for federation
// - Sign records on behalf of server
// - Verify DNS TXT records

export class ServerIdentityService {
  async getOrCreateIdentity(domain: string): Promise<ServerIdentity>
  async getPublicKey(): Promise<string>
  async signRecord<T>(record: T): Promise<ServerSignature>
  async verifyDNS(domain: string, expectedKey: string): Promise<boolean>
}
```

### 1.4 Crypto Module (Using Existing secp256k1)

**Note:** We use the existing secp256k1 infrastructure via `viem`. No new key types needed.

**File:** `apps/webapp/src/lib/crypto/canonical.ts`

```typescript
// Deterministic JSON serialization for signing

export function canonical(obj: object): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify(obj, Object.keys(obj).sort(), 0)
  );
}
```

### 1.5 Environment Variables

**File:** `.env.example` (additions)

```bash
# Federation
FEDERATION_DOMAIN=benchmarks.example.com
FEDERATION_ENABLED=false
SERVER_KEY_ENCRYPTION_SECRET=  # For encrypting private key at rest
```

---

## Phase 2: Discovery & Attestation

### 2.1 Well-Known Endpoint

**File:** `apps/webapp/src/app/.well-known/peerbench/route.ts`

```typescript
// GET /.well-known/peerbench
// Returns server identity and federation info

export async function GET() {
  return Response.json({
    version: "1.0",
    domain: process.env.FEDERATION_DOMAIN,
    public_key: await serverIdentityService.getPublicKey(),
    federation_endpoint: `https://${domain}/federation`,
    groups_owned: await getOwnedGroups(),
    groups_participating: await getParticipatingGroups(),
    capabilities: ["sync", "reveal", "score"]
  });
}
```

### 2.2 User Key Attestation

**Update:** `apps/webapp/src/services/key.service.ts`

```typescript
// Add server attestation when storing user keys

export async function storeUserKey(keyData: KeyData) {
  // Existing logic...

  // NEW: Server signs attestation
  const attestation = await serverIdentityService.signRecord({
    type: "user_key_attestation",
    user_id: `${username}@${FEDERATION_DOMAIN}`,
    public_key: keyData.publicKey,
    device_name: keyData.deviceName,
    attested_at: new Date().toISOString(),
    status: "active"
  });

  // Store with server signature
  await db.insert(keyToUserTable).values({
    ...keyData,
    serverSignature: attestation.signature,
    status: "active"
  });
}
```

### 2.3 User Keys API Endpoint

**File:** `apps/webapp/src/app/federation/users/[userId]/keys/route.ts`

```typescript
// GET /federation/users/{userId}/keys
// Returns user's attested public keys (for other servers to verify)

export async function GET(req, { params }) {
  const keys = await keyService.getUserKeysWithAttestations(params.userId);
  return Response.json({
    user_id: params.userId,
    keys: keys.map(k => ({
      public_key: k.publicKey,
      device_name: k.deviceName,
      status: k.status,
      attested_at: k.createdAt,
      server_signature: k.serverSignature
    }))
  });
}
```

---

## Phase 3: Record Signing

### 3.1 Signature Service

**File:** `apps/webapp/src/services/signature.service.ts`

```typescript
export class SignatureService {
  // Sign as user (client-side key)
  async createUserSignature(record: object, userPrivateKey: string): Promise<UserSignature>

  // Counter-sign as server
  async createServerSignature(record: object, userSignature: UserSignature): Promise<ServerSignature>

  // Verify complete record
  async verifyRecord(record: SignedRecord): Promise<VerificationResult>

  // Verify user key is attested by their server
  async verifyUserKeyAttestation(userId: string, publicKey: string): Promise<boolean>
}
```

### 3.2 Update Upload Flows

**Update:** `apps/webapp/src/app/api/v2/prompts/post.ts`

```typescript
// Add origin_server and author to uploaded prompts

const hashRegistration = await db.insert(hashRegistrationsTable).values({
  cid,
  sha256,
  signature: userSignature,
  publicKey: uploaderPublicKey,
  uploaderId: userId,
  // NEW federation fields
  originServer: FEDERATION_DOMAIN,
  author: `${username}@${FEDERATION_DOMAIN}`,
});
```

### 3.3 Federated Record Types

**File:** `apps/webapp/src/types/federation.ts`

```typescript
export interface SignedRecord<T = unknown> {
  type: string;
  id: string;
  data: T;
  created_at: string;
  signatures: {
    user: {
      key_id: string;      // user@server
      public_key: string;
      signature: string;
    };
    server: {
      key_id: string;      // server domain
      public_key: string;
      signature: string;
    };
  };
}

export interface Commitment extends SignedRecord {
  type: "commitment";
  data: {
    benchmark_group: string;
    prompt_hash: string;
    prompt_metadata: Record<string, unknown>;
    scores: Array<{
      model_id: string;
      score: number;
      response_hash: string;
    }>;
    status: "committed" | "revealed";
  };
}
```

---

## Phase 4: Reveal Mechanism

### 4.1 Reveal Events Table

**File:** `apps/webapp/drizzle/migrations/0101_add_reveal_events.sql`

```sql
CREATE TABLE reveal_events (
  id TEXT PRIMARY KEY,
  prompt_set_id INTEGER REFERENCES prompt_sets(id),
  trigger_type VARCHAR(50) NOT NULL,  -- 'on_publish', 'scheduled', 'admin_manual'
  triggered_by TEXT,  -- user@server
  reveal_config JSONB NOT NULL,
  randomness JSONB,  -- drand beacon data
  selected_count INTEGER,
  triggered_at TIMESTAMP NOT NULL,
  effective_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reveal_events_prompt_set ON reveal_events(prompt_set_id);
CREATE INDEX idx_reveal_events_effective ON reveal_events(effective_at);
```

### 4.2 drand Integration

**File:** `apps/webapp/src/lib/drand/client.ts`

```typescript
const DRAND_CHAIN = "8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce";
const DRAND_ENDPOINTS = [
  "https://api.drand.sh",
  "https://drand.cloudflare.com",
];

export interface DrandBeacon {
  round: number;
  randomness: string;
  signature: string;
}

export async function fetchLatestBeacon(): Promise<DrandBeacon>
export async function fetchBeacon(round: number): Promise<DrandBeacon>
export async function waitForNextBeacon(): Promise<DrandBeacon>
```

### 4.3 Reveal Selection Algorithm

**File:** `apps/webapp/src/services/reveal.service.ts`

```typescript
export class RevealService {
  // Deterministic selection using drand randomness
  // Default reveal config (configurable per benchmark):
  // - on_publish: 1%
  // - quarterly: 10%
  async selectForReveal(
    commitments: Commitment[],
    percent: number,  // e.g., 0.01 for 1%, 0.10 for 10%
    minCount: number,
    beacon: DrandBeacon,
    context: string
  ): Promise<Commitment[]> {
    // 1. Filter to unrevealed only
    const unrevealed = commitments.filter(c => c.data.status === "committed");

    // 2. Create deterministic seed from beacon + context
    const seed = sha256(beacon.signature + context);

    // 3. Seed PRNG
    const rng = seedrandom(seed);

    // 4. Calculate count
    const count = Math.max(minCount, Math.floor(unrevealed.length * percent));

    // 5. Deterministic shuffle and select
    const shuffled = [...unrevealed].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  async triggerReveal(promptSetId: number, triggerType: string): Promise<RevealEvent>
  async processRevealEvent(event: RevealEvent): Promise<Reveal[]>
}
```

### 4.4 Reveal API Endpoints

**File:** `apps/webapp/src/app/api/v2/reveal-events/route.ts`

```typescript
// POST /api/v2/reveal-events - Trigger a reveal
// GET /api/v2/reveal-events - List reveal events for a prompt set
```

---

## Phase 5: Federation Sync

### 5.1 Sync State Table

**File:** `apps/webapp/drizzle/migrations/0102_add_sync_state.sql`

```sql
CREATE TABLE federation_sync_state (
  id SERIAL PRIMARY KEY,
  remote_server TEXT NOT NULL,
  prompt_set_id INTEGER REFERENCES prompt_sets(id),
  direction VARCHAR(10) NOT NULL,  -- 'push' or 'pull'
  last_sync TIMESTAMP,
  last_cursor TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'idle',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(remote_server, prompt_set_id, direction)
);
```

### 5.2 Federation Sync Service

**File:** `apps/webapp/src/services/federation-sync.service.ts`

```typescript
export class FederationSyncService {
  // Pull records from remote server
  async pullFromServer(remoteServer: string, groupId: string): Promise<SyncResult>

  // Push our records to remote server
  async pushToServer(remoteServer: string, groupId: string, records: SignedRecord[]): Promise<PushResult>

  // Push new records immediately when received (called from upload handlers)
  async pushNewRecords(groupId: string, records: SignedRecord[]): Promise<void>

  // Full sync cycle
  async syncGroup(groupId: string): Promise<void>

  // Scheduled sync (runs every 5 minutes, configurable)
  async runScheduledSync(): Promise<void>
}
```

### 5.3 Federation API Endpoints

**File:** `apps/webapp/src/app/federation/groups/[groupId]/sync/route.ts`

```typescript
// GET /federation/groups/{groupId}/sync
// Other servers pull records from us

export async function GET(req, { params }) {
  // Verify server signature on request
  await verifyServerSignature(req);

  const since = req.nextUrl.searchParams.get("since");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");

  const records = await getRecordsSince(params.groupId, since, limit);

  return Response.json({
    records,
    cursor: records.length ? records[records.length - 1].created_at : null,
    has_more: records.length === limit,
    server_time: new Date().toISOString()
  });
}
```

**File:** `apps/webapp/src/app/federation/groups/[groupId]/records/route.ts`

```typescript
// POST /federation/groups/{groupId}/records
// Other servers push records to us

export async function POST(req, { params }) {
  // Verify server signature
  await verifyServerSignature(req);

  const { records } = await req.json();

  const results = { accepted: [], rejected: [] };

  for (const record of records) {
    const valid = await signatureService.verifyRecord(record);
    if (valid) {
      await storeRecord(record);
      results.accepted.push(record.id);
    } else {
      results.rejected.push({ id: record.id, error: "INVALID_SIGNATURE" });
    }
  }

  return Response.json(results);
}
```

### 5.4 HTTP Signature Middleware

**File:** `apps/webapp/src/lib/route-kit/middlewares/federationAuth.ts`

```typescript
export async function verifyServerSignature(req: Request): Promise<string> {
  const sigHeader = req.headers.get("X-PeerBench-Signature");
  const serverDomain = req.headers.get("X-PeerBench-Server");

  // 1. Fetch server's public key from their .well-known
  const serverInfo = await discoverServer(serverDomain);

  // 2. Verify DNS matches (with caching)
  await verifyDNS(serverDomain, serverInfo.public_key);

  // 3. Verify HTTP signature
  const valid = await verifyHttpSignature(req, sigHeader, serverInfo.public_key);

  if (!valid) throw new FederationAuthError("Invalid server signature");

  return serverDomain;
}
```

---

## Phase 6: Public Data Endpoints

### 6.1 Public Reveals Endpoint

**File:** `apps/webapp/src/app/public/groups/[groupId]/reveals/route.ts`

```typescript
// GET /public/groups/{groupId}/reveals
// Anyone can see revealed benchmark data

export async function GET(req, { params }) {
  const reveals = await db
    .select()
    .from(promptsTable)
    .where(and(
      eq(promptsTable.isRevealed, true),
      // ... filter by group
    ));

  return Response.json({
    group_id: params.groupId,
    reveals: reveals.map(formatReveal),
    cursor: "...",
    has_more: false
  });
}
```

### 6.2 Public Scores Endpoint

**File:** `apps/webapp/src/app/public/groups/[groupId]/scores/route.ts`

```typescript
// GET /public/groups/{groupId}/scores
// Aggregated scores (no hidden data exposed)

export async function GET(req, { params }) {
  const scores = await leaderboardService.getGroupScores(params.groupId);

  return Response.json({
    group_id: params.groupId,
    scores: scores.map(s => ({
      model_id: s.modelId,
      total_samples: s.totalSamples,
      revealed_samples: s.revealedSamples,
      average_score: s.averageScore
    })),
    updated_at: new Date().toISOString()
  });
}
```

---

## Phase 7: SDK Updates

### 7.1 Add Federation Fields to Existing Types

**File:** `packages/sdk/src/types/prompt.ts`

```typescript
// Extend existing Prompt type
export interface Prompt {
  // ... existing fields

  // Federation additions (optional for backwards compatibility)
  originServer?: string;
  author?: string;  // user@server format
  signatures?: {
    user?: UserSignature;
    server?: ServerSignature;
  };
}
```

### 7.2 Update PeerBenchRegistry

**File:** `packages/sdk/src/registry/PeerBenchRegistry.ts`

```typescript
export class PeerBenchRegistry {
  // Existing methods continue to work

  // New: Set origin server for uploads
  setOriginServer(server: string): void

  // New: Upload with federation metadata
  async uploadPromptsWithFederation(
    prompts: Prompt[],
    options: {
      promptSetId: number;
      originServer: string;
      author: string;
    }
  ): Promise<UploadResult>
}
```

### 7.3 Optional Federation Client

**File:** `packages/sdk/src/federation/FederationClient.ts`

```typescript
// For servers that want to participate in federation

export class FederationClient {
  constructor(options: {
    domain: string;
    privateKey: Uint8Array;
  })

  async discoverServer(domain: string): Promise<ServerInfo>
  async syncWithServer(remoteDomain: string, groupId: string): Promise<SyncResult>
  async pushRecords(remoteDomain: string, groupId: string, records: SignedRecord[]): Promise<void>
}
```

---

## Implementation Order

### Sprint 1: Foundation
1. [ ] Create `server_identity` table migration
2. [ ] Implement `ServerIdentityService` (using existing secp256k1/viem)
3. [ ] Add `origin_server`, `author` columns to `hash_registrations`
4. [ ] Add `status`, `server_signature` columns to `key_to_user`
5. [ ] Add canonical JSON serialization utility

### Sprint 2: Discovery & Attestation
6. [ ] Implement `/.well-known/peerbench` endpoint
7. [ ] Update `key.service.ts` to include server attestation
8. [ ] Implement `/federation/users/{id}/keys` endpoint
9. [ ] Add canonical JSON serialization

### Sprint 3: Signing
10. [ ] Implement `SignatureService`
11. [ ] Update upload flows to include federation metadata
12. [ ] Add signature verification utilities

### Sprint 4: Reveals
13. [ ] Create `reveal_events` table migration
14. [ ] Implement drand client
15. [ ] Implement `RevealService` with selection algorithm
16. [ ] Add reveal API endpoints

### Sprint 5: Sync Protocol
17. [ ] Create `federation_sync_state` table migration
18. [ ] Implement HTTP signature middleware
19. [ ] Implement `/federation/groups/{id}/sync` endpoint
20. [ ] Implement `/federation/groups/{id}/records` endpoint
21. [ ] Implement `FederationSyncService`

### Sprint 6: Public APIs & SDK
22. [ ] Implement public reveals endpoint
23. [ ] Implement public scores endpoint
24. [ ] Update SDK types with federation fields
25. [ ] Add optional `FederationClient` to SDK

---

## Testing Strategy

### Unit Tests
- secp256k1 key generation and signing (existing viem)
- Canonical JSON serialization
- Reveal selection algorithm (deterministic)
- HTTP signature creation/verification

### Integration Tests
- Full upload flow with federation metadata
- Server identity creation and DNS verification
- User key attestation flow

### End-to-End Tests
- Two-node federation sync
- Complete commit → reveal → verify cycle
- Cross-server record validation

---

## Dependencies to Add

### Webapp
```json
{
  "seedrandom": "^3.0.5"
}
```

### SDK
No new dependencies needed (using existing viem for secp256k1).

---

## Design Decisions

1. **Key Type:** Use secp256k1 only (existing infrastructure). Ed25519 can be considered later.

2. **DNS Verification:** Cache for 72 hours, verify on first contact.

3. **Sync Frequency:** Every 5 minutes (configurable). Servers should also push new data immediately when they receive it.

4. **Reveal Percentage:** Configurable per benchmark. Defaults:
   - 1% on publish
   - 10% quarterly

---

## References

- [Federation Architecture Spec](./new_ideas_on_peerbench-federation-architecture.md)
- [drand Documentation](https://drand.love/docs/)
- [@noble/ed25519](https://github.com/paulmillr/noble-ed25519)
- [HTTP Signatures RFC](https://datatracker.ietf.org/doc/html/draft-cavage-http-signatures)
