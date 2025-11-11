import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Card,
  Tag,
  Dropdown,
  Modal,
  message,
  Input,
  Select,
  Row,
  Col,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  MoreOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../../services/adminApi';
import type { BlogPost } from '../../types/admin';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const BlogPostsPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const navigate = useNavigate();

  const fetchPosts = async (page = 1, pageSize = 10, search = '', status = '') => {
    setLoading(true);
    try {
      const response = await adminApi.getContent('posts', {
        page,
        limit: pageSize,
        search,
        status,
      });

      if (response.success && response.data) {
        setPosts(response.data.posts || []);
        setPagination({
          current: page,
          pageSize,
          total: response.data.total || 0,
        });
      } else {
        message.error(response.message || 'Failed to fetch blog posts');
      }
    } catch {
      message.error('Failed to fetch blog posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleTableChange = (paginationInfo: { current?: number; pageSize?: number }) => {
    fetchPosts(paginationInfo.current, paginationInfo.pageSize, searchText, statusFilter);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchPosts(1, pagination.pageSize, value, statusFilter);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    fetchPosts(1, pagination.pageSize, searchText, value);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Are you sure you want to delete this blog post?',
      content: 'This action cannot be undone.',
      onOk: async () => {
        try {
          const response = await adminApi.deleteContent('posts', id);
          if (response.success) {
            message.success('Blog post deleted successfully');
            fetchPosts(pagination.current, pagination.pageSize, searchText, statusFilter);
          } else {
            message.error(response.message || 'Failed to delete blog post');
          }
        } catch (error) {
          message.error('Failed to delete blog post');
        }
      },
    });
  };

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select posts to delete');
      return;
    }

    Modal.confirm({
      title: `Are you sure you want to delete ${selectedRowKeys.length} blog posts?`,
      content: 'This action cannot be undone.',
      onOk: async () => {
        try {
          // Note: This would need a bulk delete endpoint in the API
          for (const id of selectedRowKeys) {
            await adminApi.deleteContent('posts', id as string);
          }
          message.success(`${selectedRowKeys.length} blog posts deleted successfully`);
          setSelectedRowKeys([]);
          fetchPosts(pagination.current, pagination.pageSize, searchText, statusFilter);
        } catch (error) {
          message.error('Failed to delete blog posts');
        }
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'green';
      case 'draft':
        return 'blue';
      case 'archived':
        return 'red';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<BlogPost> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: BlogPost) => (
        <div>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Slug: {record.slug}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
      filters: [
        { text: 'Published', value: 'published' },
        { text: 'Draft', value: 'draft' },
        { text: 'Archived', value: 'archived' },
      ],
    },
    {
      title: 'Published Date',
      dataIndex: 'published_at',
      key: 'published_at',
      render: (date: string) => 
        date ? new Date(date).toLocaleDateString() : '-',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: BlogPost) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/content/posts/${record.id}/preview`)}
            title="Preview"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(`/content/posts/${record.id}/edit`)}
            title="Edit"
          />
          <Dropdown
            menu={{
              items: [
                {
                  key: 'duplicate',
                  label: 'Duplicate',
                },
                {
                  key: 'archive',
                  label: record.status === 'archived' ? 'Unarchive' : 'Archive',
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  danger: true,
                  onClick: () => handleDelete(record.id),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Blog Posts
            </Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/content/posts/create')}
              size="large"
            >
              New Blog Post
            </Button>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Search posts..."
                allowClear
                onSearch={handleSearch}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Filter by status"
                allowClear
                onChange={handleStatusFilter}
                style={{ width: '100%' }}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="published">Published</Option>
                <Option value="draft">Draft</Option>
                <Option value="archived">Archived</Option>
              </Select>
            </Col>
            <Col xs={24} md={10}>
              <Space>
                {selectedRowKeys.length > 0 && (
                  <Button danger onClick={handleBulkDelete}>
                    Delete Selected ({selectedRowKeys.length})
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={posts}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} blog posts`,
          }}
          onChange={handleTableChange}
          rowKey="id"
        />
      </Card>
    </div>
  );
};

export default BlogPostsPage;