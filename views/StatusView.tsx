import type { CSSProperties } from 'react';
import { AppStatus } from '../types';
import { getStatusMessage } from '../utils/statusMessages';

type StatusViewProps = {
  status: AppStatus;
  displaySensitiveData: boolean;
};

const STATUS_CONFIG: Record<
  AppStatus,
  {
    textClassName: string;
    spinnerStyle?: CSSProperties;
    dotClassName: string;
  }
> = {
  [AppStatus.EXTRACTING_DATA]: {
    textClassName: 'neon-text-cyan',
    dotClassName: 'bg-cyan-400',
  },
  [AppStatus.ANALYZING]: {
    textClassName: 'neon-text-magenta',
    spinnerStyle: { borderTopColor: 'var(--neon-magenta)', borderRightColor: 'var(--neon-cyan)' },
    dotClassName: 'bg-magenta-400',
  },
  [AppStatus.RENDERING_PREVIEW]: {
    textClassName: 'text-purple-400',
    spinnerStyle: { borderTopColor: 'var(--cyber-purple)', borderRightColor: 'var(--neon-yellow)' },
    dotClassName: 'bg-purple-400',
  },
  [AppStatus.REVIEWING_CODE]: {
    textClassName: 'neon-text-yellow',
    spinnerStyle: { borderTopColor: 'var(--neon-yellow)', borderRightColor: 'var(--neon-cyan)' },
    dotClassName: 'bg-yellow-400',
  },
  [AppStatus.APPLYING_FIXES]: {
    textClassName: 'text-green-400',
    spinnerStyle: { borderTopColor: 'var(--neon-green)', borderRightColor: 'var(--neon-magenta)' },
    dotClassName: 'bg-green-400',
  },
  [AppStatus.IDLE]: {
    textClassName: '',
    dotClassName: '',
  },
  [AppStatus.PLAN_REVIEW]: {
    textClassName: '',
    dotClassName: '',
  },
  [AppStatus.GENERATING_IMAGES]: {
    textClassName: '',
    dotClassName: '',
  },
  [AppStatus.GENERATING_CODE]: {
    textClassName: '',
    dotClassName: '',
  },
  [AppStatus.COMPLETED]: {
    textClassName: '',
    dotClassName: '',
  },
  [AppStatus.ERROR]: {
    textClassName: '',
    dotClassName: '',
  },
};

export const StatusView = ({ status, displaySensitiveData }: StatusViewProps) => {
  const config = STATUS_CONFIG[status];
  if (!config || !config.dotClassName) return null;

  const { title, subtitle } = getStatusMessage(status, displaySensitiveData);

  return (
    <div className="flex flex-col items-center justify-center h-64 animate-fade-in">
      <div className="w-20 h-20 cyber-spinner mb-8" style={{ borderWidth: '4px', ...config.spinnerStyle }}></div>
      <p
        className={`text-xl font-medium mb-2 ${config.textClassName}`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </p>
      <p className="text-sm text-cyan-300/60" style={{ fontFamily: 'var(--font-mono)' }}>
        {subtitle}
      </p>
      <div className="mt-6 flex gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse ${config.dotClassName}`}></div>
        <div
          className={`w-2 h-2 rounded-full animate-pulse ${config.dotClassName}`}
          style={{ animationDelay: '0.2s' }}
        ></div>
        <div
          className={`w-2 h-2 rounded-full animate-pulse ${config.dotClassName}`}
          style={{ animationDelay: '0.4s' }}
        ></div>
      </div>
    </div>
  );
};
