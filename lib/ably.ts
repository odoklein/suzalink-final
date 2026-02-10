import * as Ably from "ably";

let ablyRest: Ably.Rest | null = null;

export function getAblyRest() {
  if (!ablyRest) {
    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error("ABLY_API_KEY is not set");
    }
    ablyRest = new Ably.Rest(apiKey);
  }
  return ablyRest;
}
