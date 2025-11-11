import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Space, Badge } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PictureOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuth } from '../utils/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { admin, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'content',
      icon: <FileTextOutlined />,
      label: 'Content Management',
      children: [
        {
          key: '/content/posts',
          icon: <EditOutlined />,
          label: 'Blog Posts',
        },
        {
          key: '/content/pages',
          icon: <FileTextOutlined />,
          label: 'Pages',
        },
        {
          key: '/content/media',
          icon: <PictureOutlined />,
          label: 'Media Library',
        },
      ],
    },
    ...(hasPermission('user_management') ? [{
      key: '/users',
      icon: <TeamOutlined />,
      label: 'User Management',
    }] : []),
    ...(hasPermission('analytics_view') ? [{
      key: '/analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    }] : []),
    ...(hasPermission('system_settings') ? [{
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: '/settings/ip-management',
          icon: <SettingOutlined />,
          label: 'IP Management',
        },
        {
          key: '/settings/general',
          icon: <SettingOutlined />,
          label: 'General',
        },
        {
          key: '/settings/security',
          icon: <SettingOutlined />,
          label: 'Security',
        },
      ],
    }] : []),
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/content/')) {
      return [path];
    }
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/content/')) {
      return ['content'];
    }
    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: '#fff',
          boxShadow: '2px 0 8px 0 rgba(29,35,41,.05)',
        }}
      >
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '8px'
        }}>
          {!collapsed ? (
            <Typography.Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              QR SaaS Admin
            </Typography.Title>
          ) : (
            <Typography.Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              QR
            </Typography.Title>
          )}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />

          <Space size="large">
            <Badge count={0} showZero={false}>
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px' }}
              />
            </Badge>

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <Space direction="vertical" size={0}>
                  <Text strong style={{ fontSize: '14px' }}>
                    {admin?.full_name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {admin?.role.replace('_', ' ').toUpperCase()}
                  </Text>
                </Space>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: '24px',
          padding: '24px',
          background: '#fff',
          borderRadius: '8px',
          minHeight: 'calc(100vh - 112px)',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;