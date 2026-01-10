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
    // Large display for profile pages
    return (
      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
        <div className="text-2xl font-bold text-emerald-600">{pti}</div>
        <div className="text-sm text-gray-600">
          {verified ? (
            <>
              <p className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-600" />
                APTA Verified
              </p>
              <p className="text-xs text-gray-500">Updated weekly from league data</p>
            </>
          ) : (
            <p>PTI Rating</p>
          )}
        </div>
      </div>
    );
  }

  if (size === 'md') {
    // Medium display for cards
    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">{showLabel ? `PTI ${pti}` : pti}</span>
        {verified && (
          <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0">
            <Shield className="w-3 h-3" />
          </Badge>
        )}
      </div>
    );
  }

  // Small/default - inline badge style
  return (
    <Badge variant={verified ? "default" : "outline"} className={verified ? "bg-emerald-100 text-emerald-700 border-emerald-200" : ""}>
      {verified && <Shield className="w-3 h-3 mr-1" />}
      {showLabel ? `PTI ${pti}` : pti}
    </Badge>
  );
};

export default PTIDisplay;
