// ============================================
// EMAIL SENDING SERVICE
// Handles email sending with tracking
// ============================================

import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { inlineHtmlForEmail } from "./inline-styles";
import {
  getEmailProvider,
  OAuthTokens,
  SendEmailParams,
  EmailAddress,
} from "../providers";
import { Mailbox } from "@prisma/client";
import { randomUUID } from "crypto";

// ============================================
// TYPES
// ============================================

export interface SendOptions {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: {
    filename: string;
    content: Buffer;
    mimeType: string;
  }[];
  trackPixelId?: string; // Legacy support
  trackingPixelId?: string;
  inReplyTo?: string;
  threadId?: string;
  /** Outreach / mission context (quick-send from SDR) */
  contactId?: string;
  missionId?: string;
  sentById?: string;
  templateId?: string;
  trackOpens?: boolean;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  emailId?: string;
  error?: string;
}

// ============================================
// SENDING SERVICE CLASS
// ============================================

export class EmailSendingService {
  // ============================================
  // SEND EMAIL
  // ============================================

  async sendEmail(
    mailboxId: string,
    options: SendOptions,
  ): Promise<SendResult> {
    try {
      // Get mailbox
      const mailbox = await prisma.mailbox.findUnique({
        where: { id: mailboxId },
      });

      if (!mailbox) {
        return { success: false, error: "Mailbox not found" };
      }

      if (!mailbox.isActive) {
        return { success: false, error: "Mailbox is inactive" };
      }

      // Check daily send limit
      await this.checkAndResetDailyLimit(mailbox);

      const isWarmupActive = mailbox.warmupStatus === "IN_PROGRESS";
      const currentLimit = isWarmupActive
        ? mailbox.warmupDailyLimit
        : mailbox.dailySendLimit;

      if (mailbox.sentToday >= currentLimit) {
        return {
          success: false,
          error: `${isWarmupActive ? "Warmup" : "Daily"} send limit reached (${mailbox.sentToday}/${currentLimit})`,
        };
      }

      // Safe access to mailbox-specific settings
      interface MailboxWithTracking extends Mailbox {
        trackingDomain: string | null;
        trackingEnabled: boolean;
      }
      const mailboxData = mailbox as MailboxWithTracking;
      const trackingDomain = mailboxData.trackingDomain || undefined;

      // Generate tracking pixel if enabled
      // FORCE DISABLED if warmup is active and we are in the first few emails of the day
      // or if global tracking is off.
      const globalTrackingEnabled =
        process.env.EMAIL_TRACKING_ENABLED !== "false";
      const mailboxTrackingEnabled = mailboxData.trackingEnabled !== false;

      const shouldTrackOpens =
        globalTrackingEnabled &&
        mailboxTrackingEnabled &&
        !isWarmupActive && // Disable tracking during warmup for maximum safety
        options.trackOpens !== false;

      const trackingPixelId = shouldTrackOpens
        ? options.trackingPixelId || options.trackPixelId || randomUUID()
        : undefined;

      // Determine the domain to use for unsubscribe and tracking
      const mailboxDomain = mailbox.email.split("@")[1];
      const unsubscribeBaseUrl = trackingDomain || `https://${mailboxDomain}`;

      // Inject tracking pixel into HTML
      let bodyHtml = options.bodyHtml;

      // DELIVERABILITY BOOST: If in warmup, strip excessive links or use plain templates
      if (isWarmupActive && bodyHtml) {
        bodyHtml = this.cleanHtmlForWarmup(bodyHtml);
      }

      if (bodyHtml && trackingPixelId) {
        bodyHtml = this.injectTrackingPixel(
          bodyHtml,
          trackingPixelId,
          trackingDomain,
        );
      }

      // Append signature if set
      if (mailbox.signatureHtml && bodyHtml) {
        bodyHtml = `${bodyHtml}<br/><br/>${mailbox.signatureHtml}`;
      } else if (mailbox.signature && options.bodyText) {
        options.bodyText = `${options.bodyText}\n\n${mailbox.signature}`;
      }

      // Inline CSS for email client compatibility (Gmail, Outlook, etc.)
      if (bodyHtml) {
        bodyHtml = inlineHtmlForEmail(bodyHtml);
      }

      // Build send params with anti-spam headers
      const { convert } = await import("html-to-text");
      const generatedBodyText =
        options.bodyText || (bodyHtml ? convert(bodyHtml) : "");

      // Extract domain for proper email headers
      const senderDomain = mailbox.email.split("@")[1];

      // Generate proper Message-ID with sender's domain (critical for deliverability)
      const messageId = `<${Date.now()}.${randomUUID()}@${senderDomain}>`;

      const sendParams: SendEmailParams = {
        from: { email: mailbox.email, name: mailbox.displayName || undefined },
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        bodyHtml,
        bodyText: generatedBodyText,
        attachments: options.attachments?.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.content.length,
          content: a.content,
        })),
        trackingPixelId: trackingPixelId || undefined,
        inReplyTo: options.inReplyTo,
        threadId: options.threadId,
        headers: {
          // Critical anti-spam headers
          "Message-ID": messageId,
          "Reply-To": mailbox.email, // Ensures replies go to the right address
          "X-Entity-Ref-ID": randomUUID(),

          // List management headers (RFC 8058) - prevents spam flagging
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "List-Unsubscribe": `<${unsubscribeBaseUrl}/api/email/unsubscribe?mailboxId=${mailbox.id}${trackingPixelId ? `&emailId=${trackingPixelId}` : ""}>`,

          // Prevent "sent via" warnings in Gmail
          "X-Google-Original-From": mailbox.email,

          // Priority header (normal priority = less spam-like)
          "X-Priority": "3",
          Importance: "Normal",

          // MIME version (required for proper email formatting)
          "MIME-Version": "1.0",
        },
      };

      let result: {
        success: boolean;
        messageId?: string;
        threadId?: string;
        error?: string;
      };

      // Handle different provider types
      if (mailbox.provider === "CUSTOM") {
        // IMAP/SMTP - use password-based auth
        if (!mailbox.password || !mailbox.smtpHost) {
          return { success: false, error: "SMTP configuration incomplete" };
        }

        // Import ImapProvider dynamically to avoid circular deps
        const { ImapProvider } = await import("../providers/imap");

        const imapConfig = {
          email: mailbox.email,
          password: decrypt(mailbox.password),
          imapHost: mailbox.imapHost || "",
          imapPort: mailbox.imapPort || 993,
          smtpHost: mailbox.smtpHost,
          smtpPort: mailbox.smtpPort || 587,
        };

        const imapProvider = new ImapProvider(imapConfig);
        result = await imapProvider.sendEmail({} as OAuthTokens, sendParams);
      } else {
        // OAuth providers (Gmail, Outlook)
        const provider = getEmailProvider(mailbox.provider);
        let tokens = this.getTokensFromMailbox(mailbox);

        // Check if tokens need refresh
        if (mailbox.tokenExpiry && new Date() >= mailbox.tokenExpiry) {
          if (!mailbox.refreshToken) {
            return { success: false, error: "Token expired" };
          }

          const refreshedTokens = await provider.refreshTokens(
            decrypt(mailbox.refreshToken),
          );

          // Update mailbox with new tokens
          await prisma.mailbox.update({
            where: { id: mailboxId },
            data: {
              accessToken: refreshedTokens.accessToken,
              refreshToken:
                refreshedTokens.refreshToken || mailbox.refreshToken,
              tokenExpiry: refreshedTokens.expiresAt,
            },
          });

          tokens = refreshedTokens;
        }

        result = await provider.sendEmail(tokens, sendParams);
      }

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Create or update thread
      let thread = options.threadId
        ? await prisma.emailThread.findUnique({
            where: { id: options.threadId },
          })
        : null;

      if (!thread && result.threadId) {
        // Try to find by provider thread ID
        thread = await prisma.emailThread.findFirst({
          where: {
            mailboxId,
            providerThreadId: result.threadId,
          },
        });
      }

      if (!thread) {
        // Create new thread
        thread = await prisma.emailThread.create({
          data: {
            mailboxId,
            subject: options.subject,
            snippet: options.bodyText?.substring(0, 200),
            participantEmails: options.to.map((t) => t.email),
            providerThreadId: result.threadId,
            lastEmailAt: new Date(),
          },
        });
      }

      // Create email record
      const email = await prisma.email.create({
        data: {
          mailboxId,
          threadId: thread.id,
          fromAddress: mailbox.email,
          fromName: mailbox.displayName,
          toAddresses: options.to.map((t) => t.email),
          ccAddresses: options.cc?.map((c) => c.email) || [],
          bccAddresses: options.bcc?.map((b) => b.email) || [],
          subject: options.subject,
          bodyHtml,
          bodyText: options.bodyText,
          snippet: options.bodyText?.substring(0, 200),
          direction: "OUTBOUND",
          status: "SENT",
          trackingPixelId,
          providerMessageId: result.messageId,
          providerThreadId: result.threadId,
          sentAt: new Date(),
          contactId: options.contactId ?? undefined,
          missionId: options.missionId ?? undefined,
          sentById: options.sentById ?? undefined,
          templateId: options.templateId ?? undefined,
        },
      });

      // Update thread
      await prisma.emailThread.update({
        where: { id: thread.id },
        data: {
          lastEmailAt: new Date(),
          snippet: options.bodyText?.substring(0, 200),
        },
      });

      // Increment sent count
      await prisma.mailbox.update({
        where: { id: mailboxId },
        data: { sentToday: { increment: 1 } },
      });

      return {
        success: true,
        messageId: result.messageId,
        threadId: thread.id,
        emailId: email.id,
      };
    } catch (error) {
      console.error("Send email error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================
  // SCHEDULE SEND (Queue)
  // ============================================

  async scheduleSend(
    mailboxId: string,
    options: SendOptions,
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const { scheduleEmailSend } = await import("../queue");

      const job = await scheduleEmailSend({
        mailboxId,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject: options.subject,
        bodyHtml: options.bodyHtml,
        bodyText: options.bodyText,
        trackingPixelId: options.trackingPixelId,
        inReplyTo: options.inReplyTo,
      });

      return {
        success: true,
        jobId: job.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to schedule",
      };
    }
  }

  // ============================================
  // TRACKING
  // ============================================

  async recordOpen(
    trackingPixelId: string,
    _metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    const email = await prisma.email.findUnique({
      where: { trackingPixelId },
    });

    if (!email) return;

    const now = new Date();
    const isFirstOpen = !email.firstOpenedAt;

    await prisma.email.update({
      where: { id: email.id },
      data: {
        openCount: { increment: 1 },
        firstOpenedAt: isFirstOpen ? now : undefined,
        lastOpenedAt: now,
        status:
          email.status === "SENT" || email.status === "DELIVERED"
            ? "OPENED"
            : email.status,
      },
    });

    // Update sequence step stats if applicable
    if (email.sequenceStepId) {
      await prisma.emailSequenceStep.update({
        where: { id: email.sequenceStepId },
        data: { totalOpened: { increment: 1 } },
      });
    }
  }

  async recordClick(
    trackingPixelId: string,
    _url: string,
    _metadata?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    const email = await prisma.email.findUnique({
      where: { trackingPixelId },
    });

    if (!email) return;

    await prisma.email.update({
      where: { id: email.id },
      data: {
        clickCount: { increment: 1 },
        status:
          email.status !== "REPLIED" && email.status !== "BOUNCED"
            ? "CLICKED"
            : email.status,
      },
    });

    // Update sequence step stats if applicable
    if (email.sequenceStepId) {
      await prisma.emailSequenceStep.update({
        where: { id: email.sequenceStepId },
        data: { totalClicked: { increment: 1 } },
      });
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private getTokensFromMailbox(mailbox: Mailbox): OAuthTokens {
    if (!mailbox.accessToken) {
      throw new Error("No access token available");
    }

    return {
      accessToken: decrypt(mailbox.accessToken),
      refreshToken: mailbox.refreshToken
        ? decrypt(mailbox.refreshToken)
        : undefined,
      expiresAt: mailbox.tokenExpiry || undefined,
    };
  }

  private async checkAndResetDailyLimit(mailbox: Mailbox): Promise<void> {
    const now = new Date();
    const lastReset = mailbox.lastSendReset;

    // Check if it's a new day
    const isNewDay =
      lastReset.getDate() !== now.getDate() ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    if (isNewDay) {
      const updateData: Record<string, unknown> = {
        sentToday: 0,
        lastSendReset: now,
      };

      // AUTOMATIC RAMP-UP: If in warmup and healthy, increase limit by 15%
      if (mailbox.warmupStatus === "IN_PROGRESS" && mailbox.healthScore > 80) {
        const nextLimit = Math.min(
          mailbox.dailySendLimit,
          Math.ceil(mailbox.warmupDailyLimit * 1.15),
        );

        if (nextLimit > mailbox.warmupDailyLimit) {
          updateData.warmupDailyLimit = nextLimit;
        }

        // Auto-complete warmup if we reached the main limit
        if (nextLimit >= mailbox.dailySendLimit) {
          updateData.warmupStatus = "COMPLETED";
        }
      }

      await prisma.mailbox.update({
        where: { id: mailbox.id },
        data: updateData as unknown as import("@prisma/client").Prisma.MailboxUpdateInput,
      });

      mailbox.sentToday = 0;
      if (updateData.warmupDailyLimit) {
        mailbox.warmupDailyLimit = updateData.warmupDailyLimit as number;
      }
    }
  }

  /**
   * DELIVERABILITY BOOST: Strips excessive styling and non-essential links
   * during the warmup phase to make emails look more "human" to filters.
   */
  private cleanHtmlForWarmup(html: string): string {
    // 1. Remove large CSS blocks that look like standard marketing templates
    let cleaned = html.replace(/<style([\s\S]*?)<\/style>/gi, "");

    // 2. Simplify complex table structures often used in builders (keeping content)
    cleaned = cleaned.replace(
      /<table[^>]*>/gi,
      '<table border="0" cellpadding="0" cellspacing="0" width="100%">',
    );

    // 3. Remove tracker-like URL patterns or excessive query params
    // (We keep simple links but anything with long tracking strings gets simplified)

    // Note: We don't strip unsubscribe as it's required by law/ESP rules.
    return cleaned;
  }

  private getTrackingBaseUrl(customDomain?: string): string {
    return (
      customDomain ||
      process.env.EMAIL_TRACKING_DOMAIN ||
      process.env.NEXTAUTH_URL ||
      ""
    ).replace(/\/$/, "");
  }

  private injectTrackingPixel(
    html: string,
    trackingPixelId: string,
    customDomain?: string,
  ): string {
    const baseUrl = this.getTrackingBaseUrl(customDomain);

    const pixelUrl = `${baseUrl}/api/email/tracking/open?id=${trackingPixelId}`;
    const pixel = `<img src="${pixelUrl}" width="1" height="1" border="0" style="display:none;" alt="" />`;

    // Insert before closing body tag or at the end
    if (html.includes("</body>")) {
      return html.replace("</body>", `${pixel}</body>`);
    }
    return html + pixel;
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const emailSendingService = new EmailSendingService();
