import { resolveCname } from "dns/promises";

/**
 * Verifies if a custom tracking domain is correctly configured with a CNAME to the platform's core domain.
 */
export async function verifyTrackingDomain(
  customDomain: string,
  targetDomain: string = "suzalink.cloud",
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Strip protocol and trailing slash
    const hostname = customDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    if (!hostname) {
      return { valid: false, error: "Invalid domain format" };
    }

    const cnames = await resolveCname(hostname);

    // Check if any CNAME points to the target
    const isValid = cnames.some(
      (c) => c.toLowerCase() === targetDomain.toLowerCase(),
    );

    if (!isValid) {
      return {
        valid: false,
        error: `Domain points to ${cnames.join(", ")} instead of ${targetDomain}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "DNS resolution failed",
    };
  }
}
