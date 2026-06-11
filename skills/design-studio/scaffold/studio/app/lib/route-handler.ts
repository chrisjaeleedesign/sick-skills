/**
 * Generic POST action dispatcher for API routes.
 * Maps `body.action` to a handler function and returns a JSON response.
 *
 * Framework-agnostic: returns a standard `Response`, which both Next.js
 * route handlers and the standalone server accept.
 */
export async function handleAction(
  body: Record<string, unknown>,
  handlers: Record<string, (payload: Record<string, unknown>) => unknown | Promise<unknown>>,
): Promise<Response> {
  const action = body.action as string | undefined;
  if (!action || !(action in handlers)) {
    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
  try {
    const result = await Promise.resolve(handlers[action](body));
    return Response.json({ ok: true, ...(result && typeof result === "object" ? result : {}) });
  } catch (err) {
    console.error(`Action ${action} failed:`, err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
