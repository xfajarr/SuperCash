import React from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="p-8 max-w-md w-full border-2 border-destructive">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <h2 className="text-2xl font-bold">Something went wrong</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <div className="space-y-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Reload Page
              </Button>
              <Button
                onClick={() => this.setState({ hasError: false })}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </div>
            <details className="mt-4">
              <summary className="text-sm text-muted-foreground cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 text-xs bg-secondary p-2 rounded overflow-auto">
                {this.state.error?.stack}
              </pre>
            </details>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
