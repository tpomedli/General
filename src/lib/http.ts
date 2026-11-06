import { privateNoStore, rejectsCrossOrigin } from "./viewer";

const MAX_BODY_BYTES = 100_000;

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: privateNoStore() });
}

export function guardMutation(request: Request): Response | null {
  if (rejectsCrossOrigin(request)) {
    return json({ error: "This action has to come from the recipe book." }, 403);
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return json({ error: "That recipe is too long." }, 413);
  }
  return null;
}

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    return undefined;
  }
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
