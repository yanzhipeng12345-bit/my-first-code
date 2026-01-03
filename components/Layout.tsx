import React from 'react';
import { Link, useLocation } from 'wouter';
import { Dumbbell, Calendar, BarChart2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export default function Layout({ children, title }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: '/', icon: Dumbbell, label: '训练' },
    { href: '/history', icon: Calendar, label: '历史' },
    { href: '/stats', icon: BarChart2, label: '分析' },
    { href: '/settings', icon: Settings, label: '设置' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header - Premium Glass Effect */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo Mark */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            {title || 'IRON TRACKER'}
          </h1>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className="text-[9px] text-muted-foreground/50 font-mono">v5.0</div>
          <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-4 pb-24 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation - Premium Glass Effect */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/50 z-50 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "relative flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30",
                  "active:scale-95"
                )}>
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                  )}
                  
                  <item.icon className={cn(
                    "w-5 h-5 transition-all duration-300",
                    isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
                  )} />
                  <span className={cn(
                    "text-[9px] mt-1 font-medium tracking-wide transition-all duration-300",
                    isActive && "text-primary"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
