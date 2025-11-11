# Static Content Migration Guide

This guide explains how to migrate your existing static blog posts and pages from the frontend to the Content Management System database with full SEO optimization.

## Overview

The migration script (`scripts/migrate-static-content.ts`) automatically:

- 📄 **Scans your frontend directory** for content files (Markdown, HTML, React components)
- 🔍 **Extracts metadata** from frontmatter, HTML meta tags, or component metadata
- ✨ **Generates SEO-friendly content** with optimized titles, descriptions, and keywords
- 🏷️ **Creates categories and tags** automatically based on content
- 🗄️ **Imports everything into the database** with proper relationships

## Supported File Types

| File Type | Description | Metadata Source |
|-----------|-------------|-----------------|
| `.md`, `.mdx` | Markdown files | YAML frontmatter + content analysis |
| `.html` | HTML files | HTML meta tags + content extraction |
| `.tsx`, `.jsx` | React components | Component metadata + JSX content |
| `.ts`, `.js` | JavaScript files | Exported metadata objects |

## Quick Start

### 1. Preview Migration (Dry Run)

First, see what content would be migrated without making any changes:

```bash
cd services/content-service

# Preview migration from your frontend directory
npm run migrate:static -- --source-path="/var/www/qrgeneration-frontend/apps/qr-generator/src" --dry-run
```

### 2. Execute Migration

Once you're satisfied with the preview, execute the migration:

```bash
# Execute the migration
npm run migrate:static -- --source-path="/var/www/qrgeneration-frontend/apps/qr-generator/src" --execute
```

### 3. Overwrite Existing Content

If you need to update existing content:

```bash
# Overwrite existing content with the same slug
npm run migrate:static -- --source-path="/var/www/qrgeneration-frontend/apps/qr-generator/src" --execute --overwrite
```

## Configuration

### Environment Variables

Ensure these environment variables are set in your `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qr_generation
DB_USER=postgres
DB_PASSWORD=password

# SEO Configuration
BASE_URL=https://your-domain.com
```

### Frontend Directory Structure

The migration script automatically searches these directories:

- `{source-path}/app/blog/` - Blog posts
- `{source-path}/app/pages/` - Static pages
- `{source-path}/components/blog/` - Blog components
- `{source-path}/content/` - Content directory
- `{source-path}/data/` - Data files
- `{source-path}/posts/` - Posts directory
- `{source-path}/articles/` - Articles directory

## Markdown Frontmatter Format

For best results, use this frontmatter format in your Markdown files:

```yaml
---
title: "Your Blog Post Title"
excerpt: "Short description for SEO and previews"
slug: "your-blog-post-slug"
meta_title: "SEO Title for Search Engines"
meta_description: "SEO description for search results"
keywords: ["seo", "keywords", "for", "this", "post"]
tags: ["blog", "tutorial", "guide"]
post_type: "blog"  # or "page", "testimonial"
status: "published"  # or "draft"
date: "2024-11-01"
author_id: 1
category_id: 1
featured_image: "/path/to/image.jpg"
---

Your markdown content here...
```

## HTML Meta Tags Format

For HTML files, include these meta tags:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Page Title</title>
    <meta name="description" content="Your page description for SEO">
    <meta name="keywords" content="keyword1, keyword2, keyword3">
    <!-- Open Graph tags -->
    <meta property="og:title" content="Your Page Title">
    <meta property="og:description" content="Your page description">
    <meta property="og:image" content="/path/to/image.jpg">
    <!-- Twitter Card tags -->
    <meta name="twitter:title" content="Your Page Title">
    <meta name="twitter:description" content="Your page description">
</head>
<body>
    <main>
        Your main content here...
    </main>
</body>
</html>
```

## React Component Format

For React/TypeScript components, export metadata:

```tsx
// Metadata export
export const metadata = {
  title: "Your Component Title",
  description: "Your component description for SEO",
  keywords: ["react", "component", "seo"],
  post_type: "blog"
};

// Or inline metadata
const BlogPost = () => {
  const title = "Your Blog Post Title";
  const description = "Your blog post description";
  
  return (
    <article>
      <h1>{title}</h1>
      <p>{description}</p>
      {/* Your JSX content */}
    </article>
  );
};
```

## Advanced Usage

### Custom Source Paths

```bash
# Migrate from specific directories
npm run migrate:static -- --source-path="/custom/path/to/content" --execute

# Multiple source paths (run separately)
npm run migrate:static -- --source-path="/path/to/blog" --execute
npm run migrate:static -- --source-path="/path/to/pages" --execute
```

### Content Type Detection

The script automatically determines content type based on file path:

- Files in `/blog/` or `/post/` directories → `blog` type
- Files in `/testimonial/` or `/review/` directories → `testimonial` type
- All other files → `page` type

### SEO Optimization Features

The migration script automatically:

1. **Generates SEO-friendly slugs** from titles using proper URL formatting
2. **Creates meta descriptions** from content excerpts (160 characters max)
3. **Extracts keywords** using frequency analysis of content
4. **Generates Open Graph and Twitter Card metadata**
5. **Creates canonical URLs** for each piece of content
6. **Sets up proper schema markup** for search engines

### Database Schema Integration

The migrated content integrates with the complete CMS database schema:

- **Content Posts** - Main content with SEO fields
- **Categories** - Auto-created based on content type
- **Tags** - Extracted from frontmatter/metadata
- **SEO Settings** - Complete meta tags and social sharing
- **Media** - Featured images and attachments

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check your environment variables
   cat .env
   
   # Test database connection
   psql -h localhost -U postgres -d qr_generation
   ```

2. **Permission Denied**
   ```bash
   # Ensure the script has access to your frontend directory
   ls -la /var/www/qrgeneration-frontend/apps/qr-generator/src
   ```

3. **Missing Dependencies**
   ```bash
   # Install missing packages
   npm install marked @types/marked slugify @types/slugify
   ```

### Debug Mode

Add debug logging by modifying the script:

```typescript
// Add to the beginning of migrate-static-content.ts
process.env.DEBUG = 'migration:*';
```

## Post-Migration Steps

After successful migration:

1. **Verify Content** - Check the database for imported content:
   ```sql
   SELECT id, title, slug, post_type, status FROM content_posts;
   ```

2. **Test API Endpoints**:
   ```bash
   # Test blog posts
   curl http://localhost:3012/api/v1/content/posts?type=blog
   
   # Test pages
   curl http://localhost:3012/api/v1/content/posts?type=page
   ```

3. **Update Frontend Integration**:
   - Update your frontend to fetch from the CMS API
   - Replace static imports with API calls
   - Update routing to use dynamic slugs

4. **SEO Verification**:
   - Check generated sitemaps: `GET /api/v1/content/seo/sitemap`
   - Verify meta tags in API responses
   - Test Open Graph and Twitter Cards

## Frontend Integration Example

After migration, update your frontend to use the CMS:

```tsx
// Before: Static import
import { blogPosts } from '../data/blog-posts';

// After: API fetch
const BlogPage = () => {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    fetch('http://localhost:3012/api/v1/content/posts?type=blog')
      .then(res => res.json())
      .then(data => setPosts(data.posts));
  }, []);
  
  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <div dangerouslySetInnerHTML={{ __html: post.content_html }} />
        </article>
      ))}
    </div>
  );
};
```

## Best Practices

1. **Always run dry-run first** to preview changes
2. **Backup your database** before executing migration
3. **Use consistent frontmatter** across your content files
4. **Organize content by type** in separate directories
5. **Include featured images** for better SEO and social sharing
6. **Review SEO settings** after migration for optimization

## Support

If you encounter issues during migration:

1. Check the console output for detailed error messages
2. Verify your database connection and permissions
3. Ensure all required environment variables are set
4. Review the file formats and directory structure
5. Test with a small subset of files first

The migration script is designed to be safe and reversible - you can always re-run it with different parameters or restore from a database backup if needed.