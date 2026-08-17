interface ToolDataStatusProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ToolDataStatus({ loading, error, onRetry }: ToolDataStatusProps) {
  if (loading) {
    return (
      <div className="tool-data-status" role="status">
        <span className="tool-data-status__bar" />
        <span>計算用データを読み込んでいます</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="tool-data-status tool-data-status--error" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onRetry}>再試行</button>
      </div>
    );
  }
  return null;
}
