/**
 * Bulk QR Generation Documentation Entry Point
 * This file exports the bulk QR routes for Swagger integration
 */

import { bulkQRRoutes, bulkQRSchemas } from './bulk-qr-routes';

/**
 * @swagger
 * /api/bulk/templates:
 *   get:
 *     tags:
 *       - Bulk QR Generation
 *     summary: Get all bulk QR templates
 *     description: Retrieve all available bulk QR templates (system and user templates)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bulk templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BulkQRTemplate'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     total:
 *                       type: integer
 *                       example: 10
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Bulk QR Generation
 *     summary: Create a new bulk QR template
 *     description: Create a custom bulk QR template for reusable bulk operations
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBulkTemplateRequest'
 *     responses:
 *       201:
 *         description: Bulk template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BulkQRTemplate'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid template data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/bulk/batches:
 *   get:
 *     tags:
 *       - Bulk QR Generation
 *     summary: Get user bulk batches
 *     description: Retrieve bulk QR generation batches for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of batches to return
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of batches to skip
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, cancelled]
 *         description: Filter by batch status
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, batch_name]
 *           default: created_at
 *         description: Sort field
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Batches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BulkQRBatch'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     total:
 *                       type: integer
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Bulk QR Generation
 *     summary: Create bulk QR batch
 *     description: Create a new bulk QR generation batch
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBulkBatchRequest'
 *     responses:
 *       201:
 *         description: Bulk batch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BulkQRBatch'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     total:  
 *                       type: integer
 *       400:
 *         description: Invalid batch data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/bulk/process-csv:
 *   post:
 *     tags:
 *       - Bulk QR Generation
 *     summary: Process CSV data
 *     description: Parse and validate CSV data for bulk QR generation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - csvData
 *             properties:
 *               csvData:
 *                 type: string
 *                 description: CSV data as string
 *               templateId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional template ID for validation
 *     responses:
 *       200:
 *         description: CSV processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ParsedBulkData'
 *       400:
 *         description: Invalid CSV data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/bulk/stats:
 *   get:
 *     tags:
 *       - Bulk QR Generation
 *     summary: Get bulk generation statistics
 *     description: Get bulk QR generation statistics for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to include in statistics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/BulkStats'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

export { bulkQRRoutes, bulkQRSchemas };