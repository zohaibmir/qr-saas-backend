export interface ContentCategory {
    id: number;
    name: string;
    slug: string;
    description?: string;
    parent_id?: number;
    sort_order: number;
    color?: string;
    icon?: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    parent?: ContentCategory;
    children?: ContentCategory[];
    posts_count?: number;
}
export interface ContentTag {
    id: number;
    name: string;
    slug: string;
    description?: string;
    color?: string;
    usage_count: number;
    created_at: Date;
}
export interface ContentPost {
    id: string;
    title: string;
    slug: string;
    content_delta?: any;
    content_html?: string;
    excerpt?: string;
    post_type: 'blog' | 'testimonial' | 'page' | 'help';
    status: 'draft' | 'published' | 'archived' | 'scheduled';
    featured_image_url?: string;
    featured_image_alt?: string;
    gallery_images?: Array<{
        url: string;
        alt: string;
        caption?: string;
    }>;
    category_id?: number;
    author_id?: string;
    publish_date?: Date;
    scheduled_publish_date?: Date;
    expires_at?: Date;
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    meta_robots: string;
    canonical_url?: string;
    social_image_url?: string;
    social_title?: string;
    social_description?: string;
    views_count: number;
    likes_count: number;
    shares_count: number;
    comments_enabled: boolean;
    customer_name?: string;
    customer_title?: string;
    customer_company?: string;
    customer_rating?: number;
    customer_avatar_url?: string;
    testimonial_date?: Date;
    is_featured: boolean;
    allow_comments: boolean;
    is_sticky: boolean;
    password_protected: boolean;
    access_password?: string;
    metadata?: any;
    custom_fields?: any;
    created_at: Date;
    updated_at: Date;
    category?: ContentCategory;
    author?: {
        id: string;
        name: string;
        email: string;
        avatar_url?: string;
    };
    tags?: ContentTag[];
    comments?: ContentComment[];
}
export interface ContentMedia {
    id: string;
    filename: string;
    original_name: string;
    file_path: string;
    file_url: string;
    mime_type: string;
    file_size: number;
    file_extension?: string;
    media_type: 'image' | 'video' | 'audio' | 'document';
    width?: number;
    height?: number;
    thumbnails?: Array<{
        size: string;
        url: string;
        width: number;
        height: number;
    }>;
    alt_text?: string;
    caption?: string;
    description?: string;
    uploaded_by?: string;
    folder_path?: string;
    tags?: string[];
    seo_filename?: string;
    exif_data?: any;
    metadata?: any;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface ContentComment {
    id: string;
    post_id: string;
    parent_comment_id?: string;
    author_name: string;
    author_email: string;
    author_website?: string;
    author_ip?: string;
    user_agent?: string;
    content: string;
    content_html?: string;
    status: 'pending' | 'approved' | 'spam' | 'deleted';
    is_approved: boolean;
    likes_count: number;
    replies_count: number;
    metadata?: any;
    created_at: Date;
    updated_at: Date;
    post?: ContentPost;
    replies?: ContentComment[];
}
export interface ContentSeoSettings {
    id: string;
    site_title?: string;
    site_description?: string;
    site_keywords?: string[];
    default_meta_title_template?: string;
    default_meta_description_template?: string;
    default_meta_robots: string;
    default_og_type: string;
    default_og_image?: string;
    default_twitter_card: string;
    google_analytics_id?: string;
    google_tag_manager_id?: string;
    facebook_pixel_id?: string;
    sitemap_enabled: boolean;
    sitemap_include_images: boolean;
    sitemap_change_frequency: string;
    sitemap_priority: number;
    robots_txt_content?: string;
    organization_name?: string;
    organization_logo?: string;
    organization_url?: string;
    breadcrumbs_enabled: boolean;
    breadcrumbs_separator: string;
    created_at: Date;
    updated_at: Date;
}
export interface ContentView {
    id: string;
    post_id: string;
    visitor_ip?: string;
    user_agent?: string;
    referrer_url?: string;
    session_id?: string;
    user_id?: string;
    country?: string;
    region?: string;
    city?: string;
    device_type?: 'desktop' | 'mobile' | 'tablet';
    browser?: string;
    operating_system?: string;
    time_on_page?: number;
    scroll_depth?: number;
    viewed_at: Date;
}
export interface ContentMenuItem {
    id: number;
    menu_location: 'header' | 'footer' | 'sidebar' | 'mobile';
    title: string;
    url?: string;
    target: string;
    css_classes?: string;
    linked_post_id?: string;
    parent_id?: number;
    sort_order: number;
    is_active: boolean;
    visibility_rules?: any;
    description?: string;
    icon?: string;
    metadata?: any;
    created_at: Date;
    updated_at: Date;
    children?: ContentMenuItem[];
    linked_post?: ContentPost;
}
export interface CreateContentPostRequest {
    title: string;
    content_delta?: any;
    content_html?: string;
    excerpt?: string;
    post_type: 'blog' | 'testimonial' | 'page' | 'help';
    status?: 'draft' | 'published' | 'archived' | 'scheduled';
    featured_image_url?: string;
    featured_image_alt?: string;
    category_id?: number;
    tags?: number[];
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    customer_name?: string;
    customer_title?: string;
    customer_company?: string;
    customer_rating?: number;
    customer_avatar_url?: string;
    testimonial_date?: string;
    is_featured?: boolean;
    publish_date?: string;
    scheduled_publish_date?: string;
    expires_at?: string;
}
export interface UpdateContentPostRequest extends Partial<CreateContentPostRequest> {
    id: string;
}
export interface CreateContentCategoryRequest {
    name: string;
    description?: string;
    parent_id?: number;
    sort_order?: number;
    color?: string;
    icon?: string;
}
export interface CreateContentTagRequest {
    name: string;
    description?: string;
    color?: string;
}
export interface ContentPostQuery {
    page?: number;
    limit?: number;
    post_type?: 'blog' | 'testimonial' | 'page' | 'help';
    status?: 'draft' | 'published' | 'archived' | 'scheduled';
    category_id?: number;
    tag_id?: number;
    author_id?: string;
    search?: string;
    sort_by?: 'created_at' | 'updated_at' | 'publish_date' | 'title' | 'views_count';
    sort_order?: 'asc' | 'desc';
    include_tags?: boolean;
    include_category?: boolean;
    include_author?: boolean;
}
export interface ContentPostResponse extends ContentPost {
    estimated_reading_time?: number;
    word_count?: number;
    comment_count?: number;
    social_share_urls?: {
        facebook?: string;
        twitter?: string;
        linkedin?: string;
        email?: string;
    };
}
export interface QuillDeltaOp {
    insert?: string | {
        [key: string]: any;
    };
    delete?: number;
    retain?: number;
    attributes?: {
        [key: string]: any;
    };
}
export interface QuillDelta {
    ops: QuillDeltaOp[];
}
export interface EditorConfiguration {
    toolbar?: string[][] | string | boolean;
    theme?: 'snow' | 'bubble';
    placeholder?: string;
    readOnly?: boolean;
    modules?: {
        [key: string]: any;
    };
    formats?: string[];
}
export interface SeoMetaTags {
    title?: string;
    description?: string;
    keywords?: string[];
    robots?: string;
    canonical?: string;
    og_title?: string;
    og_description?: string;
    og_image?: string;
    og_type?: string;
    twitter_card?: string;
    twitter_title?: string;
    twitter_description?: string;
    twitter_image?: string;
}
export interface SitemapEntry {
    url: string;
    lastmod?: Date;
    changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
    priority?: number;
}
export interface ContentAnalytics {
    post_id: string;
    total_views: number;
    unique_views: number;
    total_comments: number;
    total_likes: number;
    total_shares: number;
    avg_time_on_page: number;
    avg_scroll_depth: number;
    bounce_rate: number;
    views_by_date: Array<{
        date: string;
        views: number;
    }>;
    top_referrers: Array<{
        referrer: string;
        views: number;
    }>;
    device_breakdown: {
        desktop: number;
        mobile: number;
        tablet: number;
    };
    geographic_data: Array<{
        country: string;
        views: number;
    }>;
}
//# sourceMappingURL=content.types.d.ts.map