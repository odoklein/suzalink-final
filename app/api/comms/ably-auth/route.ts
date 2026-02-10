import * as Ably from "ably";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    console.error("ABLY_API_KEY is not set");
    return NextResponse.json(
      { error: "Ably configuration missing" },
      { status: 500 },
    );
  }

  const client = new Ably.Rest(apiKey);

  try {
    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: session.user.id as string,
    });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error("Error creating Ably token request:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
