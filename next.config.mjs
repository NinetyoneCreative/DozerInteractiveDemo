/** @type {import('next').NextConfig} */

/**
 * Static export. The whole point of this app is that it survives a sales call on
 * bad hotel wifi: every asset is in /public, there is no backend, no runtime
 * fetch and no image optimiser to round-trip through.
 */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  // No server, so the optimiser has nowhere to run.
  images: { unoptimized: true },
  // Netlify serves /presenter/ as a directory; trailing slashes keep the
  // presenter window's URL stable when it is opened via window.open().
  trailingSlash: true,
};

export default nextConfig;
