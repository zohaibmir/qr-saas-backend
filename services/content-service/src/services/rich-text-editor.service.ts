import Delta from 'quill-delta';
import { QuillDeltaToHtmlConverter } from 'quill-delta-to-html';
import sanitizeHtml from 'sanitize-html';
import { IRichTextEditorService } from '../interfaces/content.interface';

export class RichTextEditorService implements IRichTextEditorService {
  
  // Delta operations
  convertDeltaToHtml(delta: any): string {
    try {
      if (!delta || !delta.ops) {
        return '';
      }

      const converter = new QuillDeltaToHtmlConverter(delta.ops, {
        paragraphTag: 'p',
        linkRel: 'noopener noreferrer',
        linkTarget: '_blank',
        allowBackgroundClasses: true,
      });

      const html = converter.convert();
      return this.sanitizeHtml(html);
    } catch (error) {
      console.error('Error converting delta to HTML:', error);
      return '';
    }
  }

  convertHtmlToDelta(html: string): any {
    try {
      // This is a basic implementation - for full HTML to Delta conversion,
      // you might want to use a library like html2canvas or implement custom parsing
      const sanitizedHtml = this.sanitizeHtml(html);
      
      // For now, we'll create a simple delta with the HTML as plain text
      // In a real implementation, you'd parse the HTML and create proper delta ops
      return {
        ops: [
          { insert: sanitizedHtml }
        ]
      };
    } catch (error) {
      console.error('Error converting HTML to delta:', error);
      return { ops: [] };
    }
  }

  sanitizeDelta(delta: any): any {
    try {
      if (!delta || !delta.ops) {
        return { ops: [] };
      }

      // Sanitize each operation
      const sanitizedOps = delta.ops.map((op: any) => {
        if (typeof op.insert === 'string') {
          // Sanitize text content
          return {
            ...op,
            insert: op.insert
          };
        } else if (op.insert && typeof op.insert === 'object') {
          // Handle embeds (images, videos, etc.)
          if (op.insert.image) {
            return {
              ...op,
              insert: {
                image: this.sanitizeImageUrl(op.insert.image)
              }
            };
          }
          if (op.insert.video) {
            return {
              ...op,
              insert: {
                video: this.sanitizeVideoUrl(op.insert.video)
              }
            };
          }
        }
        return op;
      });

      return { ops: sanitizedOps };
    } catch (error) {
      console.error('Error sanitizing delta:', error);
      return { ops: [] };
    }
  }

  validateDelta(delta: any): boolean {
    try {
      if (!delta || typeof delta !== 'object') {
        return false;
      }

      if (!Array.isArray(delta.ops)) {
        return false;
      }

      // Validate each operation
      return delta.ops.every((op: any) => {
        if (typeof op !== 'object') {
          return false;
        }

        // Check if operation has valid structure
        const hasValidAction = 'insert' in op || 'delete' in op || 'retain' in op;
        
        if (!hasValidAction) {
          return false;
        }

        // Validate insert operations
        if ('insert' in op) {
          if (typeof op.insert !== 'string' && typeof op.insert !== 'object') {
            return false;
          }
        }

        // Validate delete/retain operations
        if ('delete' in op || 'retain' in op) {
          const value = op.delete || op.retain;
          if (typeof value !== 'number' || value < 0) {
            return false;
          }
        }

        return true;
      });
    } catch (error) {
      return false;
    }
  }

  // Content processing
  extractTextFromDelta(delta: any): string {
    try {
      if (!delta || !delta.ops) {
        return '';
      }

      return delta.ops
        .filter((op: any) => typeof op.insert === 'string')
        .map((op: any) => op.insert)
        .join('')
        .replace(/\n/g, ' ')
        .trim();
    } catch (error) {
      return '';
    }
  }

  generateExcerpt(delta: any, length = 250): string {
    try {
      const text = this.extractTextFromDelta(delta);
      if (text.length <= length) {
        return text;
      }

      // Find the last complete word within the length limit
      const truncated = text.substring(0, length);
      const lastSpace = truncated.lastIndexOf(' ');
      
      return lastSpace > 0 
        ? truncated.substring(0, lastSpace) + '...'
        : truncated + '...';
    } catch (error) {
      return '';
    }
  }

  countWords(delta: any): number {
    try {
      const text = this.extractTextFromDelta(delta);
      if (!text) {
        return 0;
      }

      return text
        .split(/\s+/)
        .filter(word => word.length > 0)
        .length;
    } catch (error) {
      return 0;
    }
  }

  estimateReadingTime(delta: any): number {
    try {
      const wordCount = this.countWords(delta);
      const wordsPerMinute = 200; // Average reading speed
      const readingTime = Math.ceil(wordCount / wordsPerMinute);
      return Math.max(1, readingTime); // Minimum 1 minute
    } catch (error) {
      return 1;
    }
  }

  // Image handling
  async processEmbeddedImages(delta: any): Promise<any> {
    try {
      if (!delta || !delta.ops) {
        return delta;
      }

      const processedOps = await Promise.all(
        delta.ops.map(async (op: any) => {
          if (op.insert && op.insert.image) {
            // Process image URL if needed
            const processedImageUrl = await this.processImageUrl(op.insert.image);
            return {
              ...op,
              insert: {
                ...op.insert,
                image: processedImageUrl
              }
            };
          }
          return op;
        })
      );

      return { ops: processedOps };
    } catch (error) {
      console.error('Error processing embedded images:', error);
      return delta;
    }
  }

  replaceImageUrls(html: string, urlMapping: { [key: string]: string }): string {
    try {
      let updatedHtml = html;

      Object.entries(urlMapping).forEach(([oldUrl, newUrl]) => {
        const regex = new RegExp(this.escapeRegExp(oldUrl), 'g');
        updatedHtml = updatedHtml.replace(regex, newUrl);
      });

      return updatedHtml;
    } catch (error) {
      console.error('Error replacing image URLs:', error);
      return html;
    }
  }

  // Formatting
  stripFormatting(delta: any): string {
    try {
      if (!delta || !delta.ops) {
        return '';
      }

      return delta.ops
        .map((op: any) => {
          if (typeof op.insert === 'string') {
            return op.insert;
          } else if (op.insert && op.insert.image) {
            return '[Image]';
          } else if (op.insert && op.insert.video) {
            return '[Video]';
          }
          return '';
        })
        .join('')
        .replace(/\n+/g, '\n')
        .trim();
    } catch (error) {
      return '';
    }
  }

  preserveFormatting(delta: any, allowedFormats: string[]): any {
    try {
      if (!delta || !delta.ops) {
        return { ops: [] };
      }

      const filteredOps = delta.ops.map((op: any) => {
        if (!op.attributes) {
          return op;
        }

        // Filter attributes to only include allowed formats
        const filteredAttributes: any = {};
        Object.keys(op.attributes).forEach(attr => {
          if (allowedFormats.includes(attr)) {
            filteredAttributes[attr] = op.attributes[attr];
          }
        });

        return {
          ...op,
          attributes: Object.keys(filteredAttributes).length > 0 
            ? filteredAttributes 
            : undefined
        };
      });

      return { ops: filteredOps };
    } catch (error) {
      console.error('Error preserving formatting:', error);
      return { ops: [] };
    }
  }

  // Helper methods
  private sanitizeHtml(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'blockquote', 'pre', 'code',
        'a', 'img', 'video',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span'
      ],
      allowedAttributes: {
        '*': ['class', 'style'],
        'a': ['href', 'target', 'rel'],
        'img': ['src', 'alt', 'width', 'height'],
        'video': ['src', 'controls', 'width', 'height'],
        'table': ['border', 'cellpadding', 'cellspacing'],
        'th': ['scope', 'colspan', 'rowspan'],
        'td': ['colspan', 'rowspan']
      },
      allowedStyles: {
        '*': {
          'color': [/^#[0-9a-fA-F]{6}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
          'background-color': [/^#[0-9a-fA-F]{6}$/, /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/],
          'font-size': [/^\d+px$/, /^\d+em$/, /^\d+%$/],
          'font-weight': [/^bold$/, /^normal$/, /^\d+$/],
          'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
          'text-decoration': [/^underline$/, /^line-through$/, /^none$/],
          'font-style': [/^italic$/, /^normal$/]
        }
      }
    });
  }

  private sanitizeImageUrl(url: string): string {
    try {
      // Basic URL validation
      if (!url || typeof url !== 'string') {
        return '';
      }

      // Check if it's a data URL or regular URL
      if (url.startsWith('data:image/')) {
        return url; // Keep data URLs as is
      }

      // Validate regular URLs
      const urlPattern = /^https?:\/\/.+$/;
      if (urlPattern.test(url)) {
        return url;
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  private sanitizeVideoUrl(url: string): string {
    try {
      if (!url || typeof url !== 'string') {
        return '';
      }

      // Basic video URL validation
      const videoPattern = /^https?:\/\/.+\.(mp4|webm|ogg)$/i;
      if (videoPattern.test(url)) {
        return url;
      }

      return '';
    } catch (error) {
      return '';
    }
  }

  private async processImageUrl(url: string): Promise<string> {
    try {
      // This is where you could implement image processing
      // For now, just return the URL as is
      return url;
    } catch (error) {
      return url;
    }
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}