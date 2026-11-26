import type { NextConfig } from "next";
const publicOrigin = process.env.VIBEBOARD_PUBLIC_ORIGIN;
const config: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: publicOrigin ? [new URL(publicOrigin).hostname] : [],
};
export default config;
