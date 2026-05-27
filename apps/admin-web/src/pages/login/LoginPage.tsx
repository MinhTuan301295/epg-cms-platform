import {
  Button,
  Checkbox,
  Form,
  Input,
  Typography,
  App as AntdApp,
  Space,
} from 'antd';
import {
  CalendarOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    document.body.classList.add('login-screen');
    return () => {
      document.body.classList.remove('login-screen');
    };
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const { email, password } = values;
      const response = await authService.login({ email, password });
      login(response.accessToken, response.user);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          message.error('Cannot connect to API. Please start the API server on port 3001.');
          return;
        }

        if (error.response.status === 404) {
          message.error('Auth API route was not found. Check VITE_API_BASE_URL.');
          return;
        }

        if (error.response.status === 400) {
          const serverMessage =
            typeof error.response.data?.message === 'string'
              ? error.response.data.message
              : Array.isArray(error.response.data?.message)
                ? error.response.data.message.join(', ')
                : 'Invalid login payload';
          message.error(serverMessage);
          return;
        }
      }

      message.error('Invalid email or password');
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-hero">
          <div className="login-branding">
            <img src="/branding/logo.png" alt="FAST Channel CMS" className="login-brand-logo" />
            <Typography.Title level={1} className="login-brand-title">
              FAST Channel CMS
            </Typography.Title>
            <Typography.Paragraph className="login-brand-subtitle">
              Broadcast Operations Platform
            </Typography.Paragraph>
          </div>

          <div className="login-feature-row">
            <div className="login-feature-item">
              <ThunderboltOutlined />
              <strong>Real-time</strong>
              <span>Scheduling</span>
            </div>
            <div className="login-feature-item">
              <CalendarOutlined />
              <strong>Multi-channel</strong>
              <span>Management</span>
            </div>
            <div className="login-feature-item">
              <SafetyCertificateOutlined />
              <strong>Reliable</strong>
              <span>&amp; Secure</span>
            </div>
          </div>

          <Typography.Text className="login-footer-note">
            © 2026 VTVprime. All rights reserved.
          </Typography.Text>
        </div>

        <div className="login-card">
          <Typography.Title level={2} className="login-card-title">
            Welcome Back
          </Typography.Title>
          <Typography.Paragraph className="login-card-subtitle">
            Sign in to continue to FAST Channel CMS
          </Typography.Paragraph>

          <Form<LoginFormValues>
            layout="vertical"
            initialValues={{ email: 'admin@epg.local', password: 'admin123', remember: true }}
            onFinish={handleSubmit}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Email is invalid' },
              ]}
            >
              <Input type="email" autoComplete="email" prefix={<MailOutlined />} />
            </Form.Item>
            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password autoComplete="current-password" prefix={<LockOutlined />} />
            </Form.Item>
            <div className="login-row-meta">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Remember me</Checkbox>
              </Form.Item>
              <a className="login-forgot-link" href="#" onClick={(e) => e.preventDefault()}>
                Forgot password?
              </a>
            </div>
            <Button type="primary" htmlType="submit" block size="large">
              Sign in
            </Button>
          </Form>

          <Space className="login-secure-note">
            <SafetyCertificateOutlined />
            <span>Secure Access · Protected by VTVprime</span>
          </Space>
        </div>
      </section>
    </main>
  );
}
