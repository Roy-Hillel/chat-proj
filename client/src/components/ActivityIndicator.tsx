import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface ActivityItem {
  type: "tool_start" | "tool_end" | "error";
  tool?: string;
  input?: any;
  output?: any;
  error?: string;
  timestamp: number;
}

interface ActivityIndicatorProps {
  activities: ActivityItem[];
}

// Format tool name for display (e.g., "get_watchlist" -> "Get Watchlist")
function formatToolName(toolName: string): string {
  return toolName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ActivityIndicator({ activities }: ActivityIndicatorProps) {
  if (activities.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
      <div className="space-y-2">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-center text-sm">
            <div className="mr-2">
              {activity.type === "tool_start" && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              )}
              {activity.type === "tool_end" && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              {activity.type === "error" && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="text-gray-600">
              {activity.type === "tool_start" && (
                <span>
                  Using{" "}
                  <span className="font-medium text-gray-800">
                    {formatToolName(activity.tool || "")}
                  </span>
                  ...
                </span>
              )}
              {activity.type === "tool_end" && (
                <span>
                  <span className="font-medium text-gray-800">
                    {formatToolName(activity.tool || "")}
                  </span>{" "}
                  completed
                </span>
              )}
              {activity.type === "error" && (
                <span className="text-red-600">Error occurred</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
