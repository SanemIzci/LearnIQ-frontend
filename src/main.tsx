import * as React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { store } from '@/store';
import { queryClient } from '@/lib/api/queryClient';
import { bootstrapAuthSession, registerSessionExpiredListener } from '@/lib/api/client';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { router } from '@/routes';
import './index.css';

// Redirect to the appropriate login route when a 401 terminates the session
registerSessionExpiredListener(({ wasSuperAdmin }) => {
  const targetPath = wasSuperAdmin ? '/platform/login?reason=expired' : '/login?reason=expired';
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    void router.navigate(targetPath, { replace: true });
  }
});

// Perform initial silent refresh if a tab-scoped tenant refreshToken exists
void bootstrapAuthSession();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root bulunamadı.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);

