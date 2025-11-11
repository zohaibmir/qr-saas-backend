/**
 * @swagger
 * components:
 *   schemas:
 *     ContentPost:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique post identifier
 *         title:
 *           type: string
 *           description: Post title
 *           example: "How to Create Dynamic QR Codes"
 *         slug:
 *           type: string
 *           description: URL-friendly slug
 *           example: "how-to-create-dynamic-qr-codes"
 *         content:
 *           type: string
 *           description: Post content (rich text)
 *         excerpt:
 *           type: string
 *           description: Post summary
 *         type:
 *           type: string
 *           enum: [blog, testimonial, page]
 *           description: Type of content
 *         status:
 *           type: string
 *           enum: [draft, published, archived]
 *           description: Publication status
 *         authorId:
 *           type: string
 *           format: uuid
 *           description: Author's user ID
 *         featuredImageUrl:
 *           type: string
 *           description: Featured image URL
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         seoTitle:
 *           type: string
 *           description: SEO title
 *         seoDescription:
 *           type: string
 *           description: SEO description
 *         seoKeywords:
 *           type: string
 *           description: SEO keywords
 *         viewCount:
 *           type: number
 *           description: Number of views
 *         categories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContentCategory'
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContentTag'
 *         comments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContentComment'
 *     
 *     ContentCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "Tutorials"
 *         slug:
 *           type: string
 *           example: "tutorials"
 *         description:
 *           type: string
 *         color:
 *           type: string
 *           example: "#3B82F6"
 *         parentId:
 *           type: string
 *           format: uuid
 *         isActive:
 *           type: boolean
 *         postCount:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     ContentTag:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           example: "QR Codes"
 *         slug:
 *           type: string
 *           example: "qr-codes"
 *         color:
 *           type: string
 *           example: "#10B981"
 *         usageCount:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     ContentComment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         postId:
 *           type: string
 *           format: uuid
 *         parentId:
 *           type: string
 *           format: uuid
 *         authorName:
 *           type: string
 *         authorEmail:
 *           type: string
 *         content:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected, spam]
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     ContentMedia:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         filename:
 *           type: string
 *         originalName:
 *           type: string
 *         mimetype:
 *           type: string
 *         size:
 *           type: number
 *         url:
 *           type: string
 *         uploadedBy:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     ContentSEOSettings:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         contentId:
 *           type: string
 *           format: uuid
 *         seoTitle:
 *           type: string
 *         seoDescription:
 *           type: string
 *         seoKeywords:
 *           type: string
 *         canonicalUrl:
 *           type: string
 *         metaImage:
 *           type: string
 *         structured_data:
 *           type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/content/posts:
 *   get:
 *     summary: Get posts with filtering and pagination
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of posts per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [blog, testimonial, page]
 *         description: Filter by content type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag slug
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title and content
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, publishedAt, viewCount, title]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         posts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ContentPost'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: number
 *                             limit:
 *                               type: number
 *                             total:
 *                               type: number
 *                             pages:
 *                               type: number
 *   post:
 *     summary: Create a new post
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               content:
 *                 type: string
 *                 description: Rich text content
 *               excerpt:
 *                 type: string
 *                 maxLength: 500
 *               type:
 *                 type: string
 *                 enum: [blog, testimonial, page]
 *               status:
 *                 type: string
 *                 enum: [draft, published]
 *                 default: draft
 *               slug:
 *                 type: string
 *                 description: Custom slug (auto-generated if not provided)
 *               featuredImageUrl:
 *                 type: string
 *               publishedAt:
 *                 type: string
 *                 format: date-time
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               seo:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   keywords:
 *                     type: string
 *                   canonicalUrl:
 *                     type: string
 *                   metaImage:
 *                     type: string
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentPost'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/content/posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Content Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentPost'
 *       404:
 *         description: Post not found
 *   put:
 *     summary: Update a post
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *               slug:
 *                 type: string
 *               featuredImageUrl:
 *                 type: string
 *               publishedAt:
 *                 type: string
 *                 format: date-time
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentPost'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *   delete:
 *     summary: Delete a post
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /api/content/posts/slug/{slug}:
 *   get:
 *     summary: Get a post by slug
 *     tags: [Content Management]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Post slug
 *     responses:
 *       200:
 *         description: Post details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentPost'
 *       404:
 *         description: Post not found
 */

/**
 * @swagger
 * /api/content/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Content Management]
 *     parameters:
 *       - in: query
 *         name: includeStats
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include post count statistics
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by parent category
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContentCategory'
 *   post:
 *     summary: Create a new category
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               slug:
 *                 type: string
 *                 description: Custom slug (auto-generated if not provided)
 *               color:
 *                 type: string
 *                 pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
 *               parentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentCategory'
 */

/**
 * @swagger
 * /api/content/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Content Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentCategory'
 *       404:
 *         description: Category not found
 *   put:
 *     summary: Update a category
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               slug:
 *                 type: string
 *               color:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *   delete:
 *     summary: Delete a category
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 */

/**
 * @swagger
 * /api/content/tags:
 *   get:
 *     summary: Get all tags
 *     tags: [Content Management]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search tags by name
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *         description: Number of tags to return
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, usageCount, createdAt]
 *           default: usageCount
 *         description: Sort field
 *     responses:
 *       200:
 *         description: List of tags
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContentTag'
 *   post:
 *     summary: Create a new tag
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               slug:
 *                 type: string
 *               color:
 *                 type: string
 *                 pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
 *     responses:
 *       201:
 *         description: Tag created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentTag'
 */

/**
 * @swagger
 * /api/content/tags/{id}:
 *   put:
 *     summary: Update a tag
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tag ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tag not found
 *   delete:
 *     summary: Delete a tag
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tag not found
 */

/**
 * @swagger
 * /api/content/media:
 *   post:
 *     summary: Upload media file
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Media file to upload
 *               alt:
 *                 type: string
 *                 description: Alt text for accessibility
 *               caption:
 *                 type: string
 *                 description: Media caption
 *     responses:
 *       201:
 *         description: Media uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentMedia'
 *   get:
 *     summary: Get user's media files
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of files per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document]
 *         description: Filter by media type
 *     responses:
 *       200:
 *         description: List of media files
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         media:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ContentMedia'
 *                         pagination:
 *                           type: object
 */

/**
 * @swagger
 * /api/content/comments:
 *   get:
 *     summary: Get comments with filtering
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: postId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by post ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, spam]
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         comments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ContentComment'
 *                         pagination:
 *                           type: object
 *   post:
 *     summary: Create a new comment (public endpoint)
 *     tags: [Content Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *               - authorName
 *               - authorEmail
 *               - content
 *             properties:
 *               postId:
 *                 type: string
 *                 format: uuid
 *               parentId:
 *                 type: string
 *                 format: uuid
 *               authorName:
 *                 type: string
 *               authorEmail:
 *                 type: string
 *                 format: email
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created successfully (pending approval)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentComment'
 */

/**
 * @swagger
 * /api/content/comments/{id}/status:
 *   put:
 *     summary: Update comment status
 *     tags: [Content Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, spam]
 *     responses:
 *       200:
 *         description: Comment status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */

/**
 * @swagger
 * /api/content/public/posts:
 *   get:
 *     summary: Get published posts (public endpoint)
 *     tags: [Public Content]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [blog, testimonial, page]
 *         description: Filter by content type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category slug
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag slug
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts per page
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *         description: Filter by featured posts
 *     responses:
 *       200:
 *         description: List of published posts
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         posts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/ContentPost'
 *                         pagination:
 *                           type: object
 */

/**
 * @swagger
 * /api/content/public/posts/{slug}:
 *   get:
 *     summary: Get published post by slug (public endpoint)
 *     tags: [Public Content]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Post slug
 *     responses:
 *       200:
 *         description: Published post details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ContentPost'
 *       404:
 *         description: Post not found or not published
 */

/**
 * @swagger
 * /api/content/public/categories:
 *   get:
 *     summary: Get active categories (public endpoint)
 *     tags: [Public Content]
 *     responses:
 *       200:
 *         description: List of active categories
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContentCategory'
 */

/**
 * @swagger
 * /api/content/public/tags:
 *   get:
 *     summary: Get popular tags (public endpoint)
 *     tags: [Public Content]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of tags to return
 *     responses:
 *       200:
 *         description: List of popular tags
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContentTag'
 */

/**
 * @swagger
 * /api/content/health:
 *   get:
 *     summary: Content service health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 service:
 *                   type: string
 *                   example: "content-service"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 database:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     pool:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         idle:
 *                           type: number
 *                         waiting:
 *                           type: number
 */