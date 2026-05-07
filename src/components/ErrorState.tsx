import { AlertTriangle, RefreshCcw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = "Failed to load data.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-destructive/5 border border-destructive/20 rounded-lg mx-4 my-8">
      <AlertTriangle className="w-8 h-8 text-destructive mb-3" />
      <h3 className="font-display font-bold text-lg mb-1">Something went wrong</h3>
      <p className="text-muted-foreground text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground font-medium rounded hover:bg-secondary/80 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" /> Try Again
        </button>
      )}
    </div>
  );
}
