import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  message,
  DatePicker,
  Divider,
  Upload,
  Image,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  ArrowLeftOutlined,
  PictureOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../services/adminApi';
import type { BlogPost } from '../../types/admin';
import moment from 'moment';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface BlogPostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  published_at?: string;
}

const BlogPostEditor: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [isEdit, setIsEdit] = useState(!!id);

  const isPublished = Form.useWatch('status', form) === 'published';

  const fetchPost = useCallback(async (postId: string) => {
    setLoading(true);
    try {
      const response = await adminApi.getContentById('posts', postId);
      if (response.success && response.data) {
        const postData = response.data as BlogPost;
        
        form.setFieldsValue({
          title: postData.title,
          slug: postData.slug,
          content: postData.content,
          excerpt: postData.excerpt,
          status: postData.status,
          seo_title: postData.seo_title,
          seo_description: postData.seo_description,
          seo_keywords: postData.seo_keywords,
          published_at: postData.published_at ? moment(postData.published_at) : null,
        });
        
        if (postData.featured_image) {
          setPreviewImage(postData.featured_image);
        }
      } else {
        message.error('Failed to load blog post');
        navigate('/content/posts');
      }
    } catch {
      message.error('Failed to load blog post');
      navigate('/content/posts');
    } finally {
      setLoading(false);
    }
  }, [form, navigate]);

  useEffect(() => {
    if (id && id !== 'create') {
      fetchPost(id);
    } else {
      setIsEdit(false);
      // Set default values for new post
      form.setFieldsValue({
        status: 'draft',
        title: '',
        slug: '',
        content: '',
        excerpt: '',
      });
    }
  }, [id, form, fetchPost]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!isEdit || !form.getFieldValue('slug')) {
      form.setFieldValue('slug', generateSlug(title));
    }
  };

  const handleSave = async (values: BlogPostFormData, status?: 'draft' | 'published') => {
    setSaving(true);
    try {
      const saveData = {
        ...values,
        status: status || values.status,
        published_at: status === 'published' || values.status === 'published' 
          ? values.published_at || moment().toISOString()
          : values.published_at,
        featured_image: previewImage,
      };

      let response;
      if (isEdit && id) {
        response = await adminApi.updateContent('posts', id, saveData);
      } else {
        response = await adminApi.createContent('posts', saveData);
      }

      if (response.success) {
        message.success(`Blog post ${isEdit ? 'updated' : 'created'} successfully`);
        if (!isEdit && response.data?.id) {
          navigate(`/content/posts/${response.data.id}/edit`);
        }
      } else {
        message.error(response.message || `Failed to ${isEdit ? 'update' : 'create'} blog post`);
      }
    } catch {
      message.error(`Failed to ${isEdit ? 'update' : 'create'} blog post`);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const response = await adminApi.uploadMedia(file);
      if (response.success && response.data?.url) {
        setPreviewImage(response.data.url);
        message.success('Image uploaded successfully');
      } else {
        message.error('Failed to upload image');
      }
    } catch {
      message.error('Failed to upload image');
    }
    
    return false; // Prevent default upload behavior
  };

  const handleRemoveImage = () => {
    setPreviewImage('');
    message.success('Image removed');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text>Loading blog post...</Text>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/content/posts')}
          style={{ marginRight: '16px' }}
        >
          Back to Posts
        </Button>
        <Title level={2} style={{ margin: 0, display: 'inline' }}>
          {isEdit ? 'Edit Blog Post' : 'Create New Blog Post'}
        </Title>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        autoComplete="off"
      >
        <Row gutter={[24, 0]}>
          <Col xs={24} lg={16}>
            {/* Main Content */}
            <Card title="Content" style={{ marginBottom: '24px' }}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: 'Please enter a title' }]}
              >
                <Input 
                  size="large" 
                  placeholder="Enter blog post title"
                  onChange={handleTitleChange}
                />
              </Form.Item>

              <Form.Item
                name="slug"
                label="URL Slug"
                rules={[
                  { required: true, message: 'Please enter a URL slug' },
                  { pattern: /^[a-z0-9-]+$/, message: 'Slug must contain only lowercase letters, numbers, and hyphens' }
                ]}
              >
                <Input placeholder="url-friendly-slug" />
              </Form.Item>

              <Form.Item
                name="excerpt"
                label="Excerpt"
                rules={[{ required: true, message: 'Please enter an excerpt' }]}
              >
                <TextArea 
                  rows={3} 
                  placeholder="Brief description of the blog post"
                  maxLength={300}
                  showCount
                />
              </Form.Item>

              <Form.Item
                name="content"
                label="Content"
                rules={[{ required: true, message: 'Please enter content' }]}
              >
                <TextArea 
                  rows={15} 
                  placeholder="Write your blog post content here..."
                />
              </Form.Item>
            </Card>

            {/* SEO Settings */}
            <Card title="SEO Settings" style={{ marginBottom: '24px' }}>
              <Form.Item
                name="seo_title"
                label="SEO Title"
                extra="If empty, the post title will be used"
              >
                <Input placeholder="SEO optimized title" maxLength={60} showCount />
              </Form.Item>

              <Form.Item
                name="seo_description"
                label="SEO Description"
              >
                <TextArea 
                  rows={2} 
                  placeholder="Brief description for search engines"
                  maxLength={160}
                  showCount
                />
              </Form.Item>

              <Form.Item
                name="seo_keywords"
                label="SEO Keywords"
                extra="Separate keywords with commas"
              >
                <Input placeholder="keyword1, keyword2, keyword3" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            {/* Publish Settings */}
            <Card title="Publish Settings" style={{ marginBottom: '24px' }}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
              >
                <Select size="large">
                  <Option value="draft">Draft</Option>
                  <Option value="published">Published</Option>
                  <Option value="archived">Archived</Option>
                </Select>
              </Form.Item>

              {isPublished && (
                <Form.Item
                  name="published_at"
                  label="Publish Date"
                >
                  <DatePicker 
                    showTime
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD HH:mm"
                  />
                </Form.Item>
              )}

              <Divider />

              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  size="large"
                  style={{ width: '100%' }}
                >
                  {isEdit ? 'Update Post' : 'Create Post'}
                </Button>

                {!isPublished && (
                  <Button
                    icon={<SaveOutlined />}
                    loading={saving}
                    size="large"
                    style={{ width: '100%' }}
                    onClick={() => form.validateFields().then(values => 
                      handleSave(values, 'published')
                    )}
                  >
                    Publish Now
                  </Button>
                )}

                <Button
                  icon={<EyeOutlined />}
                  size="large"
                  style={{ width: '100%' }}
                  onClick={() => {
                    if (isEdit && id) {
                      navigate(`/content/posts/${id}/preview`);
                    } else {
                      message.info('Save the post first to preview');
                    }
                  }}
                >
                  Preview
                </Button>
              </Space>
            </Card>

            {/* Featured Image */}
            <Card title="Featured Image" style={{ marginBottom: '24px' }}>
              {previewImage ? (
                <div>
                  <Image 
                    src={previewImage} 
                    alt="Featured image"
                    style={{ width: '100%', marginBottom: '12px' }}
                  />
                  <Button 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={handleRemoveImage}
                    style={{ width: '100%' }}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <Upload.Dragger
                  accept="image/*"
                  beforeUpload={handleImageUpload}
                  showUploadList={false}
                >
                  <p className="ant-upload-drag-icon">
                    <PictureOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                  </p>
                  <p className="ant-upload-text">Click or drag image to upload</p>
                  <p className="ant-upload-hint">
                    Support for single image upload. JPG, PNG, GIF files only.
                  </p>
                </Upload.Dragger>
              )}
            </Card>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default BlogPostEditor;