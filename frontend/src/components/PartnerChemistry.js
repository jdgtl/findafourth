import React, { useState, useEffect } from 'react';
import { playerAPI, tenniscoresAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { getProfileImageUrl } from '@/lib/utils';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Loader2,
  Trophy,
  Handshake,
} from 'lucide-react';

const PartnerChemistry = ({ playerId, playerName }) => {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [partners, setPartners] = useState([]);
  const [ptiTrend, setPtiTrend] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [chemistryRes, historyRes] = await Promise.all([
        playerAPI.getPartnerChemistry(playerId),
        playerAPI.getMatchHistory(playerId),
      ]);

      setPartners(chemistryRes.data.partners || []);
      setLastUpdated(chemistryRes.data.last_calculated);

      if (historyRes.data.pti_trend) {
        setPtiTrend(historyRes.data.pti_trend);
      }
      if (historyRes.data.match_history) {
        setMatchCount(historyRes.data.match_history.match_count || 0);
      }
    } catch (err) {
      // Data might not exist yet - that's okay
      console.log('No partner data yet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) {
      fetchData();
    }
  }, [playerId]);

  const handleImport = async () => {
    try {
      setImporting(true);
      setError('');
      await tenniscoresAPI.scrapePlayer(playerName);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to import data. Try running rankings sync first.');
    } finally {
      setImporting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTrendIcon = () => {
    if (!ptiTrend || ptiTrend.diff === null) return null;
    const diff = ptiTrend.diff;
    // Lower PTI is better, so negative diff means improvement
    if (diff < -1) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (diff > 1) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendLabel = () => {
    if (!ptiTrend || ptiTrend.diff === null) return null;
    const diff = ptiTrend.diff;
    if (diff < -1) return 'Improving';
    if (diff > 1) return 'Declining';
    return 'Stable';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5" />
            Partner Chemistry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5" />
              Partner Chemistry
            </CardTitle>
            <CardDescription>
              {matchCount > 0 ? `Based on ${matchCount} matches` : 'Import your match history'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-1 hidden sm:inline">
              {partners.length > 0 ? 'Refresh' : 'Import'}
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {/* PTI Trend */}
        {ptiTrend && ptiTrend.current !== null && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <div>
                <span className="text-sm text-gray-500">Season PTI</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{ptiTrend.current}</span>
                  {ptiTrend.start !== null && (
                    <span className="text-sm text-gray-400">
                      from {ptiTrend.start}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {getTrendIcon() && (
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon()}
                <span className={`
                  ${ptiTrend.diff < -1 ? 'text-emerald-600' : ''}
                  ${ptiTrend.diff > 1 ? 'text-red-500' : ''}
                  ${Math.abs(ptiTrend.diff) <= 1 ? 'text-gray-500' : ''}
                `}>
                  {getTrendLabel()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Partner List */}
        {partners.length > 0 ? (
          <div className="space-y-3">
            {partners.slice(0, 5).map((partner, idx) => (
              <div
                key={partner.partner_name}
                className="flex items-center gap-3"
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={getProfileImageUrl(partner.profile_image_url)} />
                    <AvatarFallback className={partner.is_registered ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}>
                      {getInitials(partner.partner_name)}
                    </AvatarFallback>
                  </Avatar>
                  {idx === 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">1</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {partner.partner_name}
                    </span>
                    {partner.is_registered && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Member
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{partner.matches_played} matches</span>
                    <span>-</span>
                    <span>{partner.wins}W / {partner.losses}L</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${
                    partner.win_rate >= 60 ? 'text-emerald-600' :
                    partner.win_rate >= 40 ? 'text-gray-700 dark:text-gray-300' :
                    'text-red-500'
                  }`}>
                    {partner.win_rate}%
                  </div>
                  <Progress
                    value={partner.win_rate}
                    className="h-1.5 w-16"
                  />
                </div>
              </div>
            ))}
            {partners.length > 5 && (
              <p className="text-xs text-gray-500 text-center">
                +{partners.length - 5} more partners
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No partner data yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click Import to sync from Tenniscores
            </p>
          </div>
        )}

        {lastUpdated && (
          <p className="text-xs text-gray-400 text-center">
            Last updated: {new Date(lastUpdated).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PartnerChemistry;
