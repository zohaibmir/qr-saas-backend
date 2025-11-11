import React, { useState, useEffect } from 'react';
import {
  Card,
  Switch,
  Button,
  Space,
  Typography,
  Row,
  Col,
  List,
  Input,
  message,
  Modal,
  Tag,
  Popconfirm,
  Alert,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExclamationCircleOutlined,
  SecurityScanOutlined,
  GlobalOutlined,
  HomeOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import { adminApi } from '../../services/adminApi';
import type { IPConfig, IPTestResult } from '../../types/admin';

const { Title, Text, Paragraph } = Typography;

const IPManagement: React.FC = () => {
  const [config, setConfig] = useState<IPConfig>({
    enabled: false,
    allowedIPs: [],
    allowPrivateNetworks: true,
    allowLocalhost: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [testIP, setTestIP] = useState('');
  const [testResult, setTestResult] = useState<IPTestResult | null>(null);
  const [testModalVisible, setTestModalVisible] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getIPConfig();
      if (response.success && response.data) {
        setConfig(response.data);
      } else {
        message.error('Failed to fetch IP configuration');
      }
    } catch {
      message.error('Failed to fetch IP configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updates: Partial<IPConfig>) => {
    setSaving(true);
    try {
      const response = await adminApi.updateIPConfig(updates);
      if (response.success && response.data) {
        setConfig(response.data);
        message.success('IP configuration updated successfully');
      } else {
        message.error(response.message || 'Failed to update IP configuration');
      }
    } catch {
      message.error('Failed to update IP configuration');
    } finally {
      setSaving(false);
    }
  };

  const addIP = () => {
    if (!newIP.trim()) {
      message.warning('Please enter an IP address');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(newIP)) {
      message.error('Invalid IP address format. Use x.x.x.x or x.x.x.x/xx for CIDR');
      return;
    }

    if (config.allowedIPs.includes(newIP)) {
      message.warning('IP address already exists in the list');
      return;
    }

    const updatedIPs = [...config.allowedIPs, newIP];
    saveConfig({ ...config, allowedIPs: updatedIPs });
    setNewIP('');
  };

  const removeIP = (ip: string) => {
    const updatedIPs = config.allowedIPs.filter(item => item !== ip);
    saveConfig({ ...config, allowedIPs: updatedIPs });
  };

  const testIPAccess = async () => {
    if (!testIP.trim()) {
      message.warning('Please enter an IP address to test');
      return;
    }

    try {
      const response = await adminApi.testIP(testIP);
      if (response.success && response.data) {
        setTestResult(response.data);
        setTestModalVisible(true);
      } else {
        message.error(response.message || 'Failed to test IP address');
      }
    } catch {
      message.error('Failed to test IP address');
    }
  };

  const toggleIPRestrictions = (enabled: boolean) => {
    if (enabled && config.allowedIPs.length === 0 && !config.allowPrivateNetworks && !config.allowLocalhost) {
      Modal.confirm({
        title: 'Warning: No IP addresses allowed',
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        content: 'Enabling IP restrictions without any allowed addresses will block all access. Are you sure?',
        okText: 'Enable Anyway',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => saveConfig({ ...config, enabled }),
      });
    } else if (!enabled) {
      Modal.confirm({
        title: 'Disable IP Restrictions?',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: 'This will allow access from any IP address. Are you sure you want to disable IP restrictions?',
        okText: 'Disable',
        okType: 'danger',
        cancelText: 'Cancel',
        onOk: () => saveConfig({ ...config, enabled }),
      });
    } else {
      saveConfig({ ...config, enabled });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <SecurityScanOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          IP Security Management
        </Title>
        <Paragraph type="secondary">
          Configure IP address restrictions to enhance security by limiting access to authorized networks only.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          {/* Main Configuration */}
          <Card
            title="IP Restriction Settings"
            loading={loading}
            extra={
              <Tag color={config.enabled ? 'red' : 'green'} icon={<SecurityScanOutlined />}>
                {config.enabled ? 'RESTRICTED' : 'OPEN ACCESS'}
              </Tag>
            }
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space direction="vertical" size={4}>
                      <Text strong>Enable IP Restrictions</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        When enabled, only specified IP addresses can access the admin panel
                      </Text>
                    </Space>
                  </Col>
                  <Col>
                    <Switch
                      checked={config.enabled}
                      onChange={toggleIPRestrictions}
                      loading={saving}
                    />
                  </Col>
                </Row>
                
                {config.enabled && (
                  <Alert
                    style={{ marginTop: '12px' }}
                    type="warning"
                    showIcon
                    message="IP restrictions are active"
                    description="Only authorized IP addresses can access this admin panel"
                  />
                )}
              </div>

              <Divider />

              <div>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space direction="vertical" size={4}>
                        <Text strong>
                          <ClusterOutlined style={{ marginRight: '4px' }} />
                          Allow Private Networks
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Allow access from private IP ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Switch
                        checked={config.allowPrivateNetworks}
                        onChange={(checked) => saveConfig({ ...config, allowPrivateNetworks: checked })}
                        loading={saving}
                        disabled={!config.enabled}
                      />
                    </Col>
                  </Row>

                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space direction="vertical" size={4}>
                        <Text strong>
                          <HomeOutlined style={{ marginRight: '4px' }} />
                          Allow Localhost
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Allow access from localhost (127.0.0.1) - useful for development
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Switch
                        checked={config.allowLocalhost}
                        onChange={(checked) => saveConfig({ ...config, allowLocalhost: checked })}
                        loading={saving}
                        disabled={!config.enabled}
                      />
                    </Col>
                  </Row>
                </Space>
              </div>

              <Divider />

              {/* Allowed IP Addresses */}
              <div>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Text strong>
                      <GlobalOutlined style={{ marginRight: '4px' }} />
                      Allowed IP Addresses
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                      ({config.allowedIPs.length} addresses)
                    </Text>
                  </div>

                  <Row gutter={[8, 8]}>
                    <Col flex={1}>
                      <Input
                        placeholder="Enter IP address (e.g., 192.168.1.100 or 192.168.1.0/24)"
                        value={newIP}
                        onChange={(e) => setNewIP(e.target.value)}
                        onPressEnter={addIP}
                        disabled={!config.enabled}
                      />
                    </Col>
                    <Col>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={addIP}
                        disabled={!config.enabled}
                      >
                        Add
                      </Button>
                    </Col>
                  </Row>

                  {config.allowedIPs.length > 0 ? (
                    <List
                      size="small"
                      bordered
                      dataSource={config.allowedIPs}
                      renderItem={(ip) => (
                        <List.Item
                          actions={[
                            <Popconfirm
                              key="delete"
                              title="Remove this IP address?"
                              onConfirm={() => removeIP(ip)}
                              okText="Remove"
                              cancelText="Cancel"
                            >
                              <Button type="text" icon={<DeleteOutlined />} danger size="small" />
                            </Popconfirm>,
                          ]}
                        >
                          <Space>
                            <Tag color="blue">{ip}</Tag>
                            {ip.includes('/') && <Text type="secondary" style={{ fontSize: '12px' }}>(CIDR)</Text>}
                          </Space>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Alert
                      type="info"
                      message="No specific IP addresses configured"
                      description="Access will be determined by the localhost and private network settings above"
                    />
                  )}
                </Space>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* IP Address Tester */}
          <Card title="IP Access Tester" style={{ marginBottom: '24px' }}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text strong>Test IP Address Access</Text>
                <Paragraph type="secondary" style={{ fontSize: '12px', margin: '4px 0 0' }}>
                  Check if a specific IP address would be allowed with current settings
                </Paragraph>
              </div>

              <Input
                placeholder="Enter IP address to test"
                value={testIP}
                onChange={(e) => setTestIP(e.target.value)}
                onPressEnter={testIPAccess}
              />

              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={testIPAccess}
                style={{ width: '100%' }}
              >
                Test Access
              </Button>
            </Space>
          </Card>

          {/* Current Status */}
          <Card title="Current Status">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Restriction Status:</Text>
                <br />
                <Tag color={config.enabled ? 'red' : 'green'} style={{ marginTop: '4px' }}>
                  {config.enabled ? 'ACTIVE' : 'DISABLED'}
                </Tag>
              </div>

              <div>
                <Text type="secondary">Access Rules:</Text>
                <br />
                <Space direction="vertical" size={4} style={{ marginTop: '4px' }}>
                  <Tag color={config.allowLocalhost ? 'green' : 'red'}>
                    Localhost: {config.allowLocalhost ? 'Allowed' : 'Blocked'}
                  </Tag>
                  <Tag color={config.allowPrivateNetworks ? 'green' : 'red'}>
                    Private Networks: {config.allowPrivateNetworks ? 'Allowed' : 'Blocked'}
                  </Tag>
                  <Tag color={config.allowedIPs.length > 0 ? 'blue' : 'orange'}>
                    Specific IPs: {config.allowedIPs.length}
                  </Tag>
                </Space>
              </div>

              {!config.enabled && (
                <Alert
                  type="warning"
                  message="Security Notice"
                  description="IP restrictions are currently disabled. All IP addresses can access the admin panel."
                  showIcon
                  style={{ fontSize: '12px' }}
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Test Result Modal */}
      <Modal
        title="IP Access Test Result"
        open={testModalVisible}
        onCancel={() => setTestModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTestModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {testResult && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Text strong>IP Address: </Text>
              <Tag color="blue">{testResult.ip}</Tag>
            </div>

            <div>
              <Text strong>Access Result: </Text>
              <Tag color={testResult.allowed ? 'green' : 'red'}>
                {testResult.allowed ? 'ALLOWED' : 'BLOCKED'}
              </Tag>
            </div>

            <div>
              <Text strong>Reason: </Text>
              <Text>{testResult.reason}</Text>
            </div>

            {!testResult.allowed && (
              <Alert
                type="error"
                message="Access Denied"
                description="This IP address would be blocked with the current configuration."
                showIcon
              />
            )}

            {testResult.allowed && (
              <Alert
                type="success"
                message="Access Granted"
                description="This IP address would be allowed with the current configuration."
                showIcon
              />
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default IPManagement;