/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/case-study',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
