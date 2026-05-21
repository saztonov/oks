import { useState, type ReactNode } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { themeConfig } from '../theme';

dayjs.locale('ru');

export function AppProviders({ children }: { children: ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false, staleTime: 1000 },
        },
      }),
  );

  return (
    <ConfigProvider locale={ruRU} theme={themeConfig}>
      <AntApp>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
