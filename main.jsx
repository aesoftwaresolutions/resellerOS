import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#171d2b',
              color: '#e2e8f0',
              border: '1px solid rgba(49, 59, 82, 0.6)',
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontFamily: '"IBM Plex Sans", sans-serif',
            },
            success: { iconTheme: { primary: '#22a899', secondary: '#0c0f14' } },
            error: { iconTheme: { primary: '#FF6B6B', secondary: '#0c0f14' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
