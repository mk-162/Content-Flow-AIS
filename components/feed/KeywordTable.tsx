import React from 'react';
import { feedColors } from '../../styles/designTokens';

interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface KeywordTableProps {
  keywords: KeywordData[];
  compact?: boolean;
}

// Mock keywords for when no data provided
export const MOCK_KEYWORDS: KeywordData[] = [
  { keyword: 'sustainable manufacturing', volume: 8100, difficulty: 'medium' as const },
  { keyword: 'green manufacturing', volume: 3200, difficulty: 'easy' as const },
  { keyword: 'eco-friendly production', volume: 1400, difficulty: 'easy' as const },
];

const formatVolume = (volume: number): string => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return volume.toString();
};

const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard'): string => {
  switch (difficulty) {
    case 'easy':
      return feedColors.seo.high; // green
    case 'medium':
      return feedColors.seo.medium; // amber
    case 'hard':
      return feedColors.seo.low; // red
    default:
      return feedColors.text.muted;
  }
};

const getDifficultyBgColor = (difficulty: 'easy' | 'medium' | 'hard'): string => {
  switch (difficulty) {
    case 'easy':
      return 'bg-emerald-500/10';
    case 'medium':
      return 'bg-amber-500/10';
    case 'hard':
      return 'bg-red-500/10';
    default:
      return 'bg-zinc-800';
  }
};

export const KeywordTable: React.FC<KeywordTableProps> = ({ keywords, compact = false }) => {
  const displayKeywords = keywords.length > 0 ? keywords : MOCK_KEYWORDS;

  if (compact) {
    // Compact inline format for ReadyCard
    return (
      <div className="flex flex-wrap gap-2">
        {displayKeywords.map((kw, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 text-sm text-[#a1a1aa]"
          >
            <span>{kw.keyword}</span>
            <span className="font-mono text-xs" style={{ color: feedColors.text.muted }}>
              ({formatVolume(kw.volume)})
            </span>
            {idx < displayKeywords.length - 1 && (
              <span className="text-[#3f3f46]">•</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  // Full table format for PitchCard
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 pb-2 border-b border-[#27272a]">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#52525b]">
          Keyword
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#52525b] text-right">
          Volume
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#52525b] text-right">
          Difficulty
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#27272a]">
        {displayKeywords.map((kw, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1fr_auto_auto] gap-4 py-2.5 items-center"
          >
            <span className="text-[15px] font-medium text-[#f4f4f5]">
              {kw.keyword}
            </span>
            <span className="font-mono text-sm font-medium text-[#a1a1aa] text-right">
              {formatVolume(kw.volume)}/mo
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-right ${getDifficultyBgColor(kw.difficulty)}`}
              style={{ color: getDifficultyColor(kw.difficulty) }}
            >
              {kw.difficulty}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
