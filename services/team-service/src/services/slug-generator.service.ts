import { ISlugGenerator, ILogger } from '../interfaces';

export class SlugGenerator implements ISlugGenerator {
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  async generateSlug(name: string, existingCheck: (slug: string) => Promise<boolean>): Promise<string> {
    // Start with base slug from name
    let baseSlug = this.createBaseSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Keep checking until we find a unique slug
    while (await existingCheck(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
      
      // Prevent infinite loops
      if (counter > 1000) {
        this.logger.warn('Slug generation hit counter limit', { name, baseSlug });
        slug = `${baseSlug}-${Date.now()}`;
        break;
      }
    }

    this.logger.debug('Generated unique slug', { name, slug, attempts: counter });
    return slug;
  }

  private createBaseSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove special characters except hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Ensure it's not empty
      || 'organization';
  }
}