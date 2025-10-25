import { ISlugGenerator, ILandingPageRepository, ILogger } from '../interfaces';

export class SlugGenerator implements ISlugGenerator {
  constructor(
    private readonly landingPageRepository: ILandingPageRepository,
    private readonly logger: ILogger
  ) {}

  async generate(title: string, userId: string): Promise<string> {
    try {
      this.logger.debug('Generating slug for title', { title, userId });
      
      // Sanitize the title to create base slug
      let baseSlug = this.sanitize(title);
      
      // Ensure minimum length
      if (baseSlug.length < 3) {
        baseSlug = `page-${baseSlug}`;
      }
      
      // Check for uniqueness and add suffix if needed
      let slug = baseSlug;
      let counter = 1;
      
      while (!(await this.isSlugAvailable(slug))) {
        slug = `${baseSlug}-${counter}`;
        counter++;
        
        // Prevent infinite loops
        if (counter > 1000) {
          slug = `${baseSlug}-${Date.now()}`;
          break;
        }
      }
      
      this.logger.debug('Generated unique slug', { originalTitle: title, slug, attempts: counter });
      return slug;
      
    } catch (error) {
      this.logger.error('Failed to generate slug', { title, userId, error });
      // Fallback to timestamp-based slug
      const fallbackSlug = `page-${Date.now()}`;
      this.logger.warn('Using fallback slug', { fallbackSlug });
      return fallbackSlug;
    }
  }

  validate(slug: string): boolean {
    // Check basic format requirements
    if (!slug || typeof slug !== 'string') {
      return false;
    }

    // Length constraints
    if (slug.length < 3 || slug.length > 100) {
      return false;
    }

    // Must start and end with alphanumeric character
    if (!/^[a-z0-9]/.test(slug) || !/[a-z0-9]$/.test(slug)) {
      return false;
    }

    // Only allow lowercase letters, numbers, and hyphens
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return false;
    }

    // No consecutive hyphens
    if (slug.includes('--')) {
      return false;
    }

    // Reserved slugs
    const reservedSlugs = [
      'admin', 'api', 'app', 'www', 'mail', 'ftp', 'localhost',
      'staging', 'test', 'beta', 'dev', 'prod', 'production',
      'dashboard', 'console', 'panel', 'control', 'manage',
      'login', 'logout', 'signup', 'register', 'auth',
      'help', 'support', 'contact', 'about', 'terms',
      'privacy', 'legal', 'docs', 'documentation',
      'blog', 'news', 'press', 'media', 'assets',
      'static', 'public', 'private', 'system', 'config'
    ];

    if (reservedSlugs.includes(slug.toLowerCase())) {
      return false;
    }

    return true;
  }

  sanitize(title: string): string {
    if (!title || typeof title !== 'string') {
      return 'untitled';
    }

    return title
      .toLowerCase()                    // Convert to lowercase
      .trim()                          // Remove leading/trailing whitespace
      .replace(/[^\w\s-]/g, '')        // Remove special characters except word chars, spaces, hyphens
      .replace(/[\s_-]+/g, '-')        // Replace spaces, underscores, multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '')         // Remove leading/trailing hyphens
      .substring(0, 80);               // Limit length
  }

  private async isSlugAvailable(slug: string): Promise<boolean> {
    try {
      const existingPage = await this.landingPageRepository.findBySlug(slug);
      return existingPage === null;
    } catch (error) {
      this.logger.error('Error checking slug availability', { slug, error });
      // On error, assume slug is not available for safety
      return false;
    }
  }
}