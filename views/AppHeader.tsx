import { Sparkles, DollarSign } from 'lucide-react';
import { formatCost } from '../services/pricingService';

type AppHeaderProps = {
  displaySensitiveData: boolean;
  totalCost: number;
};

export const AppHeader = ({ displaySensitiveData, totalCost }: AppHeaderProps) => {
  return (
    <header className="relative py-4 md:py-6 border-b border-cyan-500/20 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 animate-fade-in-up">
            <div className="relative p-2 md:p-2.5 bg-black border-2 border-cyan-500 cyber-border pulse-glow">
              <Sparkles className="neon-text-cyan" size={20} />
            </div>
            <div>
              <h1
                className="text-lg md:text-2xl font-bold neon-text-cyan"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                LANDING<span className="neon-text-magenta">AI</span>
              </h1>
              <div
                className="text-[10px] md:text-xs text-cyan-300/60"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                &gt; DESIGN_TERMINAL v3.0
              </div>
            </div>
          </div>
          {displaySensitiveData && (
            <div className="flex items-center gap-3 md:gap-4 animate-fade-in-up stagger-2">
              <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-black/80 border border-cyan-500/30 rounded-sm hover:border-magenta-500/50 transition-all">
                <DollarSign size={16} className="neon-text-yellow" />
                <div className="flex flex-col">
                  <span
                    className="text-[10px] text-cyan-300/60"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    API_COST
                  </span>
                  <span
                    className="text-xs md:text-sm font-bold neon-text-yellow"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {formatCost(totalCost)}
                  </span>
                </div>
              </div>
              <div
                className="hidden md:flex text-xs text-cyan-300/60 items-center gap-2"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <div
                  className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg"
                  style={{ boxShadow: '0 0 10px rgba(0, 255, 0, 0.8)' }}
                ></div>
                SYSTEM_ONLINE
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
