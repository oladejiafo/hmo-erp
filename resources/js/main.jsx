import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './contexts/AuthContext';
import AppRouter from './router/AppRouterX';

// Styles
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import './styles/app.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime:          1000 * 60 * 3, // 3 minutes
            retry:              1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            onError: (error) => {
                if (error.permissionDenied) {
                    console.warn('Permission denied:', error.response?.data?.message);
                }
            },
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <AppRouter />
                    <ToastContainer
                        position="top-right"
                        autoClose={4000}
                        hideProgressBar={false}
                        newestOnTop
                        closeOnClick
                        pauseOnHover
                        theme="light"
                    />
                </AuthProvider>
            </BrowserRouter>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}

const root = createRoot(document.getElementById('app'));
root.render(<App />);