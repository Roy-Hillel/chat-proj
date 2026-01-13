import React from 'react';
import { ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface ActivityItem {
  type: 'tool_start' | 'tool_end' | 'error';
  tool?: string;
  input?: any;
  output?: any;
  error?: string;
  timestamp: number;
}

interface ActivityIndicatorProps {
  activities: ActivityItem[];
}

export function ActivityIndicator({ activities }: ActivityIndicatorProps) {
  if (activities.length === 0) return null;

  return (
    <div className="mx-auto max-w-2xl mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Agent Activity</h4>
      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-start text-xs font-mono">
            <div className="mr-3 mt-0.5">
              {activity.type === 'tool_start' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              {activity.type === 'tool_end' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {activity.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
            <div className="flex-1 overflow-hidden">
              {activity.type === 'tool_start' && (
                <div>
                  <span className="font-bold text-gray-700">Running tool: {activity.tool}</span>
                  <pre className="mt-1 text-gray-500 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(activity.input, null, 2)}
                  </pre>
                </div>
              )}
              {activity.type === 'tool_end' && (
                <div>
                  <span className="font-bold text-gray-700">Tool finished: {activity.tool}</span>
                  <div className="mt-1 text-gray-500 truncate">
                    Output: {typeof activity.output === 'string' ? activity.output : JSON.stringify(activity.output)}
                  </div>
                </div>
              )}
              {activity.type === 'error' && (
                <div className="text-red-600">Error: {activity.error}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
