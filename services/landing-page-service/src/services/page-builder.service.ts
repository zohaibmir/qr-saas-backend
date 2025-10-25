import { Logger } from './logger.service';
import { LandingPageTemplate, LandingPage, FormField } from '../interfaces';

export interface PageBuilderConfig {
  baseUrl: string;
  assetsUrl: string;
  analyticsId?: string;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean | object;
}

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export class PageBuilderService {
  private logger: Logger;
  private config: PageBuilderConfig;
  private breakpoints: ResponsiveBreakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1200
  };

  constructor(config: PageBuilderConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Generate complete HTML page from template and data
   */
  public generatePage(
    template: LandingPageTemplate,
    page: LandingPage,
    variables: TemplateVariables = {}
  ): string {
    try {
      this.logger.info('Generating page', { 
        templateId: template.id, 
        pageId: page.id 
      });

      const processedHtml = this.processTemplate(
        template.html_template,
        {
          ...variables,
          page_title: page.title,
          page_description: page.description,
          page_slug: page.slug,
          page_id: page.id,
          base_url: this.config.baseUrl
        }
      );

      const processedCss = this.processTemplate(
        template.css_template,
        variables
      );

      const responsiveCss = this.generateResponsiveCSS(processedCss);
      
      return this.buildCompleteHTML(
        processedHtml,
        responsiveCss,
        template.js_template || '',
        page,
        template
      );

    } catch (error) {
      this.logger.error('Failed to generate page', { 
        error: error.message,
        templateId: template.id,
        pageId: page.id 
      });
      throw new Error(`Page generation failed: ${error.message}`);
    }
  }

  /**
   * Process template with variable substitution
   */
  private processTemplate(template: string, variables: TemplateVariables): string {
    let processed = template;

    // Replace variables in format {{variable_name}}
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, String(value));
    });

    // Handle conditional blocks {{#if condition}} content {{/if}}
    processed = this.processConditionals(processed, variables);

    // Handle loops {{#each items}} content {{/each}}
    processed = this.processLoops(processed, variables);

    return processed;
  }

  /**
   * Process conditional blocks in templates
   */
  private processConditionals(template: string, variables: TemplateVariables): string {
    const ifRegex = /{{#if\s+(\w+)}}(.*?){{\/if}}/gs;
    
    return template.replace(ifRegex, (match, condition, content) => {
      const value = variables[condition];
      return value ? content : '';
    });
  }

  /**
   * Process loop blocks in templates
   */
  private processLoops(template: string, variables: TemplateVariables): string {
    const eachRegex = /{{#each\s+(\w+)}}(.*?){{\/each}}/gs;
    
    return template.replace(eachRegex, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map((item, index) => {
        let itemContent = content;
        
        // Replace item properties
        if (typeof item === 'object') {
          Object.entries(item).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            itemContent = itemContent.replace(regex, String(value));
          });
        } else {
          itemContent = itemContent.replace(/{{this}}/g, String(item));
        }
        
        // Replace index
        itemContent = itemContent.replace(/{{@index}}/g, String(index));
        
        return itemContent;
      }).join('');
    });
  }

  /**
   * Generate responsive CSS with breakpoints
   */
  private generateResponsiveCSS(baseCss: string): string {
    const responsiveCss = `
      /* Base styles */
      ${baseCss}

      /* Mobile styles */
      @media (max-width: ${this.breakpoints.mobile - 1}px) {
        .container {
          padding: 1rem;
          max-width: 100%;
        }
        
        .hero-section {
          padding: 2rem 1rem;
        }
        
        .grid-2, .grid-3, .grid-4 {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        
        .text-center-mobile {
          text-align: center;
        }
        
        .hide-mobile {
          display: none;
        }
      }

      /* Tablet styles */
      @media (min-width: ${this.breakpoints.mobile}px) and (max-width: ${this.breakpoints.tablet - 1}px) {
        .container {
          padding: 1.5rem;
          max-width: 90%;
        }
        
        .grid-3, .grid-4 {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .hide-tablet {
          display: none;
        }
      }

      /* Desktop styles */
      @media (min-width: ${this.breakpoints.desktop}px) {
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .hide-desktop {
          display: none;
        }
      }

      /* Common responsive utilities */
      .container {
        width: 100%;
        padding: 0 2rem;
      }
      
      .grid-2 {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 2rem;
      }
      
      .grid-3 {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;
      }
      
      .grid-4 {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 2rem;
      }
      
      .flex {
        display: flex;
      }
      
      .flex-center {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .text-center {
        text-align: center;
      }
      
      .mb-1 { margin-bottom: 0.5rem; }
      .mb-2 { margin-bottom: 1rem; }
      .mb-3 { margin-bottom: 1.5rem; }
      .mb-4 { margin-bottom: 2rem; }
      
      .mt-1 { margin-top: 0.5rem; }
      .mt-2 { margin-top: 1rem; }
      .mt-3 { margin-top: 1.5rem; }
      .mt-4 { margin-top: 2rem; }
      
      .p-1 { padding: 0.5rem; }
      .p-2 { padding: 1rem; }
      .p-3 { padding: 1.5rem; }
      .p-4 { padding: 2rem; }
    `;

    return responsiveCss;
  }

  /**
   * Generate form HTML from form configuration
   */
  public generateFormHTML(formConfig: any): string {
    if (!formConfig || !formConfig.fields) {
      return '';
    }

    const formFields = formConfig.fields.map((field: FormField) => {
      return this.generateFieldHTML(field);
    }).join('\n');

    return `
      <form class="landing-page-form" data-form-id="${formConfig.id}" method="POST" action="/api/landing-pages/forms/submit">
        ${formFields}
        <button type="submit" class="form-submit-btn">
          ${formConfig.submit_text || 'Submit'}
        </button>
      </form>
    `;
  }

  /**
   * Generate individual form field HTML
   */
  private generateFieldHTML(field: FormField): string {
    const required = field.required ? 'required' : '';
    const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return `
          <div class="form-field">
            <label for="${field.name}">${field.label}</label>
            <input 
              type="${field.type}" 
              id="${field.name}" 
              name="${field.name}" 
              ${placeholder}
              ${required}
            />
          </div>
        `;

      case 'textarea':
        return `
          <div class="form-field">
            <label for="${field.name}">${field.label}</label>
            <textarea 
              id="${field.name}" 
              name="${field.name}" 
              ${placeholder}
              ${required}
              rows="4"
            ></textarea>
          </div>
        `;

      case 'select':
        const options = field.options?.map(option => 
          `<option value="${option.value}">${option.label}</option>`
        ).join('') || '';
        
        return `
          <div class="form-field">
            <label for="${field.name}">${field.label}</label>
            <select id="${field.name}" name="${field.name}" ${required}>
              <option value="">Select an option</option>
              ${options}
            </select>
          </div>
        `;

      case 'checkbox':
        return `
          <div class="form-field checkbox-field">
            <input 
              type="checkbox" 
              id="${field.name}" 
              name="${field.name}" 
              value="true"
              ${required}
            />
            <label for="${field.name}">${field.label}</label>
          </div>
        `;

      default:
        return `
          <div class="form-field">
            <label for="${field.name}">${field.label}</label>
            <input 
              type="text" 
              id="${field.name}" 
              name="${field.name}" 
              ${placeholder}
              ${required}
            />
          </div>
        `;
    }
  }

  /**
   * Build complete HTML document
   */
  private buildCompleteHTML(
    html: string,
    css: string,
    js: string,
    page: LandingPage,
    template: LandingPageTemplate
  ): string {
    const analyticsScript = this.config.analyticsId 
      ? this.generateAnalyticsScript(this.config.analyticsId, page.id)
      : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title}</title>
    <meta name="description" content="${page.description || ''}">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${page.title}">
    <meta property="og:description" content="${page.description || ''}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${this.config.baseUrl}/${page.slug}">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${page.title}">
    <meta name="twitter:description" content="${page.description || ''}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="${this.config.assetsUrl}/favicon.ico">
    
    <!-- Styles -->
    <style>
        ${css}
    </style>
    
    ${analyticsScript}
</head>
<body data-page-id="${page.id}" data-template="${template.name}">
    ${html}
    
    <!-- Scripts -->
    <script>
        // Page tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'page_view', {
                page_title: '${page.title}',
                page_location: window.location.href,
                custom_parameter: 'landing_page_${page.id}'
            });
        }
        
        // Form submission handling
        document.addEventListener('DOMContentLoaded', function() {
            const forms = document.querySelectorAll('.landing-page-form');
            forms.forEach(form => {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    handleFormSubmission(this);
                });
            });
        });
        
        async function handleFormSubmission(form) {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...data,
                        page_id: '${page.id}',
                        form_id: form.dataset.formId
                    })
                });
                
                if (response.ok) {
                    form.innerHTML = '<div class="success-message">Thank you! Your submission has been received.</div>';
                } else {
                    throw new Error('Submission failed');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = 'Sorry, there was an error submitting your form. Please try again.';
                form.appendChild(errorDiv);
            }
        }
        
        ${js}
    </script>
</body>
</html>
    `.trim();
  }

  /**
   * Generate analytics tracking script
   */
  private generateAnalyticsScript(analyticsId: string, pageId: string): string {
    return `
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${analyticsId}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${analyticsId}', {
            custom_map: {'custom_parameter': 'landing_page_id'}
        });
    </script>
    `;
  }

  /**
   * Generate default template HTML structure
   */
  public generateDefaultTemplate(): { html: string; css: string; js: string } {
    const html = `
<div class="landing-page">
    <header class="hero-section">
        <div class="container">
            <h1>{{page_title}}</h1>
            <p class="hero-subtitle">{{page_description}}</p>
            {{#if cta_button}}
            <a href="{{cta_link}}" class="cta-button">{{cta_text}}</a>
            {{/if}}
        </div>
    </header>
    
    <main class="main-content">
        <div class="container">
            {{#if features}}
            <section class="features-section">
                <h2>Features</h2>
                <div class="grid-3">
                    {{#each features}}
                    <div class="feature-card">
                        <h3>{{title}}</h3>
                        <p>{{description}}</p>
                    </div>
                    {{/each}}
                </div>
            </section>
            {{/if}}
            
            {{#if show_form}}
            <section class="form-section">
                <h2>Get Started</h2>
                {{form_html}}
            </section>
            {{/if}}
        </div>
    </main>
    
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 QR Generation Platform</p>
        </div>
    </footer>
</div>
    `;

    const css = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    line-height: 1.6;
    color: #333;
}

.landing-page {
    min-height: 100vh;
}

.hero-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4rem 0;
    text-align: center;
}

.hero-section h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    font-weight: 700;
}

.hero-subtitle {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    opacity: 0.9;
}

.cta-button {
    display: inline-block;
    background: #fff;
    color: #667eea;
    padding: 12px 30px;
    border-radius: 50px;
    text-decoration: none;
    font-weight: 600;
    transition: transform 0.3s ease;
}

.cta-button:hover {
    transform: translateY(-2px);
}

.main-content {
    padding: 4rem 0;
}

.features-section {
    margin-bottom: 4rem;
}

.features-section h2 {
    text-align: center;
    margin-bottom: 3rem;
    font-size: 2.5rem;
}

.feature-card {
    background: #f8f9fa;
    padding: 2rem;
    border-radius: 10px;
    text-align: center;
    transition: transform 0.3s ease;
}

.feature-card:hover {
    transform: translateY(-5px);
}

.feature-card h3 {
    margin-bottom: 1rem;
    color: #667eea;
}

.form-section {
    background: #f8f9fa;
    padding: 3rem;
    border-radius: 10px;
    max-width: 600px;
    margin: 0 auto;
}

.form-section h2 {
    text-align: center;
    margin-bottom: 2rem;
}

.form-field {
    margin-bottom: 1.5rem;
}

.form-field label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.form-field input,
.form-field textarea,
.form-field select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e9ecef;
    border-radius: 5px;
    font-size: 16px;
    transition: border-color 0.3s ease;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
    outline: none;
    border-color: #667eea;
}

.checkbox-field {
    display: flex;
    align-items: center;
}

.checkbox-field input {
    width: auto;
    margin-right: 0.5rem;
}

.form-submit-btn {
    width: 100%;
    background: #667eea;
    color: white;
    padding: 15px;
    border: none;
    border-radius: 5px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.form-submit-btn:hover {
    background: #5a67d8;
}

.footer {
    background: #343a40;
    color: white;
    text-align: center;
    padding: 2rem 0;
}

.success-message {
    background: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 5px;
    text-align: center;
}

.error-message {
    background: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 5px;
    text-align: center;
    margin-top: 1rem;
}
    `;

    const js = `
// Additional custom JavaScript can be added here
console.log('Landing page loaded successfully');
    `;

    return { html, css, js };
  }
}