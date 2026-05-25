import { Button, Card, Form, Input, Typography } from 'antd';

export function LoginPage() {
  return (
    <main className="login-page">
      <Card className="login-card">
        <Typography.Title level={3}>Sign in</Typography.Title>
        <Form layout="vertical">
          <Form.Item label="Email" name="email">
            <Input type="email" autoComplete="email" />
          </Form.Item>
          <Form.Item label="Password" name="password">
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
