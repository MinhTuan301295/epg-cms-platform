import { Button, Card, Form, Input, Typography, App as AntdApp } from 'antd';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../stores/auth.store';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const response = await authService.login(values);
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
      }

      message.error('Invalid email or password');
    }
  };

  return (
    <main className="login-page">
      <Card className="login-card">
        <Typography.Title level={3}>EPG CMS Platform</Typography.Title>
        <Typography.Paragraph type="secondary">
          email: admin@epg.local
          <br />
          password: admin123
        </Typography.Paragraph>
        <Form<LoginFormValues>
          layout="vertical"
          initialValues={{ email: 'admin@epg.local', password: 'admin123' }}
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
            <Input type="email" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            Sign in
          </Button>
        </Form>
      </Card>
    </main>
  );
}
