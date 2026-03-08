import React, { useState, useEffect } from 'react';
import { ptiAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Trophy, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const PTIHistoryChart = ({ playerName, currentPti }) => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!playerName) {
        setLoading(false);
        return;
      }

      try {
        const response = await ptiAPI.getHistory(playerName);
        const historyData = response.data.history || [];

        // Format data for chart
        const formattedData = historyData.map((entry) => ({
          date: new Date(entry.recorded_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          fullDate: new Date(entry.recorded_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          pti: entry.pti_value,
        }));

        // Add current PTI as the most recent point if available
        if (currentPti !== null && currentPti !== undefined) {
          formattedData.push({
            date: 'Now',
            fullDate: 'Current',
            pti: currentPti,
          });
        }

        setHistory(formattedData);
      } catch (err) {
        console.error('Failed to fetch PTI history:', err);
        setError('Unable to load PTI history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [playerName, currentPti]);

  // Calculate trend (lower PTI = better)
  const getTrend = () => {
    if (history.length < 2) return null;

    const first = history[0].pti;
    const last = history[history.length - 1].pti;
    const change = last - first;

    if (Math.abs(change) < 0.05) return null;

    // Negative change = PTI went down = improving
    return {
      improving: change < 0,
      change: Math.abs(change).toFixed(1),
    };
  };

  const trend = getTrend();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            PTI History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            PTI History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-gray-500">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            PTI History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">
            No PTI history available yet. History is recorded weekly.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate Y-axis domain with 0.1-point granularity
  const ptiValues = history.map((h) => h.pti);
  const minPti = Math.min(...ptiValues);
  const maxPti = Math.max(...ptiValues);
  const range = maxPti - minPti;
  // Pad by 0.2 minimum so small movements are visible
  const padding = Math.max(0.2, range * 0.15);
  const yMin = Math.floor((minPti - padding) * 10) / 10;
  const yMax = Math.ceil((maxPti + padding) * 10) / 10;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-f4-slate p-2 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg">
          <p className="text-sm text-gray-600 dark:text-warm-muted">{data.fullDate}</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">PTI: {data.pti}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            PTI History
          </CardTitle>
          {trend && (
            <Badge
              variant="secondary"
              className={
                trend.improving
                  ? 'bg-emerald-100 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-100 dark:bg-red-400/10 text-red-700 dark:text-red-400'
              }
            >
              {trend.improving ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {trend.change}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.toFixed(1)}
                tickCount={Math.min(8, Math.round((yMax - yMin) / 0.1) + 1)}
                reversed // Lower PTI is better, so reverse axis
              />
              <Tooltip content={<CustomTooltip />} />
              {currentPti && (
                <ReferenceLine
                  y={currentPti}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="pti"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PTIHistoryChart;
