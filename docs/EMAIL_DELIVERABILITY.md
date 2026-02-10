# Email Deliverability Guide - Fix Spam Issues

## 🚨 Why Emails Land in Spam

Your emails are landing in spam due to missing or misconfigured email authentication records. Here's how to fix it:

## ✅ Step-by-Step Fix

### 1. **DNS Records Setup (CRITICAL)**

You need to add these DNS records to your domain:

#### **SPF Record** (Sender Policy Framework)

Tells email servers which servers are allowed to send emails from your domain.

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com include:amazonses.com ~all
TTL: 3600
```

**Customize for your provider:**

- Gmail/Google Workspace: `include:_spf.google.com`
- AWS SES: `include:amazonses.com`
- SendGrid: `include:sendgrid.net`
- Custom SMTP: `ip4:YOUR_SMTP_SERVER_IP`

#### **DKIM Record** (DomainKeys Identified Mail)

Cryptographically signs your emails to prove they're from you.

**For Gmail:**

1. Go to Google Admin Console → Apps → Google Workspace → Gmail → Authenticate email
2. Generate new DKIM key
3. Add the TXT record to your DNS

**For Custom SMTP:**
Your email provider should give you a DKIM key. Add it as:

```
Type: TXT
Name: default._domainkey
Value: (provided by your email service)
TTL: 3600
```

#### **DMARC Record** (Domain-based Message Authentication)

Tells receiving servers what to do with emails that fail SPF/DKIM checks.

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
TTL: 3600
```

**After testing, upgrade to:**

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100
```

### 2. **Reverse DNS (PTR Record)**

If you're using a custom SMTP server, ensure your server's IP has a PTR record pointing to your domain.

**Check current PTR:**

```bash
nslookup YOUR_SERVER_IP
```

**Contact your hosting provider** to set up PTR record if missing.

### 3. **Email Content Best Practices**

#### **Avoid Spam Triggers:**

- ❌ ALL CAPS SUBJECT LINES
- ❌ Excessive exclamation marks!!!
- ❌ Words like "FREE", "URGENT", "ACT NOW"
- ❌ Too many links (max 3-5 per email)
- ❌ Large images without text
- ❌ Shortened URLs (bit.ly, etc.)

#### **Do This Instead:**

- ✅ Professional, conversational tone
- ✅ Proper text-to-image ratio (60% text, 40% images)
- ✅ Include plain text version
- ✅ Add unsubscribe link (already implemented ✅)
- ✅ Use your real domain in links

### 4. **Warm Up Your Email Account**

Your code already has warmup logic! Enable it:

```typescript
// In your mailbox settings
{
  warmupStatus: "IN_PROGRESS",
  warmupDailyLimit: 10, // Start with 10 emails/day
  dailySendLimit: 100,   // Target limit
  healthScore: 100
}
```

**Warmup Schedule:**

- Day 1-3: 10 emails/day
- Day 4-7: 20 emails/day
- Day 8-14: 40 emails/day
- Day 15-21: 60 emails/day
- Day 22-30: 100 emails/day

The system auto-increases by 15% daily if `healthScore > 80`.

### 5. **Email Infrastructure Checklist**

- [ ] SPF record configured
- [ ] DKIM record configured
- [ ] DMARC record configured
- [ ] PTR record (if custom SMTP)
- [ ] Unsubscribe link (✅ already implemented)
- [ ] List-Unsubscribe header (✅ already implemented)
- [ ] Proper From/Reply-To addresses
- [ ] Domain matches envelope sender
- [ ] SSL/TLS enabled on SMTP

### 6. **Test Your Configuration**

#### **Check DNS Records:**

```bash
# Check SPF
nslookup -type=TXT yourdomain.com

# Check DKIM
nslookup -type=TXT default._domainkey.yourdomain.com

# Check DMARC
nslookup -type=TXT _dmarc.yourdomain.com
```

#### **Online Tools:**

- **MXToolbox**: https://mxtoolbox.com/SuperTool.aspx
- **Mail Tester**: https://www.mail-tester.com/
- **Google Postmaster**: https://postmaster.google.com/

**Send a test email to mail-tester.com** and aim for 10/10 score.

### 7. **Monitor Deliverability**

#### **Google Postmaster Tools:**

1. Go to https://postmaster.google.com/
2. Add your domain
3. Verify ownership
4. Monitor:
   - Spam rate (should be < 0.1%)
   - IP reputation
   - Domain reputation
   - Authentication rate (should be 100%)

#### **Bounce Handling:**

Your system should track bounces and remove bad addresses.

### 8. **Common Issues & Fixes**

| Issue                             | Cause            | Fix                       |
| --------------------------------- | ---------------- | ------------------------- |
| "550 5.7.1 Unauthenticated email" | Missing SPF/DKIM | Add DNS records           |
| "Sent from localhost"             | Wrong HELO name  | Already fixed in code ✅  |
| "Domain mismatch"                 | Envelope ≠ From  | Already fixed in code ✅  |
| "Too many links"                  | Tracking links   | Disable during warmup ✅  |
| "Blacklisted IP"                  | Shared hosting   | Use dedicated IP or Gmail |

### 9. **Quick Wins (Already Implemented ✅)**

Your code already has these optimizations:

```typescript
// ✅ SPF alignment - envelope matches from address
envelope: {
  from: params.from?.email || config.email,
  to: params.to.map((r) => r.email).join(", "),
}

// ✅ Domain-aligned Message-ID
messageId: `<${Date.now()}.${Math.random().toString(36).substring(7)}@${domain}>`

// ✅ Proper HELO name (not "localhost")
name: domain

// ✅ List-Unsubscribe header
headers: {
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  "List-Unsubscribe": `<${unsubscribeBaseUrl}/api/email/unsubscribe...>`
}

// ✅ Warmup mode disables tracking
const shouldTrackOpens =
  globalTrackingEnabled &&
  mailboxTrackingEnabled &&
  !isWarmupActive  // ← Disabled during warmup
```

### 10. **Immediate Action Plan**

1. **Today:**
   - [ ] Add SPF record to DNS
   - [ ] Add DKIM record to DNS
   - [ ] Add DMARC record to DNS
   - [ ] Send test email to mail-tester.com

2. **This Week:**
   - [ ] Enable warmup mode
   - [ ] Send 10 emails/day to engaged recipients
   - [ ] Monitor bounce rate
   - [ ] Check Google Postmaster Tools

3. **This Month:**
   - [ ] Gradually increase sending volume
   - [ ] Monitor spam complaints
   - [ ] Achieve 10/10 on mail-tester
   - [ ] Reach target daily limit

## 🎯 Expected Results

After implementing these fixes:

- **Week 1**: Emails start landing in inbox (50-70% rate)
- **Week 2**: Inbox rate improves to 80-90%
- **Week 3-4**: Consistent 95%+ inbox placement

## 📊 Monitoring Dashboard

Track these metrics in your app:

- Sent count
- Bounce rate (should be < 2%)
- Spam complaint rate (should be < 0.1%)
- Open rate (healthy: 15-25%)
- Click rate (healthy: 2-5%)

## 🆘 Still Having Issues?

If emails still land in spam after DNS setup:

1. **Check your domain reputation:**
   - https://www.senderscore.org/
   - https://www.barracudacentral.org/lookups

2. **Verify DNS propagation:**
   - https://dnschecker.org/

3. **Test email authentication:**
   - https://www.appmaildev.com/en/dkim

4. **Consider using:**
   - Gmail/Google Workspace (best deliverability)
   - AWS SES (good for transactional)
   - SendGrid/Mailgun (for marketing)

---

**Remember**: Deliverability is a marathon, not a sprint. It takes 2-4 weeks to build a good sender reputation.
