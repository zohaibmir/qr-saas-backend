import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin, Alert } from 'antd';
import {
  UserOutlined,
  QrcodeOutlined,
  FileTextOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../utils/useAuth';
import { adminApi } from '../services/adminApi';
import type { DashboardStats } from '../types/admin';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { admin } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getDashboardStats();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.message || 'Failed to load dashboard statistics');
        }
      } catch {
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        style={{ margin: '20px 0' }}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          Welcome back, {admin?.full_name}!
        </Title>
        <Typography.Text type="secondary">
          Here's what's happening with your QR SaaS platform today.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats?.users.total || 0}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                +{stats?.users.new_today || 0} new today
              </Typography.Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total QR Codes"
              value={stats?.qr_codes.total || 0}
              prefix={<QrcodeOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {stats?.qr_codes.scans_today || 0} scans today
              </Typography.Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Content Items"
              value={(stats?.content.posts || 0) + (stats?.content.pages || 0)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {stats?.content.posts || 0} posts, {stats?.content.pages || 0} pages
              </Typography.Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="API Calls Today"
              value={stats?.system.api_calls_today || 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                Storage: {stats?.system.storage_used || 'N/A'}
              </Typography.Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Activity" size="small">
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Typography.Text type="secondary">
                Activity monitoring coming soon...
              </Typography.Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="System Status" size="small">
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Typography.Text type="secondary">
                System monitoring coming soon...
              </Typography.Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;