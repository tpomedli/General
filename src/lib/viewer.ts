import { headers } from "next/headers";
import { requireIdentity } from "../../cursor/identity.js";

export type Viewer = {
  sub: string;
  stage: "production" | "preview";
  name: string;
};

export async function currentViewer(request?: Request): Promise<Viewer | Response> {
  const identity = await requireIdentity(request ?? (await headers()));
  if (identity instanceof Response) return identity;
  if (typeof identity.sub !== "string" || identity.sub === "") {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: privateNoStore() });
  }
  return {
    sub: identity.sub,
    stage: identity.stage === "preview" ? "preview" : "production",
    name: typeof identity.name === "string" ? identity.name : "",
  };
}

export function ownerKey(viewer: Viewer): string {
  return `${viewer.stage}:${viewer.sub}`;
}

export function rejectsCrossOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return true;
  }
  const allowed = new Set<string>();
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) {
    for (const part of forwarded.split(",")) {
      const host = part.trim();
      if (host !== "") allowed.add(host);
    }
  }
  const host = request.headers.get("host")?.trim();
  if (host) allowed.add(host);
  return !allowed.has(originHost);
}

export function privateNoStore(): Record<string, string> {
  return { "cache-control": "private, no-store" };
}
