import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, MessageSquare } from 'lucide-react';
import { BrandVoice } from '../../types';

// ============================================================================
// BRAND VOICE EDIT MODAL
// Section 2: UX Flow & Friction Points - Replace pipe-separated format
// ============================================================================

const TONE_OPTIONS = [
  'Professional',
  'Friendly',
  'Authoritative',
  'Casual',
  'Playful',
  'Formal',
  'Empathetic',
  'Confident',
];

const STYLE_OPTIONS = [
  'Conversational',
  'Technical',
  'Educational',
  'Persuasive',
  'Storytelling',
  'Direct',
];

const PERSONALITY_OPTIONS = [
  'Helpful',
  'Expert',
  'Innovative',
  'Trustworthy',
  'Approachable',
  'Bold',
  'Thoughtful',
  'Energetic',
];

interface BrandVoiceEditModalProps {
  isOpen: boolean;
  brandVoice: BrandVoice;
  onSave: (updates: Partial<BrandVoice>) => void;
  onClose: () => void;
}

export const BrandVoiceEditModal: React.FC<BrandVoiceEditModalProps> = ({
  isOpen,
  brandVoice,
  onSave,
  onClose,
}) => {
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);

  // Initialize from brandVoice
  useEffect(() => {
    if (brandVoice) {
      setSelectedTones(brandVoice.tone || []);
      setSelectedStyle(brandVoice.style || '');
      setSelectedPersonality(brandVoice.personality || []);
    }
  }, [brandVoice, isOpen]);

  const toggleTone = (tone: string) => {
    setSelectedTones((prev) =>
      prev.includes(tone) ? prev.filter((t) => t !== tone) : [...prev, tone]
    );
  };

  const togglePersonality = (trait: string) => {
    setSelectedPersonality((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  };

  const handleSave = () => {
    onSave({
      tone: selectedTones,
      style: selectedStyle,
      personality: selectedPersonality,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 w-full max-w-lg shadow-2xl"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500/10 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Edit Brand Voice</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Tone Selection */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Tone (select multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => toggleTone(tone)}
                      className={`
                        px-3 py-1.5 text-sm border transition-all
                        ${
                          selectedTones.includes(tone)
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                        }
                      `}
                    >
                      {selectedTones.includes(tone) && (
                        <Check className="w-3 h-3 inline mr-1.5" />
                      )}
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style Selection */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Writing Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSelectedStyle(style)}
                      className={`
                        px-4 py-2.5 text-sm border transition-all text-left
                        ${
                          selectedStyle === style
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                        }
                      `}
                    >
                      {selectedStyle === style && (
                        <Check className="w-3 h-3 inline mr-1.5" />
                      )}
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personality Selection */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-3">
                  Personality Traits (select multiple)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PERSONALITY_OPTIONS.map((trait) => (
                    <button
                      key={trait}
                      type="button"
                      onClick={() => togglePersonality(trait)}
                      className={`
                        px-3 py-1.5 text-sm border transition-all
                        ${
                          selectedPersonality.includes(trait)
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                        }
                      `}
                    >
                      {selectedPersonality.includes(trait) && (
                        <Check className="w-3 h-3 inline mr-1.5" />
                      )}
                      {trait}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider text-sm transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BrandVoiceEditModal;
