import * as React from 'react';
import { cn } from '@/lib/utils';

interface MonoProps extends React.HTMLAttributes<HTMLSpanElement> {
  as?: 'span' | 'code' | 'kbd' | 'samp';
}

function Mono({
  className,
  as: Component = 'span',
  ...props
}: MonoProps) {
  return (
    <Component
      className={cn('font-mono text-xs tracking-tight text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Mono };