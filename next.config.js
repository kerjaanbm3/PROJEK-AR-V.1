/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Helps avoid double render canvas context issues in Three.js editor
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;
