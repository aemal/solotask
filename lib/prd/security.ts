export class InputError extends Error { readonly name = "InputError"; }
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const publicOrigin = process.env.VIBEBOARD_PUBLIC_ORIGIN;
  // Explicit configuration only: forwarded headers are client-controlled.
  const configured = publicOrigin ? new URL(publicOrigin).origin : undefined;
  const target = new URL(request.url);
  const localAlias = ["localhost", "127.0.0.1"].includes(target.hostname) && target.protocol === "http:" && ["localhost", "127.0.0.1"].some(host => origin === `http://${host}${target.port ? `:${target.port}` : ""}`);
  if (!origin || origin === "null" || (origin !== target.origin && origin !== configured && !localAlias)) throw new InputError("Invalid request origin.");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new InputError("Expected JSON.");
  if (Number(request.headers.get("content-length")) > 300000) throw new InputError("Request is too large.");
  const text = await request.text();
  if (Buffer.byteLength(text) > 300000) throw new InputError("Request is too large.");
  try { return JSON.parse(text); } catch { throw new InputError("Invalid JSON."); }
}
export function field(value: unknown, name: string, max = 100000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new InputError(`${name} is required and must be under ${max.toLocaleString()} characters.`);
  return value;
}
export function credentials(body: Record<string, unknown>) {
  const apiKey = field(body.apiKey, "OpenAI API key", 300).trim();
  if (/\s/.test(apiKey)) throw new InputError("The API key must not contain whitespace.");
  const model = field(body.model, "Model", 100).trim();
  if (!/^[a-zA-Z0-9._:-]+$/.test(model)) throw new InputError("Invalid model name.");
  return { apiKey, model };
}
export function redact(value: string, secret?: string) {
  return (secret ? value.split(secret).join("[redacted]") : value).replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}
export function errorResponse(error: unknown) {
  const inputError = error instanceof InputError || (error instanceof Error && error.name === "InputError");
  return Response.json({ error: inputError && error instanceof Error ? error.message : "The operation failed. Check the local service setup and try again." }, { status: inputError ? 400 : 500 });
}
