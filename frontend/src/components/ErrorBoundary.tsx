import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    // Minimal Logging – kann später an Monitoring angebunden werden
    // Kein Senden sensibler Daten
    console.error('Frontend ErrorBoundary:', { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Ein Fehler ist aufgetreten</h3>
          <p>Bitte laden Sie die Seite neu oder versuchen Sie es später erneut.</p>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;


