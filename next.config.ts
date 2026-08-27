import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
	// A stray lockfile in the home directory makes Next infer the wrong
	// workspace root, which then resolves the app directory to the wrong place.
	outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
