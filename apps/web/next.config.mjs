import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pins the workspace root to this app so Next doesn't get confused by a
  // sibling lockfile if this repo is ever nested inside a larger monorepo.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
