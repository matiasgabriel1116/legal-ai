'use client';

import { useEffect, useState } from 'react';
import { Button } from './button';

export function LanguageButtons() {
  const [direction, setDirection] = useState('ltr');

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = direction === 'ltr' ? 'en' : 'ar';
  }, [direction]);

  return (
    <div className="flex gap-1">
      <Button
        variant={direction === 'ltr' ? 'secondary' : 'ghost'}
        onClick={() => setDirection('ltr')}
        size="sm"
      >
        En
      </Button>
      <Button
        variant={direction === 'rtl' ? 'secondary' : 'ghost'}
        onClick={() => setDirection('rtl')}
        size="sm"
      >
        عر
      </Button>
    </div>
  );
}