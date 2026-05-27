import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api', '/trips', '/_next'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://voyager.app'}/sitemap.xml`,
  };
}
