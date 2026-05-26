import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useAuthStore } from '../stores/auth.store';

const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  const restoreAuth = useAuthStore((state) => state.restoreAuth);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    restoreAuth();
    setIsRestored(true);
  }, [restoreAuth]);

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 6,
          colorPrimary: '#1677ff',
        },
      }}
    >
      <AntdApp>{isRestored ? <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> : null}</AntdApp>
    </ConfigProvider>
  );
}

export const AppProviders = Providers;
