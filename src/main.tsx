import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  {children: React.ReactNode},
  ErrorBoundaryState
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, errorMessage: ''};
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Errore imprevisto durante il caricamento.'
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '24px', fontFamily: 'system-ui, sans-serif', maxWidth: '480px', margin: '40px auto'}}>
          <h1 style={{fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#0f172a'}}>
            Si è verificato un errore
          </h1>
          <p style={{fontSize: '13px', color: '#475569', marginBottom: '16px'}}>
            {this.state.errorMessage}
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem('syringe_data');
              } catch {
                // ignore
              }
              window.location.reload();
            }}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Ripristina e Ricarica
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
