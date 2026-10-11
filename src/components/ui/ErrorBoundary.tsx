import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled app error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center bg-paper">
          <div className="paper-card w-full max-w-[420px] p-6 shadow-paper space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <AlertTriangle size={32} />
            </div>

            <h1 className="font-hand text-2xl font-bold text-ink">
              화면을 불러오는 중 문제가 발생했어요
            </h1>

            <p className="text-xs text-ink-soft leading-relaxed">
              아이폰 또는 사파리 캐시 충돌이거나 데이터 로딩 오류일 수 있습니다. 아래 버튼을 눌러 다시 시도해 보세요.
            </p>

            {this.state.error && (
              <div className="rounded-xl bg-slate-50 p-3 text-left font-mono text-[11px] text-rose-600 overflow-x-auto max-h-32">
                <b>오류 원인:</b> {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-primary w-full flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={15} /> 새로고침하기
              </button>
              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="btn-ghost w-full !text-xs !text-rose-500 flex items-center justify-center gap-1"
              >
                <Trash2 size={13} /> 캐시 데이터 초기화 후 다시 열기
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
