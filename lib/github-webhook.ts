import crypto from "crypto";

export function verifyGithubSignature(payload: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
