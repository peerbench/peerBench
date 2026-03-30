function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "\u2014";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatScore(score: number | null): string {
  if (score === null) return "\u2014";
  return (score * 100).toFixed(1) + "%";
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 0.9) return "text-green-600 font-semibold";
  if (score >= 0.7) return "text-blue-600";
  if (score >= 0.5) return "text-yellow-600";
  return "text-red-600";
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return mins === 1 ? "1 min" : `${mins} min`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  const days = Math.floor(seconds / 86400);
  return days === 1 ? "Daily" : `${days} days`;
}

export {
  formatTimeAgo,
  formatDate,
  formatDuration,
  formatScore,
  getScoreColor,
  formatInterval,
};
