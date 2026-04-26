export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function requireOneOf(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return { name, value };
    }
  }
  throw new Error(`Missing required env var: one of ${names.join(", ")}`);
}

export function getAuthEnv() {
  // Validate critical env vars at startup so auth misconfiguration fails fast.
  const databaseUrl = requireEnv("DATABASE_URL");
  const githubClientId = requireOneOf(["GITHUB_ID", "GITHUB_CLIENT_ID"]).value;
  const githubClientSecret = requireOneOf(["GITHUB_SECRET", "GITHUB_CLIENT_SECRET"]).value;
  const nextAuthSecret = requireEnv("NEXTAUTH_SECRET");

  return {
    databaseUrl,
    githubClientId,
    githubClientSecret,
    nextAuthSecret
  };
}
