'use client';

import React, { useState, useEffect } from 'react';

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({
  children,
  className = '',
}: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={`page-transition ${className}`}
      style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 200ms ease-in-out',
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
}
