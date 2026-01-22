# Custom Domain Email Provider - Feasibility Assessment

## Executive Summary

**Status: ✅ Highly Feasible** - The infrastructure already exists to support custom domain emails. The current `CUSTOM` provider (IMAP/SMTP) can handle any email provider including custom domains. However, adding a dedicated "DOMAIN" provider option with enhanced features would require additional implementation.

---

## Current State Analysis

### What Already Works ✅

1. **IMAP/SMTP Support**: The `CUSTOM` provider already supports any email provider via IMAP/SMTP, including:
   - Custom domain emails (e.g., `user@yourcompany.com`)
   - Any email service with IMAP/SMTP access
   - Self-hosted email servers

2. **Existing Infrastructure**:
   - ✅ IMAP/SMTP provider implementation (`lib/email/providers/imap.ts`)
   - ✅ Mailbox creation API (`app/api/email/mailboxes/route.ts`)
   - ✅ Connection testing endpoint (`app/api/email/mailboxes/test/route.ts`)
   - ✅ Email sync service
   - ✅ Email sending service
   - ✅ Database schema supports IMAP/SMTP configuration

3. **Current Flow**:
   - User selects "IMAP / SMTP" option
   - Enters: email, password, IMAP host/port, SMTP host/port
   - System tests connection
   - Mailbox is created and synced

---

## What "Domain Name Linking" Could Mean

### Option 1: Enhanced UI/UX for Custom Domains (Recommended)
A dedicated "Custom Domain" provider option that:
- Provides a better UX specifically for business/custom domain emails
- Auto-detects common email providers (Google Workspace, Microsoft 365, etc.)
- Offers domain verification/ownership checks
- Allows domain-level configuration

### Option 2: Domain-Level Management
- Link multiple email addresses under one domain
- Domain-wide settings (signatures, limits, etc.)
- Domain verification via DNS records
- Bulk email address management

### Option 3: DNS-Based Auto-Configuration
- Automatically detect IMAP/SMTP settings via DNS/MX records
- Verify domain ownership via DNS TXT records
- Auto-configure common providers (Google Workspace, Microsoft 365)

---

## Implementation Requirements for 100% Working Solution

### Phase 1: Basic DOMAIN Provider (Minimal Changes) ⚡ Quick Win

**What's Needed:**
1. ✅ Add `DOMAIN` to `EmailProvider` enum in Prisma schema
2. ✅ Update provider factory functions
3. ✅ Add DOMAIN to UI provider lists
4. ✅ Create domain-specific form (similar to IMAP but with domain focus)

**Time Estimate:** 2-3 hours
**Complexity:** Low
**Status:** Can reuse existing IMAP provider implementation

**Files to Modify:**
- `prisma/schema.prisma` - Add DOMAIN enum value
- `lib/email/providers/index.ts` - Add DOMAIN case (reuse ImapProvider)
- `components/email/inbox/MailboxManagerDialog.tsx` - Add DOMAIN option
- `app/manager/email/mailboxes/page.tsx` - Add DOMAIN option
- `app/api/email/mailboxes/route.ts` - Handle DOMAIN provider type

---

### Phase 2: Enhanced Domain Features (Recommended) 🎯 Full Solution

#### 2.1 Domain Auto-Detection & Configuration

**Features:**
- Auto-detect email provider from domain (Google Workspace, Microsoft 365, etc.)
- Pre-fill IMAP/SMTP settings based on provider
- Support for common providers:
  - Google Workspace: `imap.gmail.com:993`, `smtp.gmail.com:587`
  - Microsoft 365: `outlook.office365.com:993`, `smtp.office365.com:587`
  - Zoho, Yahoo Business, etc.

**Implementation:**
```typescript
// New file: lib/email/providers/domain-detector.ts
export function detectProviderFromDomain(domain: string): {
  provider: 'google' | 'microsoft' | 'zoho' | 'yahoo' | 'custom';
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
} | null
```

**Files to Create/Modify:**
- `lib/email/providers/domain-detector.ts` (new)
- Update domain form to use auto-detection

**Time Estimate:** 4-6 hours

---

#### 2.2 Domain Verification (Optional but Recommended)

**Features:**
- Verify domain ownership via DNS TXT record
- Check MX records for email deliverability
- Validate SPF/DKIM/DMARC records (for better deliverability)

**Implementation:**
```typescript
// New file: lib/email/providers/domain-verification.ts
export async function verifyDomainOwnership(domain: string): Promise<{
  verified: boolean;
  method: 'dns' | 'file' | 'meta';
  record?: string;
}>
```

**Dependencies:**
- DNS lookup library: `dns` (Node.js built-in) or `dns2` for better control
- DNS record validation

**Database Changes:**
```prisma
model Mailbox {
  // ... existing fields
  domainVerified Boolean @default(false)
  domainVerifiedAt DateTime?
  domainVerificationMethod String? // 'dns', 'file', 'meta'
}
```

**Time Estimate:** 6-8 hours

---

#### 2.3 Domain-Level Management (Advanced)

**Features:**
- Link multiple mailboxes under one domain
- Domain-wide settings (daily limits, warmup schedules)
- Domain health monitoring
- Bulk operations

**Database Changes:**
```prisma
model EmailDomain {
  id String @id @default(cuid())
  domain String @unique
  organizationId String?
  verified Boolean @default(false)
  verifiedAt DateTime?
  
  // Settings
  dailySendLimit Int @default(1000)
  warmupEnabled Boolean @default(true)
  
  // Relations
  mailboxes Mailbox[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Mailbox {
  // ... existing fields
  domainId String?
  domain EmailDomain? @relation(fields: [domainId], references: [id])
}
```

**Time Estimate:** 12-16 hours

---

### Phase 3: DNS-Based Auto-Configuration (Advanced) 🔬

**Features:**
- Query MX records to detect email provider
- Auto-configure IMAP/SMTP from DNS records
- Support for custom mail servers

**Implementation:**
```typescript
// lib/email/providers/dns-config.ts
export async function getEmailConfigFromDNS(domain: string): Promise<{
  imapHost?: string;
  smtpHost?: string;
  provider?: string;
} | null>
```

**Time Estimate:** 8-10 hours

---

## Recommended Implementation Plan

### 🎯 Minimum Viable Solution (Phase 1)
**Goal:** Add DOMAIN provider option with same functionality as CUSTOM but better UX

**Steps:**
1. Add `DOMAIN` enum value
2. Update all provider references
3. Create domain-focused UI form
4. Reuse existing IMAP provider implementation

**Result:** Users can add custom domain emails with a dedicated "Custom Domain" option

**Time:** 2-3 hours
**Risk:** Low
**Value:** Medium (better UX, clearer intent)

---

### 🚀 Recommended Solution (Phase 1 + 2.1)
**Goal:** Add DOMAIN provider with auto-detection for common providers

**Steps:**
1. Everything from Phase 1
2. Add domain auto-detection
3. Pre-fill IMAP/SMTP settings
4. Provider-specific guidance

**Result:** Users can add custom domain emails with minimal configuration

**Time:** 6-9 hours
**Risk:** Low-Medium
**Value:** High (significantly better UX)

---

### 💎 Full-Featured Solution (All Phases)
**Goal:** Complete domain management with verification and domain-level features

**Steps:**
1. Everything from Recommended Solution
2. Domain verification
3. Domain-level management
4. DNS-based auto-configuration

**Result:** Enterprise-grade domain email management

**Time:** 30-40 hours
**Risk:** Medium
**Value:** Very High (enterprise features)

---

## Technical Considerations

### Database Migration
```sql
-- Add DOMAIN to enum (PostgreSQL)
ALTER TYPE "EmailProvider" ADD VALUE 'DOMAIN';

-- Or if using Prisma:
-- Just update schema.prisma and run: npx prisma db push
```

### Backward Compatibility
- ✅ Existing `CUSTOM` provider continues to work
- ✅ No breaking changes to existing mailboxes
- ✅ DOMAIN provider is additive

### Security Considerations
1. **Password Storage**: Already encrypted (using `encrypt()` function)
2. **Domain Verification**: Prevents unauthorized domain linking
3. **DNS Queries**: Should be rate-limited to prevent abuse

### Testing Requirements
1. Test with common providers:
   - Google Workspace
   - Microsoft 365
   - Zoho
   - Custom mail servers
2. Test connection failures
3. Test domain verification
4. Test auto-detection accuracy

---

## Dependencies

### Required (Already Installed)
- ✅ `nodemailer` - SMTP sending
- ✅ `imapflow` - IMAP access
- ✅ `mailparser` - Email parsing

### Optional (For Advanced Features)
- `dns2` - Better DNS control (if needed beyond Node.js `dns`)
- `dns-packet` - DNS packet parsing (for advanced DNS features)

---

## Conclusion

### ✅ **YES, it's 100% doable!**

The infrastructure is already in place. The question is: **What level of features do you want?**

**Quick Win (2-3 hours):**
- Add DOMAIN provider option
- Reuse existing IMAP/SMTP implementation
- Better UX for custom domain emails

**Recommended (6-9 hours):**
- Everything above +
- Auto-detect common providers
- Pre-fill configuration
- Provider-specific guidance

**Full Solution (30-40 hours):**
- Everything above +
- Domain verification
- Domain-level management
- DNS-based auto-configuration

### Recommendation
Start with **Phase 1 + 2.1** (Recommended Solution) - it provides the best balance of value, time, and complexity. You can always add advanced features later.

---

## Next Steps

1. **Decide on scope**: Quick win, Recommended, or Full solution?
2. **Review this document** with your team
3. **I can implement** whichever option you choose
4. **Test thoroughly** with real domain emails

Would you like me to proceed with the implementation? Which phase would you prefer?
