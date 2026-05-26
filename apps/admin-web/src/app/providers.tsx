import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
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
        algorithm: antdTheme.darkAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: '#3b82f6',
          colorInfo: '#3b82f6',
          colorSuccess: '#22c55e',
          colorWarning: '#f59e0b',
          colorError: '#ff3b30',
          colorBgBase: '#070b16',
          colorBgLayout: '#070b16',
          colorBgContainer: '#101827',
          colorBgElevated: '#151c2f',
          colorText: '#f8fafc',
          colorTextSecondary: '#94a3b8',
          colorTextTertiary: '#64748b',
          colorBorder: '#1e293b',
          colorBorderSecondary: '#334155',
          boxShadowSecondary: '0 14px 38px rgba(2, 6, 23, 0.45)',
          controlOutline: 'rgba(59,130,246,0.35)',
        },
        components: {
          Layout: {
            headerBg: '#0f172a',
            siderBg: '#0b1020',
            bodyBg: '#070b16',
            triggerBg: '#0f172a',
          },
          Menu: {
            darkItemBg: '#0b1020',
            darkItemHoverBg: '#111827',
            darkItemSelectedBg: 'rgba(59,130,246,0.2)',
            darkItemSelectedColor: '#93c5fd',
            darkSubMenuItemBg: '#0b1020',
          },
          Table: {
            headerBg: '#111827',
            headerColor: '#cbd5e1',
            bodySortBg: '#0f172a',
            rowHoverBg: '#172033',
            borderColor: '#1e293b',
          },
          Card: {
            colorBgContainer: '#101827',
            headerBg: '#101827',
          },
          Modal: {
            contentBg: '#111827',
            headerBg: '#111827',
          },
          Input: {
            colorBgContainer: '#0f172a',
            activeBg: '#0f172a',
            hoverBg: '#0f172a',
          },
          Select: {
            colorBgContainer: '#0f172a',
          },
          DatePicker: {
            colorBgContainer: '#0f172a',
          },
        },
      }}
    >
      <AntdApp>{isRestored ? <QueryClientProvider client={queryClient}>{children}</QueryClientProvider> : null}</AntdApp>
    </ConfigProvider>
  );
}

export const AppProviders = Providers;
