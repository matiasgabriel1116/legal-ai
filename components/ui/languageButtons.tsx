'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from './languageContext';
import { Languages } from 'lucide-react';

export function LanguageButtons() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleLanguage} className="relative">
      <Languages className="h-4 w-4" />
      <span className="sr-only">Toggle language</span>
      <span className="absolute -top-1 -right-1 text-xs">{language.toUpperCase()}</span>
    </Button>
  );
}