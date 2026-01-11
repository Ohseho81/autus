import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 에러 경계 컴포넌트
 * 하위 컴포넌트의 에러를 캐치하고 폴백 UI를 표시
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // TODO: 에러 리포팅 서비스로 전송
    // reportError(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center bg-gray-900 rounded-lg border border-red-500/30">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-400 mb-2">
              오류가 발생했습니다
            </h2>
            <p className="text-gray-400 mb-4 text-sm">
              {this.state.error?.message || '알 수 없는 오류'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              다시 시도
            </button>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4 text-left">
                <summary className="text-gray-500 cursor-pointer text-sm">
                  상세 정보
                </summary>
                <pre className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400 overflow-auto max-h-40">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
