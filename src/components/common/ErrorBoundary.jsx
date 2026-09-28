import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-xl my-4 shadow-xs">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-rose-900 mb-1">
            Không thể hiển thị phân hệ giao diện này
          </h3>
          <p className="text-xs text-rose-600 mb-4 font-mono max-w-lg mx-auto bg-white/70 p-2 rounded border border-rose-200">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 text-white rounded-lg text-xs font-semibold hover:bg-rose-800 transition shadow-xs cursor-pointer"
          >
            <RotateCcw size={13} />
            Thử tải lại phân hệ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
