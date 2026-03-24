import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

// Point to the monorepo root so Vercel's file tracing can find all dependencies
// (including hoisted node_modules) when building serverless functions.
const monorepoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
);

const nextConfig: NextConfig = {
    outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
