import { ContentPost, ContentSeoSettings } from '../types/content.types';

export class SeoService {
  
  generateMetaTags(post: ContentPost): any {
    const baseUrl = process.env.BASE_URL || 'https://localhost:3000';
    const postUrl = `${baseUrl}/${post.slug}`;
    
    return {
      // Basic Meta Tags
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt,
      keywords: post.seo_keywords,
      
      // Open Graph Tags
      'og:type': 'article',
      'og:title': post.seo_title || post.title,
      'og:description': post.seo_description || post.excerpt,
      'og:url': postUrl,
      'og:site_name': 'QR SaaS Platform',
      'og:published_time': post.publish_date,
      'og:modified_time': post.updated_at,
      
      // Twitter Card Tags
      'twitter:card': 'summary_large_image',
      'twitter:title': post.seo_title || post.title,
      'twitter:description': post.seo_description || post.excerpt,
      'twitter:url': postUrl,
      
      // Article Tags
      'article:published_time': post.publish_date,
      'article:modified_time': post.updated_at,
      'article:author': post.author?.name || 'Admin',
      'article:section': post.category?.name,
      'article:tag': post.tags?.map(tag => tag.name).join(','),
      
      // Additional SEO
      canonical: postUrl,
      robots: post.metadata?.seo_no_index ? 'noindex,nofollow' : 'index,follow',
    };
  }

  generateOpenGraphTags(post: ContentPost): any {
    const baseUrl = process.env.BASE_URL || 'https://localhost:3000';
    const postUrl = `${baseUrl}/${post.slug}`;
    
    return {
      'og:type': 'article',
      'og:title': post.seo_title || post.title,
      'og:description': post.seo_description || post.excerpt,
      'og:url': postUrl,
      'og:site_name': 'QR SaaS Platform',
      'og:published_time': post.publish_date,
      'og:modified_time': post.updated_at,
      'og:image': post.featured_image_url
    };
  }

  generateTwitterCardTags(post: ContentPost): any {
    const baseUrl = process.env.BASE_URL || 'https://localhost:3000';
    const postUrl = `${baseUrl}/${post.slug}`;
    
    return {
      'twitter:card': 'summary_large_image',
      'twitter:title': post.seo_title || post.title,
      'twitter:description': post.seo_description || post.excerpt,
      'twitter:url': postUrl,
      'twitter:image': post.featured_image_url
    };
  }

    analyzeSeoScore(post: ContentPost): {
        score: number;
        suggestions: string[];
        warnings: string[];
    } {
        let score = 100;
        const suggestions: string[] = [];
        const warnings: string[] = [];

        // Title length check
        if (post.title.length < 30) {
            score -= 10;
            suggestions.push('Consider making the title longer (30-60 characters)');
        } else if (post.title.length > 60) {
            score -= 5;
            warnings.push('Title might be too long for search results');
        }

        // Description check
        if (!post.excerpt) {
            score -= 15;
            suggestions.push('Add a meta description');
        } else if (post.excerpt.length < 120) {
            score -= 10;
            suggestions.push('Meta description should be 120-160 characters');
        } else if (post.excerpt.length > 160) {
            score -= 5;
            warnings.push('Meta description might be truncated in search results');
        }

        // Content length check
        const content = post.content_html || '';
        if (content.length < 300) {
            score -= 20;
            suggestions.push('Content should be at least 300 words');
        }

        // Keyword density check (basic)
        const words = content.toLowerCase().split(/\s+/);
        if (words.length > 0) {
            const wordCount = words.length;
            const uniqueWords = new Set(words);
            const density = (wordCount - uniqueWords.size) / wordCount;
            
            if (density > 0.02) {
                score -= 10;
                warnings.push('Keyword density might be too high');
            }
        }

        return {
            score: Math.max(0, score),
            suggestions,
            warnings
        };
    }  validateSeoRequirements(post: ContentPost): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!post.title || post.title.length === 0) {
      errors.push('Title is required');
    }

    if (!post.slug || post.slug.length === 0) {
      errors.push('URL slug is required');
    }

    if (!post.excerpt || post.excerpt.length === 0) {
      errors.push('Excerpt is required for SEO description');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  optimizeImageAlt(filename: string, context?: string): string {
    // Remove file extension and replace characters
    let alt = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    
    // Capitalize words
    alt = alt.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    if (context) {
      alt = `${context} - ${alt}`;
    }

    return alt;
  }

  generateCanonicalUrl(path: string, baseUrl?: string): string {
        const base = baseUrl || 'http://localhost:3000';
        return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    generateSitemapIndex(): Promise<string> {
        return Promise.resolve(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>http://localhost:3000/sitemap/posts.xml</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>
    <sitemap>
        <loc>http://localhost:3000/sitemap/pages.xml</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
    </sitemap>
</sitemapindex>`);
    }

    generateSlug(title: string): Promise<string> {
        const slug = title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        
        return Promise.resolve(slug);
    }

    validateSlug(slug: string): boolean {
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 100;
    }

    async generateSitemap(): Promise<string> {
        // This would typically fetch all published posts and generate XML sitemap
        const baseUrl = process.env.BASE_URL || 'https://localhost:3000';
        
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

        return sitemap;
    }

    async generateRobotsTxt(): Promise<string> {
        const baseUrl = process.env.BASE_URL || 'https://localhost:3000';
        
        return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Block sensitive areas
Disallow: /admin/
Disallow: /api/
Disallow: /private/`;
    }

    generateSchemaMarkup(post: ContentPost): any {
        return {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "author": {
                "@type": "Person",
                "name": "Admin"
            },
            "publisher": {
                "@type": "Organization",
                "name": "QR Generation",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${process.env.BASE_URL || 'http://localhost:3000'}/logo.png`
                }
            },
            "datePublished": post.created_at,
            "dateModified": post.updated_at,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": `${process.env.BASE_URL || 'http://localhost:3000'}/blog/${post.slug}`
            }
        };
    }
}