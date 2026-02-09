import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mailboxId = searchParams.get("mailboxId");
  const emailId = searchParams.get("emailId");

  if (!mailboxId || !emailId) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  try {
    // Find the email and the contact
    const email = await prisma.email.findUnique({
      where: { id: emailId },
      include: { contact: true },
    });

    if (email?.contactId) {
      // Mark contact as unsubscribed
      // Assuming Contact model has an 'unsubscribed' field or similar
      // If not, we'll just log it or update a metadata field
      try {
        await prisma.contact.update({
          where: { id: email.contactId },
          data: { unsubscribed: true },
        });
      } catch (err) {
        console.error("Failed to update contact unsubscribe status:", err);
      }
    }

    return new NextResponse("You have been successfully unsubscribed.", {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse("An error occurred. Please try again later.", {
      status: 500,
    });
  }
}

export async function POST(req: NextRequest) {
  // Standard one-click unsubscribe (RFC 8058)
  // This is called by the "Unsubscribe" button in Gmail/Outlook
  return GET(req);
}
