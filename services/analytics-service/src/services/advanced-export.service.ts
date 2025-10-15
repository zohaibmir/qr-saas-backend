import { 
  IAdvancedExportService,
  AnalyticsSummary,
  AdvancedAnalyticsResponse,
  ExportConfiguration,
  ExportResult,
  ILogger,
  ServiceResponse,
  ValidationError,
  AppError
} from '../interfaces';
import * as ExcelJS from 'exceljs';
import * as jsPDF from 'jspdf';
import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import moment from 'moment-timezone';

export class AdvancedExportService implements IAdvancedExportService {
  private readonly exportDirectory = path.join(process.cwd(), 'exports');
  private readonly baseUrl = process.env.BASE_URL || 'http://localhost:3003';

  constructor(private logger: ILogger) {
    this.ensureExportDirectory();
  }

  async exportToExcel(
    data: AnalyticsSummary,
    configuration: ExportConfiguration
  ): Promise<ServiceResponse<ExportResult>> {
    try {
      this.validateExportConfiguration(configuration);

      const workbook = new ExcelJS.Workbook();
      const fileName = this.generateFileName('excel', configuration);
      const filePath = path.join(this.exportDirectory, fileName);

      // Create summary worksheet
      await this.createSummaryWorksheet(workbook, data, configuration);

      // Create time series worksheet
      if (configuration.includeRawData) {
        await this.createTimeSeriesWorksheet(workbook, data, configuration);
      }

      // Create geographic breakdown worksheet
      await this.createGeographicWorksheet(workbook, data, configuration);

      // Create platform/device breakdown worksheet
      await this.createPlatformDeviceWorksheet(workbook, data, configuration);

      // Save workbook
      await workbook.xlsx.writeFile(filePath);

      const stats = fs.statSync(filePath);
      const result = this.createExportResult(fileName, stats.size, 'excel', data);

      this.logger.info('Excel export completed', {
        fileName,
        fileSize: stats.size,
        recordCount: result.metadata.recordCount
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Excel export failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'EXCEL_EXPORT_FAILED',
          message: 'Failed to export data to Excel',
          statusCode: 500
        }
      };
    }
  }

  async exportToPDF(
    data: AnalyticsSummary,
    configuration: ExportConfiguration
  ): Promise<ServiceResponse<ExportResult>> {
    try {
      this.validateExportConfiguration(configuration);

      // Create PDF document
      const doc = new jsPDF.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'A4'
      });

      const fileName = this.generateFileName('pdf', configuration);
      const filePath = path.join(this.exportDirectory, fileName);

      // Add header
      await this.addPDFHeader(doc, configuration);

      // Add summary section
      await this.addPDFSummary(doc, data, configuration);

      // Add charts if requested
      if (configuration.includeCharts) {
        await this.addPDFCharts(doc, data, configuration);
      }

      // Add geographic data
      await this.addPDFGeographicData(doc, data, configuration);

      // Add time series data
      if (configuration.includeRawData) {
        await this.addPDFTimeSeriesData(doc, data, configuration);
      }

      // Add footer
      await this.addPDFFooter(doc);

      // Save PDF
      doc.save(filePath);

      const stats = fs.statSync(filePath);
      const result = this.createExportResult(fileName, stats.size, 'pdf', data);

      this.logger.info('PDF export completed', {
        fileName,
        fileSize: stats.size,
        recordCount: result.metadata.recordCount
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('PDF export failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'PDF_EXPORT_FAILED',
          message: 'Failed to export data to PDF',
          statusCode: 500
        }
      };
    }
  }

  async exportAdvanced(
    data: AdvancedAnalyticsResponse,
    configuration: ExportConfiguration
  ): Promise<ServiceResponse<ExportResult>> {
    try {
      this.validateExportConfiguration(configuration);

      let result: ExportResult;

      switch (configuration.format) {
        case 'excel':
          result = await this.exportAdvancedToExcel(data, configuration);
          break;
        case 'pdf':
          result = await this.exportAdvancedToPDF(data, configuration);
          break;
        case 'csv':
          result = await this.exportAdvancedToCSV(data, configuration);
          break;
        default:
          result = await this.exportAdvancedToJSON(data, configuration);
      }

      this.logger.info('Advanced export completed', {
        format: configuration.format,
        fileName: result.fileName,
        fileSize: result.fileSize
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Advanced export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format: configuration.format
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'ADVANCED_EXPORT_FAILED',
          message: 'Failed to export advanced analytics data',
          statusCode: 500
        }
      };
    }
  }

  async generateReport(
    qrCodeId: string,
    template: string,
    configuration: ExportConfiguration
  ): Promise<ServiceResponse<ExportResult>> {
    try {
      if (!qrCodeId || !template) {
        throw new ValidationError('QR Code ID and template are required');
      }

      this.validateExportConfiguration(configuration);

      const fileName = this.generateReportFileName(template, configuration);
      const filePath = path.join(this.exportDirectory, fileName);

      // Generate report based on template
      let result: ExportResult;

      switch (template) {
        case 'executive':
          result = await this.generateExecutiveReport(qrCodeId, configuration, filePath);
          break;
        case 'detailed':
          result = await this.generateDetailedReport(qrCodeId, configuration, filePath);
          break;
        case 'custom':
          result = await this.generateCustomReport(qrCodeId, configuration, filePath);
          break;
        default:
          result = await this.generateStandardReport(qrCodeId, configuration, filePath);
      }

      this.logger.info('Report generated', {
        qrCodeId,
        template,
        fileName: result.fileName,
        fileSize: result.fileSize
      });

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      this.logger.error('Report generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        qrCodeId,
        template
      });

      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            statusCode: error.statusCode,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'REPORT_GENERATION_FAILED',
          message: 'Failed to generate report',
          statusCode: 500
        }
      };
    }
  }

  // Private helper methods
  private validateExportConfiguration(config: ExportConfiguration): void {
    if (!config.format || !['csv', 'excel', 'pdf', 'json'].includes(config.format)) {
      throw new ValidationError('Invalid export format');
    }

    if (!config.dateRange || !config.dateRange.startDate || !config.dateRange.endDate) {
      throw new ValidationError('Date range is required');
    }

    if (config.dateRange.startDate > config.dateRange.endDate) {
      throw new ValidationError('Start date cannot be after end date');
    }
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDirectory)) {
      fs.mkdirSync(this.exportDirectory, { recursive: true });
    }
  }

  private generateFileName(format: string, config: ExportConfiguration): string {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const template = config.template || 'standard';
    return `analytics_${template}_${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
  }

  private generateReportFileName(template: string, config: ExportConfiguration): string {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const extension = config.format === 'excel' ? 'xlsx' : config.format;
    return `report_${template}_${timestamp}.${extension}`;
  }

  private createExportResult(fileName: string, fileSize: number, format: string, data: any): ExportResult {
    return {
      id: this.generateExportId(),
      format,
      fileName,
      fileSize,
      downloadUrl: `${this.baseUrl}/exports/${fileName}`,
      expiresAt: moment().add(7, 'days').toDate(),
      metadata: {
        recordCount: this.calculateRecordCount(data),
        generationTime: Date.now(),
        compression: format === 'pdf' ? 'none' : 'zip'
      }
    };
  }

  private calculateRecordCount(data: any): number {
    if (data.timeSeriesData) {
      return data.timeSeriesData.length;
    }
    if (data.scansByDate) {
      return data.scansByDate.length;
    }
    return 0;
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Excel-specific methods
  private async createSummaryWorksheet(
    workbook: ExcelJS.Workbook,
    data: AnalyticsSummary,
    config: ExportConfiguration
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Summary');

    // Add headers
    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    // Add summary data
    worksheet.addRow({ metric: 'Total Scans', value: data.totalScans });
    worksheet.addRow({ metric: 'Unique Scans', value: data.uniqueScans });
    worksheet.addRow({ metric: 'Date Range', value: `${moment(config.dateRange.startDate).format('YYYY-MM-DD')} to ${moment(config.dateRange.endDate).format('YYYY-MM-DD')}` });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  }

  private async createTimeSeriesWorksheet(
    workbook: ExcelJS.Workbook,
    data: AnalyticsSummary,
    config: ExportConfiguration
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Time Series');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Scans', key: 'scans', width: 15 },
      { header: 'Unique Scans', key: 'uniqueScans', width: 15 }
    ];

    // Add time series data
    data.timeSeriesData.forEach(item => {
      worksheet.addRow({
        date: item.timestamp,
        scans: item.scans,
        uniqueScans: item.uniqueScans
      });
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  }

  private async createGeographicWorksheet(
    workbook: ExcelJS.Workbook,
    data: AnalyticsSummary,
    config: ExportConfiguration
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Geographic Data');

    worksheet.columns = [
      { header: 'Country', key: 'country', width: 25 },
      { header: 'Scans', key: 'scans', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];

    // Add geographic data
    data.geographicData.forEach(item => {
      worksheet.addRow({
        country: item.country,
        scans: item.scans,
        percentage: `${item.percentage}%`
      });
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  }

  private async createPlatformDeviceWorksheet(
    workbook: ExcelJS.Workbook,
    data: AnalyticsSummary,
    config: ExportConfiguration
  ): Promise<void> {
    const worksheet = workbook.addWorksheet('Platform & Device');

    worksheet.columns = [
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Count', key: 'count', width: 15 }
    ];

    // Add platform data
    Object.entries(data.platformBreakdown).forEach(([platform, count]) => {
      worksheet.addRow({
        type: 'Platform',
        name: platform,
        count
      });
    });

    // Add device data
    Object.entries(data.deviceBreakdown).forEach(([device, count]) => {
      worksheet.addRow({
        type: 'Device',
        name: device,
        count
      });
    });

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };
  }

  // PDF-specific methods
  private async addPDFHeader(doc: jsPDF.jsPDF, config: ExportConfiguration): Promise<void> {
    doc.setFontSize(20);
    doc.text('QR Code Analytics Report', 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, 20, 45);
    doc.text(`Period: ${moment(config.dateRange.startDate).format('YYYY-MM-DD')} to ${moment(config.dateRange.endDate).format('YYYY-MM-DD')}`, 20, 55);
  }

  private async addPDFSummary(doc: jsPDF.jsPDF, data: AnalyticsSummary, config: ExportConfiguration): Promise<void> {
    doc.setFontSize(16);
    doc.text('Summary', 20, 80);
    
    doc.setFontSize(12);
    doc.text(`Total Scans: ${data.totalScans}`, 20, 95);
    doc.text(`Unique Scans: ${data.uniqueScans}`, 20, 105);
    doc.text(`Conversion Rate: ${data.totalScans > 0 ? ((data.uniqueScans / data.totalScans) * 100).toFixed(2) : 0}%`, 20, 115);
  }

  private async addPDFCharts(doc: jsPDF.jsPDF, data: AnalyticsSummary, config: ExportConfiguration): Promise<void> {
    // Create a simple chart using canvas
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d');
    
    // Draw a simple bar chart for geographic data
    this.drawBarChart(ctx, data.geographicData.slice(0, 5), 'Top Countries');
    
    // Convert canvas to image and add to PDF
    const imageData = canvas.toDataURL('image/png');
    doc.addImage(imageData, 'PNG', 20, 130, 160, 120);
  }

  private drawBarChart(ctx: CanvasRenderingContext2D, data: any[], title: string): void {
    const width = 400;
    const height = 300;
    const padding = 50;

    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    // Draw title
    ctx.font = '16px Arial';
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.fillText(title, width / 2, 30);

    // Calculate bar dimensions
    const barWidth = (width - 2 * padding) / data.length;
    const maxValue = Math.max(...data.map(d => d.scans));

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.scans / maxValue) * (height - 2 * padding - 50);
      const x = padding + index * barWidth;
      const y = height - padding - barHeight;

      // Draw bar
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

      // Draw label
      ctx.font = '10px Arial';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.fillText(item.country, x + barWidth / 2, height - padding + 15);
      ctx.fillText(item.scans.toString(), x + barWidth / 2, y - 5);
    });
  }

  private async addPDFGeographicData(doc: jsPDF.jsPDF, data: AnalyticsSummary, config: ExportConfiguration): Promise<void> {
    // Add new page if needed
    doc.addPage();
    
    doc.setFontSize(16);
    doc.text('Geographic Distribution', 20, 30);
    
    doc.setFontSize(10);
    let yPosition = 50;
    
    data.geographicData.slice(0, 10).forEach(item => {
      doc.text(`${item.country}: ${item.scans} (${item.percentage}%)`, 20, yPosition);
      yPosition += 10;
    });
  }

  private async addPDFTimeSeriesData(doc: jsPDF.jsPDF, data: AnalyticsSummary, config: ExportConfiguration): Promise<void> {
    // Implementation for time series data in PDF
    doc.setFontSize(14);
    doc.text('Time Series Data', 20, 150);
    
    doc.setFontSize(10);
    let yPos = 170;
    
    data.timeSeriesData.slice(0, 10).forEach(item => {
      doc.text(`${item.timestamp.split('T')[0]}: ${item.scans} scans`, 20, yPos);
      yPos += 10;
    });
  }

  private async addPDFFooter(doc: jsPDF.jsPDF): Promise<void> {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, 200 - 20, 290);
      doc.text('Generated by QR Analytics Platform', 20, 290);
    }
  }

  // Advanced export methods (simplified implementations)
  private async exportAdvancedToExcel(data: AdvancedAnalyticsResponse, config: ExportConfiguration): Promise<ExportResult> {
    // Simplified implementation - convert advanced data to basic format for Excel export
    const basicData: AnalyticsSummary = {
      totalScans: data.summary.totalScans,
      uniqueScans: data.summary.uniqueScans,
      scansByDate: data.timeSeries.map(ts => ({ date: ts.timestamp.toISOString().split('T')[0], scans: ts.scans })),
      platformBreakdown: data.breakdowns.platforms.reduce((acc, p) => ({ ...acc, [p.platform]: p.scans }), {}),
      deviceBreakdown: data.breakdowns.devices.reduce((acc, d) => ({ ...acc, [d.device]: d.scans }), {}),
      geographicData: data.breakdowns.geographic.map(g => ({ country: g.country, scans: g.scans, percentage: 0 })),
      timeSeriesData: data.timeSeries.map(ts => ({ timestamp: ts.timestamp.toISOString(), scans: ts.scans, uniqueScans: ts.uniqueVisitors }))
    };

    const result = await this.exportToExcel(basicData, config);
    return result.data!;
  }

  private async exportAdvancedToPDF(data: AdvancedAnalyticsResponse, config: ExportConfiguration): Promise<ExportResult> {
    // Similar conversion for PDF export
    const basicData: AnalyticsSummary = {
      totalScans: data.summary.totalScans,
      uniqueScans: data.summary.uniqueScans,
      scansByDate: data.timeSeries.map(ts => ({ date: ts.timestamp.toISOString().split('T')[0], scans: ts.scans })),
      platformBreakdown: data.breakdowns.platforms.reduce((acc, p) => ({ ...acc, [p.platform]: p.scans }), {}),
      deviceBreakdown: data.breakdowns.devices.reduce((acc, d) => ({ ...acc, [d.device]: d.scans }), {}),
      geographicData: data.breakdowns.geographic.map(g => ({ country: g.country, scans: g.scans, percentage: 0 })),
      timeSeriesData: data.timeSeries.map(ts => ({ timestamp: ts.timestamp.toISOString(), scans: ts.scans, uniqueScans: ts.uniqueVisitors }))
    };

    const result = await this.exportToPDF(basicData, config);
    return result.data!;
  }

  private async exportAdvancedToCSV(data: AdvancedAnalyticsResponse, config: ExportConfiguration): Promise<ExportResult> {
    const fileName = this.generateFileName('csv', config);
    const filePath = path.join(this.exportDirectory, fileName);

    let csvContent = 'Date,Scans,Conversions,Unique Visitors,Engagement Score\n';
    
    data.timeSeries.forEach(item => {
      csvContent += `${item.timestamp.toISOString().split('T')[0]},${item.scans},${item.conversions},${item.uniqueVisitors},${item.engagementScore}\n`;
    });

    fs.writeFileSync(filePath, csvContent);

    const stats = fs.statSync(filePath);
    return this.createExportResult(fileName, stats.size, 'csv', data);
  }

  private async exportAdvancedToJSON(data: AdvancedAnalyticsResponse, config: ExportConfiguration): Promise<ExportResult> {
    const fileName = this.generateFileName('json', config);
    const filePath = path.join(this.exportDirectory, fileName);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    const stats = fs.statSync(filePath);
    return this.createExportResult(fileName, stats.size, 'json', data);
  }

  // Report generation methods (simplified implementations)
  private async generateExecutiveReport(qrCodeId: string, config: ExportConfiguration, filePath: string): Promise<ExportResult> {
    // Simplified executive report generation
    const fileName = path.basename(filePath);
    fs.writeFileSync(filePath, 'Executive Report Content - Placeholder');
    const stats = fs.statSync(filePath);
    return this.createExportResult(fileName, stats.size, config.format, {});
  }

  private async generateDetailedReport(qrCodeId: string, config: ExportConfiguration, filePath: string): Promise<ExportResult> {
    // Simplified detailed report generation
    const fileName = path.basename(filePath);
    fs.writeFileSync(filePath, 'Detailed Report Content - Placeholder');
    const stats = fs.statSync(filePath);
    return this.createExportResult(fileName, stats.size, config.format, {});
  }

  private async generateCustomReport(qrCodeId: string, config: ExportConfiguration, filePath: string): Promise<ExportResult> {
    // Simplified custom report generation
    const fileName = path.basename(filePath);
    fs.writeFileSync(filePath, 'Custom Report Content - Placeholder');
    const stats = fs.statSync(filePath);
    return this.createExportResult(fileName, stats.size, config.format, {});
  }

  private async generateStandardReport(qrCodeId: string, config: ExportConfiguration, filePath: string): Promise<ExportResult> {
    // Simplified standard report generation
    const fileName = path.basename(filePath);
    fs.writeFileSync(filePath, 'Standard Report Content - Placeholder');
    const stats = fs.statSync(filePath);
    return this.createExportResult(fileName, stats.size, config.format, {});
  }
}