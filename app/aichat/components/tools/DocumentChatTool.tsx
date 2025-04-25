import React from 'react';
import { FileText, CheckCircle } from 'lucide-react';
import { type ToolInvocation } from 'ai';
import type { SearchDocumentsArgs } from '@/app/aichat/types/tooltypes';
import { useLanguage } from '@/components/ui/languageContext';

interface DocumentsToolProps {
  toolInvocation: ToolInvocation;
}

const DocumentsTool: React.FC<DocumentsToolProps> = ({ toolInvocation }) => {
  const args = (toolInvocation.args as SearchDocumentsArgs) || { query: '' };
  const query = args.query || '';

  const { t } = useLanguage();

  const toolHeader = (
    <div className="flex items-center gap-2">
      <FileText className="text-primary" size={18} />
      <span className="text-sm font-medium text-foreground">
        {t('Search uploaded documents')}
      </span>
    </div>
  );

  switch (toolInvocation.state) {
    case 'partial-call':
    case 'call':
      return (
        <div className="my-1 p-2 bg-muted/30 rounded-md">
          {toolHeader}
          <div className="flex items-center gap-2 mt-2">
            <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <span className="text-xs text-muted-foreground">{t('Searching...')}</span>
          </div>
          {query && (
            <div className="mt-2">
              <span
                className={`text-xs ${
                  toolInvocation.state === 'call' ? 'font-bold' : 'font-normal'
                } text-muted-foreground`}
              >
                {t('Keywords:')} {query}
              </span>
            </div>
          )}
        </div>
      );

    case 'result':
      return (
        <div className="my-1 p-2 bg-blue-50/70 rounded-md border border-blue-100">
          {toolHeader}
          <div className="flex items-center gap-2 mt-2">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-xs text-green-600">{t('Search has been completed.')}</span>
          </div>
          {query && (
            <div className="mt-1">
              <span className="text-xs text-muted-foreground">
              {t('Keywords:')} {query}
              </span>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
};

export default DocumentsTool;
