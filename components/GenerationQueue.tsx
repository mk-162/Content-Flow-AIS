import React from 'react';
import { GenerationTask, Post, TaskStatus } from '../types';
import { Loader2, CheckCircle, XCircle, Clock, Activity, Layers, Zap, RefreshCw } from 'lucide-react';

interface Props {
  tasks: GenerationTask[];
  posts: Post[];
}

export const GenerationQueue: React.FC<Props> = ({ tasks }) => {
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { [TaskStatus.PROCESSING]: 0, [TaskStatus.QUEUED]: 1, [TaskStatus.COMPLETED]: 2, [TaskStatus.FAILED]: 3 };
    if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
    return (b.startedAt?.toMillis() ?? 0) - (a.startedAt?.toMillis() ?? 0);
  });

  const activeCount = tasks.filter(t => t.status === TaskStatus.PROCESSING).length;
  const queuedCount = tasks.filter(t => t.status === TaskStatus.QUEUED).length;
  const completedToday = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;

  return (
    <div className="flex h-full bg-[#0f172a] p-8">
      <div className="flex-1 max-w-6xl mx-auto">
        
        {/* Stats - Block Design */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard label="WORKERS" value={activeCount > 0 ? 'ACTIVE' : 'IDLE'} icon={<Activity size={24}/>} active={activeCount > 0} color="cyan"/>
          <StatCard label="QUEUE DEPTH" value={queuedCount.toString()} icon={<Layers size={24}/>} color="purple"/>
          <StatCard label="COMPLETED" value={completedToday.toString()} icon={<CheckCircle size={24}/>} color="emerald"/>
        </div>  

        <div className="flex items-center justify-between mb-4 border-b-2 border-slate-800 pb-2">
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">System Queue</h1>
        </div>

        <div className="space-y-2">
            {sortedTasks.length === 0 ? (
                <div className="bg-[#020617] border border-slate-800 p-12 flex flex-col items-center justify-center text-slate-600">
                    <Zap size={48} className="mb-4 opacity-20"/>
                    <span className="font-mono text-sm">NO_ACTIVE_TASKS</span>
                </div>
            ) : (
                sortedTasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, active, icon, color }: any) => {
    const colors: any = {
        cyan: 'text-cyan-400 border-cyan-900 bg-cyan-950/10',
        purple: 'text-purple-400 border-purple-900 bg-purple-950/10',
        emerald: 'text-emerald-400 border-emerald-900 bg-emerald-950/10'
    }
    return (
        <div className={`p-6 border ${colors[color]} flex items-center justify-between relative overflow-hidden`}>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                <h2 className="text-4xl font-mono font-bold tracking-tighter">{value}</h2>
            </div>
            <div className="opacity-50">{icon}</div>
            {active && <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 animate-pulse"/>}
        </div>
    );
};

const TaskCard: React.FC<{ task: GenerationTask }> = ({ task }) => {
  const isRetrying = task.status === TaskStatus.QUEUED && (task.retryCount ?? 0) > 0;
  const isWaitingForRetry = isRetrying && task.nextRetryAt;

  // Calculate time until retry
  const getRetryText = () => {
    if (!task.nextRetryAt) return `Retry #${task.retryCount}`;
    const retryTime = task.nextRetryAt.toDate ? task.nextRetryAt.toDate() : new Date(task.nextRetryAt as any);
    const now = new Date();
    const diffMs = retryTime.getTime() - now.getTime();
    if (diffMs <= 0) return `Retry #${task.retryCount}`;
    const diffMin = Math.ceil(diffMs / 60000);
    return `Retry in ${diffMin}m`;
  };

  const getStatusText = () => {
    if (isWaitingForRetry) return getRetryText();
    if (isRetrying) return `RETRYING #${task.retryCount}`;
    return task.status;
  };

  const getStatusColor = () => {
    if (task.status === TaskStatus.PROCESSING) return 'text-cyan-400';
    if (isRetrying) return 'text-amber-400';
    if (task.status === TaskStatus.FAILED) return 'text-red-400';
    return 'text-slate-500';
  };

  const getIcon = () => {
    if (task.status === TaskStatus.PROCESSING) return <Loader2 size={20} className="animate-spin" />;
    if (task.status === TaskStatus.COMPLETED) return <CheckCircle size={20} />;
    if (task.status === TaskStatus.FAILED) return <XCircle size={20} />;
    if (isRetrying) return <RefreshCw size={20} className={isWaitingForRetry ? '' : 'animate-spin'} />;
    return <Clock size={20} />;
  };

  const getIconColor = () => {
    if (task.status === TaskStatus.PROCESSING) return 'text-cyan-400';
    if (task.status === TaskStatus.COMPLETED) return 'text-emerald-500';
    if (task.status === TaskStatus.FAILED) return 'text-red-500';
    if (isRetrying) return 'text-amber-400';
    return 'text-slate-600';
  };

  return (
    <div className="bg-[#020617] border border-slate-800 p-4 flex items-center justify-between hover:border-slate-600 transition-colors group">
      <div className="flex items-center space-x-6 flex-1">
        <div className={`w-8 h-8 flex items-center justify-center ${getIconColor()}`}>
          {getIcon()}
        </div>

        <div className="flex-1">
          <div className="flex justify-between mb-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-200 text-sm uppercase tracking-wide">{task.type}</h4>
              {task.chainedFromResearch && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-500/20 text-purple-400 rounded flex items-center gap-1">
                  <Zap size={8} /> FROM RESEARCH
                </span>
              )}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
            <span>{task.categoryName}</span>
            {isRetrying && task.lastError ? (
              <span className="text-amber-500 truncate max-w-[200px]" title={task.lastError}>
                {task.lastError.slice(0, 30)}...
              </span>
            ) : task.status === TaskStatus.PROCESSING ? (
              <div className="flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-cyan-400" />
                <span className="text-cyan-400">{Math.round(task.progress)}%</span>
              </div>
            ) : task.status === TaskStatus.COMPLETED ? (
              <span className="text-emerald-400">Complete</span>
            ) : task.status === TaskStatus.FAILED ? (
              <span className="text-red-400">Failed</span>
            ) : (
              <span>Queued</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};