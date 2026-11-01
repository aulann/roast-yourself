const OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

export function buildSteamLoginUrl(returnTo: string) {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": new URL(returnTo).origin,
    "openid.identity": IDENTIFIER_SELECT,
    "openid.claimed_id": IDENTIFIER_SELECT,
  });
  return `${OPENID_ENDPOINT}?${params}`;
}

/** Returns the verified 64-bit SteamID, or null if Steam does not confirm the response. */
export async function verifySteamResponse(
  params: URLSearchParams,
  expectedReturnTo: string,
  fetchFn: typeof fetch = fetch,
) {
  if (
    params.get("openid.mode") !== "id_res" ||
    params.get("openid.op_endpoint") !== OPENID_ENDPOINT ||
    params.get("openid.return_to") !== expectedReturnTo
  ) {
    return null;
  }

  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = CLAIMED_ID.exec(claimedId);
  if (!match || params.get("openid.identity") !== claimedId) return null;

  // Steam must sign these exact fields, or the SteamID could have been forged.
  const signed = (params.get("openid.signed") ?? "").split(",");
  const required = ["op_endpoint", "claimed_id", "identity", "return_to"];
  if (!required.every((field) => signed.includes(field))) return null;

  const body = new URLSearchParams();
  for (const [key, value] of params) {
    if (key.startsWith("openid.")) body.append(key, value);
  }
  body.set("openid.mode", "check_authentication");

  const response = await fetchFn(OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const isValid = (await response.text())
    .split("\n")
    .some((line) => line.trim() === "is_valid:true");
  return isValid ? match[1] : null;
}
