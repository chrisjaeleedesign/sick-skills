import { NextResponse } from "next/server";

/**
 * Generic POST action dispatcher for API routes.
 * Maps `body.action` to a handler function and returns a JSON response.
 */
export async function handleAction(
  body: Record<string, unknown>,
  handlers: Record<string, (payload: Record<string, unknown>) => unknown | Promise<unknown>>,
): Promise<NextResponse> {
  const action = body.action as string | undefined;
  if (!action || !(action in handlers)) {
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
  try {
    const result = await Promise.resolve(handlers[action](body));
    return NextResponse.json({ ok: true, ...(result && typeof result === "object" ? result : {}) });
  } catch (err) {
    console.error(`Action ${action} failed:`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
