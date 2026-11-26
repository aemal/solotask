export function elapsedLabel(from: string | null | undefined, to: string | number = Date.now()): string | null {
  if (!from) return null;
  const start = Date.parse(from), end = typeof to === "number" ? to : Date.parse(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const minutes = Math.floor((end - start) / 60000);
  if (!minutes) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  if (hours < 24) return `${hours} hr${rest ? ` ${rest} min` : ""}`;
  return `${Math.floor(hours / 24)} days${hours % 24 ? ` ${hours % 24} hr` : ""}`;
}
