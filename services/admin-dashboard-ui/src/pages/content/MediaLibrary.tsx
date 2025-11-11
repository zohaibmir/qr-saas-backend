import React, { useState, useEffect } from 'react';
import {
  Card,
  Upload,
  Image,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Modal,
  message,
  Pagination,
  List,
  Tag,
  Popconfirm,
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  SearchOutlined,
  FilterOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../services/adminApi';
import type { MediaFile } from '../../types/admin';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const MediaLibrary: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 24,
    total: 0,
  });

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async (page = 1, pageSize = 24, search = '', type = '') => {
    setLoading(true);
    try {
      const response = await adminApi.getMediaFiles({
        page,
        limit: pageSize,
        search,
        type,
      });

      if (response.success && response.data) {
        setFiles(response.data.files || []);
        setPagination({
          current: page,
          pageSize,
          total: response.data.total || 0,
        });
      } else {
        message.error(response.message || 'Failed to fetch media files');
      }
    } catch {
      message.error('Failed to fetch media files');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const response = await adminApi.uploadMedia(file);
      if (response.success) {
        message.success('File uploaded successfully');
        fetchFiles(pagination.current, pagination.pageSize, searchText, typeFilter);
      } else {
        message.error(response.message || 'Failed to upload file');
      }
    } catch {
      message.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
    
    return false; // Prevent default upload behavior
  };

  const handleDelete = async (fileId: string) => {
    try {
      const response = await adminApi.deleteMedia(fileId);
      if (response.success) {
        message.success('File deleted successfully');
        fetchFiles(pagination.current, pagination.pageSize, searchText, typeFilter);
      } else {
        message.error(response.message || 'Failed to delete file');
      }
    } catch {
      message.error('Failed to delete file');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) {
      message.warning('Please select files to delete');
      return;
    }

    Modal.confirm({
      title: `Delete ${selectedFiles.length} files?`,
      content: 'This action cannot be undone.',
      onOk: async () => {
        try {
          for (const fileId of selectedFiles) {
            await adminApi.deleteMedia(fileId);
          }
          message.success(`${selectedFiles.length} files deleted successfully`);
          setSelectedFiles([]);
          fetchFiles(pagination.current, pagination.pageSize, searchText, typeFilter);
        } catch {
          message.error('Failed to delete files');
        }
      },
    });
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      message.success('URL copied to clipboard');
    });
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchFiles(1, pagination.pageSize, value, typeFilter);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    fetchFiles(1, pagination.pageSize, searchText, value);
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    fetchFiles(page, pageSize || pagination.pageSize, searchText, typeFilter);
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'blue';
    if (mimeType.startsWith('video/')) return 'purple';
    if (mimeType.startsWith('audio/')) return 'orange';
    if (mimeType.includes('pdf')) return 'red';
    return 'default';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Media Library
            </Title>
          </Col>
          <Col>
            <Upload
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              beforeUpload={handleUpload}
              showUploadList={false}
              multiple
            >
              <Button
                type="primary"
                icon={<CloudUploadOutlined />}
                loading={uploading}
                size="large"
              >
                Upload Files
              </Button>
            </Upload>
          </Col>
        </Row>
      </div>

      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="Search files..."
                allowClear
                onSearch={handleSearch}
                style={{ width: '100%' }}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Filter by type"
                allowClear
                onChange={handleTypeFilter}
                style={{ width: '100%' }}
                suffixIcon={<FilterOutlined />}
              >
                <Option value="image">Images</Option>
                <Option value="video">Videos</Option>
                <Option value="audio">Audio</Option>
                <Option value="document">Documents</Option>
              </Select>
            </Col>
            <Col xs={24} md={10}>
              <Space>
                {selectedFiles.length > 0 && (
                  <Button danger onClick={handleBulkDelete}>
                    Delete Selected ({selectedFiles.length})
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <List
          grid={{
            gutter: 16,
            xs: 1,
            sm: 2,
            md: 3,
            lg: 4,
            xl: 6,
            xxl: 8,
          }}
          loading={loading}
          dataSource={files}
          renderItem={(file) => (
            <List.Item>
              <Card
                hoverable
                size="small"
                cover={
                  isImage(file.mime_type) ? (
                    <Image
                      alt={file.alt_text || file.filename}
                      src={file.url}
                      style={{ height: '120px', objectFit: 'cover' }}
                      preview={false}
                      onClick={() => {
                        setPreviewFile(file);
                        setPreviewVisible(true);
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: '120px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f5f5f5',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setPreviewFile(file);
                        setPreviewVisible(true);
                      }}
                    >
                      <Text type="secondary" style={{ textAlign: 'center' }}>
                        {file.filename}
                      </Text>
                    </div>
                  )
                }
                actions={[
                  <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      setPreviewFile(file);
                      setPreviewVisible(true);
                    }}
                  />,
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(file.url)}
                  />,
                  <Popconfirm
                    title="Delete this file?"
                    onConfirm={() => handleDelete(file.id)}
                    okText="Delete"
                    cancelText="Cancel"
                  >
                    <Button type="text" icon={<DeleteOutlined />} danger />
                  </Popconfirm>,
                ]}
                style={{
                  border: selectedFiles.includes(file.id) ? '2px solid #1890ff' : undefined,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const newSelected = selectedFiles.includes(file.id)
                    ? selectedFiles.filter(id => id !== file.id)
                    : [...selectedFiles, file.id];
                  setSelectedFiles(newSelected);
                }}
              >
                <Card.Meta
                  title={
                    <Text ellipsis style={{ fontSize: '12px' }}>
                      {file.original_name}
                    </Text>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Tag color={getFileTypeColor(file.mime_type)}>
                        {file.mime_type.split('/')[1].toUpperCase()}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {formatFileSize(file.file_size)}
                      </Text>
                    </Space>
                  }
                />
              </Card>
            </List.Item>
          )}
        />

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Pagination
            {...pagination}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} of ${total} files`
            }
            onChange={handlePageChange}
            onShowSizeChange={handlePageChange}
          />
        </div>
      </Card>

      <Modal
        title="File Preview"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="copy" onClick={() => previewFile && copyToClipboard(previewFile.url)}>
            Copy URL
          </Button>,
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {previewFile && (
          <div>
            <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
              <Text><strong>File:</strong> {previewFile.original_name}</Text>
              <Text><strong>Type:</strong> {previewFile.mime_type}</Text>
              <Text><strong>Size:</strong> {formatFileSize(previewFile.file_size)}</Text>
              <Text><strong>Uploaded:</strong> {new Date(previewFile.created_at).toLocaleDateString()}</Text>
              {previewFile.alt_text && (
                <Text><strong>Alt Text:</strong> {previewFile.alt_text}</Text>
              )}
              {previewFile.caption && (
                <Text><strong>Caption:</strong> {previewFile.caption}</Text>
              )}
            </Space>
            
            {isImage(previewFile.mime_type) && (
              <Image
                src={previewFile.url}
                alt={previewFile.alt_text || previewFile.filename}
                style={{ maxWidth: '100%' }}
              />
            )}
            
            {previewFile.mime_type.startsWith('video/') && (
              <video
                controls
                style={{ maxWidth: '100%' }}
                src={previewFile.url}
              />
            )}
            
            {previewFile.mime_type.startsWith('audio/') && (
              <audio
                controls
                style={{ width: '100%' }}
                src={previewFile.url}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MediaLibrary;