
import React, { useState, useEffect } from 'react';
import { Post, PostStatus, Category } from '../types';
import { Check, X, Edit3, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  posts: Post[];
  categories: Category[];
  onUpdateStatus: (id: string, status: PostStatus) => void;
  onQueueContent: (post: Post) => void;
}

export const PostReview: React.FC<Props> = ({ posts, categories, onUpdateStatus, onQueueContent }) => {
  const reviewQueue = posts.filter(p => p.status === PostStatus.NEEDS_REVIEW);
  const [activePostIndex, setActivePostIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (activePostIndex >= reviewQueue.length) {
      setActivePostIndex(Math.max(0, reviewQueue.length - 1));
    }
  }, [reviewQueue.length]);

  const activePost = reviewQueue[activePostIndex];
  const category = activePost ? categories.find(c => c.id === activePost.categoryId) : null;

  useEffect(() => {
    if (activePost) {
        setEditContent(activePost.content || "");
        setIsEditing(false);
    }
  }, [activePost]);

  const handleAction = (status: PostStatus) => {
    if (!activePost) return;
    onUpdateStatus(activePost.id, status);
  };

  return (
    <div className="flex h-full bg-[#0f172a] relative overflow-hidden">
      {/* Main Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <AnimatePresence mode='popLayout'>
          {activePost ? (
            <motion.div
              key={activePost.id}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-[#020617] border border-slate-700 flex flex-col h-[85vh]"
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-slate-800 bg-[#020617] shrink-0 flex justify-between items-start">
                 <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <span className="text-cyan-500 text-xs font-bold uppercase tracking-widest">
                             {category?.name || 'Uncategorized'}
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-tight">{activePost.title}</h2>
                 </div>
                 <button onClick={() => setIsEditing(!isEditing)} className="text-slate-500 hover:text-white p-2">
                    <Edit3 size={20}/>
                 </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0f172a]">
                  {activePost.content ? (
                    isEditing ? (
                        <textarea 
                            className="w-full h-full p-4 bg-[#020617] text-slate-300 border border-slate-700 focus:border-cyan-500 outline-none font-mono text-sm leading-relaxed"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                        />
                    ) : (
                        <div className="prose prose-invert prose-slate max-w-none text-slate-300 font-sans leading-loose">
                            <div className="whitespace-pre-wrap">{editContent}</div>
                        </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-4">
                        <Sparkles className="w-12 h-12 opacity-20"/>
                        <button onClick={() => onQueueContent(activePost)} 
                            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-widest"
                        >
                            Generate Content
                        </button>
                    </div>
                  )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-slate-800 bg-[#020617] flex items-center justify-between">
                 <button className="p-3 border border-slate-700 text-slate-500 hover:text-white hover:border-white transition-colors">
                    <RefreshCw size={20} />
                 </button>

                 <div className="flex items-center gap-4">
                    <button 
                        onClick={() => handleAction(PostStatus.REJECTED)}
                        className="px-8 py-3 border border-red-900 text-red-500 hover:bg-red-900/20 font-bold uppercase tracking-widest transition-colors"
                    >
                        Reject
                    </button>
                    
                    <button 
                        onClick={() => handleAction(PostStatus.PUBLISHED)}
                        className="px-10 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-widest transition-colors flex items-center"
                    >
                        Approve <ArrowRight className="ml-2 w-4 h-4"/>
                    </button>
                 </div>
              </div>
            </motion.div>
          ) : (
            <motion.div className="text-center text-slate-500">
                <Check className="w-16 h-16 mx-auto mb-4 text-emerald-500 opacity-50"/>
                <h2 className="text-xl font-bold text-white uppercase tracking-widest mb-2">All Done</h2>
                <p>Queue is empty</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
