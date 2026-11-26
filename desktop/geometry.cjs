exports.normalizedPoint = (cursor, bounds) => {
  if (cursor.x < bounds.x || cursor.y < bounds.y || cursor.x >= bounds.x + bounds.width || cursor.y >= bounds.y + bounds.height) return null;
  return {x: (cursor.x - bounds.x) / bounds.width, y: (cursor.y - bounds.y) / bounds.height};
};
exports.allowedURL = (url, origin) => { try { const parsed = new URL(url); return parsed.origin === origin && parsed.pathname === '/vision/capture'; } catch { return false; } };
