import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

/**
 * PTI Display Component - Shows PTI with APTA verification badge if verified
 * @param {number} pti - The PTI value
 * @param {boolean} verified - Whether the PTI is APTA verified
 * @param {string} size - 'sm' | 'md' | 'lg' for different display sizes
 * @param {boolean} showLabel - Whether to show "PTI" label
 */
const PTIDisplay = ({ pti, verified = false, size = 'sm', showLabel = true }) => {
  if (!pti && pti !== 0) return null;

  if (size === 'lg') {
    return (
      <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-400/5 rounded-lg border border-emerald-200 dark:border-emerald-400/20">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{pti}</div>
        <div className="text-sm text-gray-600 dark:text-warm-muted">
          {verified ? (
            <>
              <p className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                APTA Verified
              </p>
              <p className="text-xs text-gray-500 dark:text-warm-muted">Updated weekly from league data</p>
            </>
          ) : (
            <p>PTI Rating</p>
          )}
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900 dark:text-warm">{showLabel ? `PTI ${pti}` : pti}</span>
        {verified && (
          <Badge className="bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 text-xs px-1.5 py-0">
            <Shield className="w-3 h-3" />
          </Badge>
        )}
      </div>
    );
  }

  // Small/default - inline badge style
  return (
    <Badge variant={verified ? "default" : "outline"} className={verified ? "bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-400/20" : ""}>
      {verified && <Shield className="w-3 h-3 mr-1" />}
      {showLabel ? `PTI ${pti}` : pti}
    </Badge>
  );
};

export default PTIDisplay;
