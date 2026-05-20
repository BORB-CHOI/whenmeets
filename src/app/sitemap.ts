import type { MetadataRoute } from 'next';
import { USE_CASE_SLUGS } from '@/lib/demo-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://daymeet.org';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const useCaseEntries: MetadataRoute.Sitemap = USE_CASE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/use-cases/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/demo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/use-cases`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...useCaseEntries,
    {
      url: `${SITE_URL}/new`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
