import * as React from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { extractErrorMessage } from '@/lib/api/error-parser';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  public render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl p-6">
          <Alert variant="destructive" title="Beklenmeyen Uygulama Hatası">
            <p className="mb-3">{extractErrorMessage(this.state.error)}</p>
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Tekrar Dene
            </Button>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

