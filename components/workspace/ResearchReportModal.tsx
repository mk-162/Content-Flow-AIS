import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { marked } from 'marked';
import {
  FileText,
  X,
  Copy,
  Check,
  Pencil,
  Sparkles,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { formatRelativeTime } from '../../hooks/useResearchStatus';

// Configure marked for proper rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Strip preamble from research content
const stripPreamble = (content: string): string => {
  let result = content.trim();

  const structuralPatterns = [
    /^#{1,3}\s+/m,
    /^\*\*\d+\./m,
    /^\*\*[A-Z][^*]+\*\*/m,
    /^\d+\.\s+\*\*/m,
  ];

  let firstStructureIndex = -1;
  for (const pattern of structuralPatterns) {
    const match = result.search(pattern);
    if (match !== -1 && (firstStructureIndex === -1 || match < firstStructureIndex)) {
      firstStructureIndex = match;
    }
  }

  if (firstStructureIndex > 50) {
    result = result.substring(firstStructureIndex);
  }

  return result.trim();
};

interface ResearchReportModalProps {
  categoryName: string;
  content: string;
  generatedAt: Date | null;
  isEdited?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  onApplyToContent?: () => void;
  refreshCost?: number;
}

export const ResearchReportModal: React.FC<ResearchReportModalProps> = ({
  categoryName,
  content,
  generatedAt,
  isEdited = false,
  onClose,
  onEdit,
  onRefresh,
  onApplyToContent,
  refreshCost = 20,
}) => {
  const [copied, setCopied] = useState(false);

  // Process and render markdown
  const renderedContent = useMemo(() => {
    const processed = stripPreamble(content);
    return marked.parse(processed) as string;
  }, [content]);

  // Character count
  const charCount = stripPreamble(content).length;

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stripPreamble(content));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-zinc-900 border border-zinc-800 shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Research Report</h2>
                  {isEdited && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium">
                      Edited
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span>{categoryName}</span>
                  {generatedAt && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(generatedAt)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div
              className="prose prose-invert prose-lg max-w-none
                prose-headings:text-white prose-headings:font-bold
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-zinc-800
                prose-h3:text-lg prose-h3:mt-6
                prose-p:text-zinc-300 prose-p:leading-relaxed
                prose-li:text-zinc-300
                prose-strong:text-white
                prose-ul:my-3 prose-li:my-1
                prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs text-zinc-500">
                  {charCount.toLocaleString()} characters
                </span>

                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>

                {/* Edit button */}
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}

                {/* Refresh button */}
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title={`Refresh research (${refreshCost} credits)`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh ({refreshCost} cr)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Close
                </button>

                {onApplyToContent && (
                  <button
                    onClick={onApplyToContent}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    Apply to Content
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResearchReportModal;
