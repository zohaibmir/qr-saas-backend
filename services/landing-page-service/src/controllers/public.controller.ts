import express from 'express';
import { LandingPageService } from '../services/landing-page.service';
import { PageBuilderService } from '../services/page-builder.service';
import { ABTestingService } from '../services/ab-testing.service';
import { Logger } from '../services/logger.service';

export interface PublicRouteControllerDeps {
  landingPageService: LandingPageService;
  pageBuilderService: PageBuilderService;
  abTestingService: ABTestingService;
  logger: Logger;
}

export class PublicController {
  private landingPageService: LandingPageService;
  private pageBuilderService: PageBuilderService;
  private abTestingService: ABTestingService;
  private logger: Logger;

  constructor(deps: PublicRouteControllerDeps) {
    this.landingPageService = deps.landingPageService;
    this.pageBuilderService = deps.pageBuilderService;
    this.abTestingService = deps.abTestingService;
    this.logger = deps.logger;
  }

  /**
   * Serve landing page by slug with A/B testing
   */
  public serveLandingPage = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const userIdentifier = this.getUserIdentifier(req);

      // Get landing page by slug
      const landingPageResponse = await this.landingPageService.getLandingPageBySlug(slug);
      if (!landingPageResponse.success || !landingPageResponse.data) {
        res.status(404).send('Page not found');
        return;
      }

      const landingPage = landingPageResponse.data;

      // Check if page is published
      if (!landingPage.isPublished) {
        res.status(404).send('Page not found');
        return;
      }

      // Get active A/B tests for this page
      const activeTests = await this.abTestingService.getActiveTestsForPage(landingPage.id);
      
      let templateToUse = landingPage.templateId;
      let testId: string | undefined;
      let variantId: string | undefined;

      // Handle A/B testing if active tests exist
      if (activeTests.length > 0) {
        const test = activeTests[0]; // Use first active test
        const allocatedVariant = await this.abTestingService.allocateUserToVariant(
          test.id, 
          userIdentifier
        );
        
        if (allocatedVariant) {
          templateToUse = allocatedVariant.template_id;
          testId = test.id;
          variantId = allocatedVariant.id;
        }
      }

      // Get template for rendering
      let template;
      if (templateToUse) {
        const templateResponse = await this.landingPageService.getTemplateById(templateToUse);
        if (!templateResponse.success || !templateResponse.data) {
          res.status(500).send('Template not found');
          return;
        }
        template = templateResponse.data;
      } else {
        // Use default template
        const defaultTemplate = this.pageBuilderService.generateDefaultTemplate();
        template = {
          id: 'default',
          name: 'Default Template',
          html_template: defaultTemplate.html,
          css_template: defaultTemplate.css,
          js_template: defaultTemplate.js
        };
      }

      // Prepare template variables
      const templateVariables = {
        ...landingPage.content,
        page_url: `${req.protocol}://${req.get('host')}/${slug}`,
        user_agent: req.get('User-Agent') || '',
        referrer: req.get('Referer') || '',
        ip_address: this.getClientIP(req)
      };

      // Add form HTML if page has forms (would need to be loaded from form service)
      // if (landingPage.formConfig) {
      //   templateVariables.form_html = this.pageBuilderService.generateFormHTML(landingPage.formConfig);
      //   templateVariables.show_form = true;
      // }

      // Generate complete HTML page
      const html = this.pageBuilderService.generatePage(
        template as any,
        landingPage,
        templateVariables
      );

      // Track page view for analytics
      this.trackPageView(req, landingPage.id, testId, variantId);

      // Set appropriate headers
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      // Send the generated HTML
      res.send(html);

      this.logger.info('Landing page served', {
        slug,
        pageId: landingPage.id,
        templateId: templateToUse,
        testId,
        variantId,
        userAgent: req.get('User-Agent'),
        ip: this.getClientIP(req)
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to serve landing page', {
        error: errorMessage,
        slug: req.params.slug,
        userAgent: req.get('User-Agent'),
        ip: this.getClientIP(req)
      });
      
      res.status(500).send('Internal Server Error');
    }
  };

  /**
   * Handle form submissions
   */
  public handleFormSubmission = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { page_id, form_id, ...formData } = req.body;
      const userIdentifier = this.getUserIdentifier(req);

      if (!page_id) {
        res.status(400).json({ error: 'Page ID is required' });
        return;
      }

      // Get landing page to validate form
      const landingPageResponse = await this.landingPageService.getLandingPageById(page_id);
      if (!landingPageResponse.success || !landingPageResponse.data) {
        res.status(404).json({ error: 'Page not found' });
        return;
      }

      const landingPage = landingPageResponse.data;

      // Submit form data (this would need to be updated to match actual form submission API)
      const submissionResponse = await this.landingPageService.submitForm(
        form_id || 'default',
        formData,
        {
          user_identifier: userIdentifier,
          ip_address: this.getClientIP(req),
          user_agent: req.get('User-Agent') || '',
          referrer: req.get('Referer') || ''
        }
      );

      if (!submissionResponse.success || !submissionResponse.data) {
        res.status(500).json({ error: 'Form submission failed' });
        return;
      }

      const submission = submissionResponse.data;

      // Track conversion for A/B testing
      const activeTests = await this.abTestingService.getActiveTestsForPage(page_id);
      if (activeTests.length > 0) {
        const test = activeTests[0];
        const allocatedVariant = await this.abTestingService.allocateUserToVariant(
          test.id,
          userIdentifier
        );
        
        if (allocatedVariant) {
          await this.abTestingService.recordConversion(
            test.id,
            allocatedVariant.id,
            userIdentifier,
            'form_submit'
          );
        }
      }

      // Log successful submission
      this.logger.info('Form submission processed', {
        pageId: page_id,
        submissionId: submission.id,
        formFields: Object.keys(formData),
        userIdentifier: userIdentifier.substring(0, 8) + '...',
        ip: this.getClientIP(req)
      });

      res.json({
        success: true,
        message: 'Form submitted successfully',
        submissionId: submission.id
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to process form submission', {
        error: errorMessage,
        pageId: req.body.page_id,
        ip: this.getClientIP(req)
      });
      
      res.status(500).json({
        success: false,
        error: 'Form submission failed'
      });
    }
  };

  /**
   * Track conversion events (for external integrations)
   */
  public trackConversion = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { page_id, conversion_type = 'conversion', conversion_value } = req.body;
      const userIdentifier = this.getUserIdentifier(req);

      if (!page_id) {
        res.status(400).json({ error: 'Page ID is required' });
        return;
      }

      // Get active tests for the page
      const activeTests = await this.abTestingService.getActiveTestsForPage(page_id);
      if (activeTests.length === 0) {
        res.json({ success: true, message: 'No active tests for this page' });
        return;
      }

      const test = activeTests[0];
      const allocatedVariant = await this.abTestingService.allocateUserToVariant(
        test.id,
        userIdentifier
      );

      if (allocatedVariant) {
        await this.abTestingService.recordConversion(
          test.id,
          allocatedVariant.id,
          userIdentifier,
          conversion_type,
          conversion_value ? parseFloat(conversion_value) : undefined
        );
      }

      this.logger.info('Conversion tracked', {
        pageId: page_id,
        testId: test.id,
        variantId: allocatedVariant?.id,
        conversionType: conversion_type,
        conversionValue: conversion_value,
        userIdentifier: userIdentifier.substring(0, 8) + '...'
      });

      res.json({
        success: true,
        message: 'Conversion tracked successfully'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to track conversion', {
        error: errorMessage,
        pageId: req.body.page_id,
        ip: this.getClientIP(req)
      });
      
      res.status(500).json({
        success: false,
        error: 'Conversion tracking failed'
      });
    }
  };

  /**
   * Generate unique user identifier for session
   */
  private getUserIdentifier(req: express.Request): string {
    // Try to get existing identifier from cookie
    let userId = req.cookies?.['landing_page_user_id'];
    
    if (!userId) {
      // Generate new identifier based on IP + User Agent + timestamp
      const ip = this.getClientIP(req);
      const userAgent = req.get('User-Agent') || '';
      const timestamp = Date.now();
      
      // Create a hash-like identifier
      userId = Buffer.from(`${ip}${userAgent}${timestamp}`)
        .toString('base64')
        .replace(/[+/=]/g, '')
        .substring(0, 16);
    }

    return userId;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: express.Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  /**
   * Track page view for analytics
   */
  private trackPageView(
    req: express.Request,
    pageId: string,
    testId?: string,
    variantId?: string
  ): void {
    // This would typically send data to an analytics service
    // For now, we'll just log it
    this.logger.info('Page view tracked', {
      pageId,
      testId,
      variantId,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer'),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Health check endpoint
   */
  public healthCheck = async (_req: express.Request, res: express.Response): Promise<void> => {
    res.json({
      status: 'healthy',
      service: 'landing-page-public',
      timestamp: new Date().toISOString()
    });
  };

  /**
   * Get page metadata (for preview/SEO)
   */
  public getPageMetadata = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const { slug } = req.params;

      const landingPageResponse = await this.landingPageService.getLandingPageBySlug(slug);
      if (!landingPageResponse.success || !landingPageResponse.data || !landingPageResponse.data.isPublished) {
        res.status(404).json({ error: 'Page not found' });
        return;
      }

      const landingPage = landingPageResponse.data;

      const metadata = {
        title: landingPage.title,
        description: landingPage.description,
        slug: landingPage.slug,
        og_image: landingPage.content?.og_image,
        created_at: landingPage.createdAt,
        updated_at: landingPage.updatedAt
      };

      res.json(metadata);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to get page metadata', {
        error: errorMessage,
        slug: req.params.slug
      });
      
      res.status(500).json({ error: 'Failed to get page metadata' });
    }
  };
}