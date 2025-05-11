'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';
import useSWRImmutable from 'swr/immutable';
import { createClient } from '@/lib/client/client';
import Link from 'next/link';
import { decodeBase64 } from '../lib/base64';
import { useSearchParams, useRouter } from 'next/navigation';

const supabase = createClient();

const fetcher = async (
  fileName: string,
  userId: string,
  fileExtension: string
) => {
  const decodedFileName = decodeURIComponent(fileName);
  const filePath = `${userId}/${decodedFileName}`;

  if (fileExtension === 'pdf') {
    const { data, error } = await supabase.storage
      .from('userfiles')
      .download(filePath);

    if (error) {
      console.error('Error downloading PDF:', error);
      return null;
    }

    const blob = new Blob([data], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  } else if (['doc', 'docx'].includes(fileExtension)) {
    const { data, error } = await supabase.storage
      .from('userfiles')
      .createSignedUrl(filePath, 300);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } else if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
    const { data, error } = await supabase.storage
      .from('userfiles')
      .createSignedUrl(filePath, 300);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  }
  throw new Error('Unsupported file type');
};

export default function DocumentViewer({
  fileName,
  userId,
  hasActiveSubscription
}: {
  fileName: string;
  userId: string | undefined;
  hasActiveSubscription: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClose = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('pdf');
    url.searchParams.delete('p');
    router.replace(url.pathname + url.search);
  };

  const decodedFileName = decodeURIComponent(decodeBase64(fileName));
  console.log('Decoded file name:', decodedFileName);
  const fileExtension = decodedFileName.split('.').pop()?.toLowerCase() ?? '';
  const page = Number(searchParams.get('p')) || 1;
  const {
    data: fileUrl,
    error,
    isLoading
  } = useSWRImmutable(
    userId && hasActiveSubscription ? [fileName, userId, fileExtension] : null,
    ([fileName, userId, fileExtension]) =>
      fetcher(fileName, userId, fileExtension)
  );

  if (!userId || !hasActiveSubscription) {
    return (
      <div className="flex flex-col justify-center items-center h-[97vh] text-center">
        <p className="text-foreground text-base">
          You need to be logged in with an active subscription to view this
        </p>
        <Button asChild className="mt-2">
          <Link href="/signin">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    console.error('Error loading document:', error);
    return (
      <div className="flex flex-col justify-center items-center h-[97vh] text-center">
        <p className="text-foreground text-base">
          There was an error loading the document. Please try again later.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-[55%] border-l border-border hidden sm:flex flex-col justify-center items-center h-[97vh] text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div className="flex flex-col justify-center items-center h-[97vh] text-center">
        <p className="text-foreground text-base">No file available.</p>
      </div>
    );
  }

  const isPdf = fileExtension === 'pdf';
  const isOfficeDocument = ['doc', 'docx'].includes(fileExtension);
  const isImage = ['jpg', 'jpeg', 'png'].includes(fileExtension);
  const iframeId = `document-viewer-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`;

  return (
    <div className="w-[45%] border-l border-border hidden lg:flex flex-col overflow-hidden h-screen bg-background">
      <div className="flex items-center justify-between p-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h3 className="text-sm font-medium text-foreground truncate px-2">
          {decodedFileName}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 relative w-full overflow-hidden">
        {isPdf && (
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/40 to-transparent h-10 z-10 dark:from-background/60" />
        )}

        {isPdf ? (
          <iframe
            key={`pdf-viewer-${page}`}
            id={iframeId}
            src={`${fileUrl}#page=${page}`}
            className="w-full h-full border-none"
            title="PDF Viewer"
            referrerPolicy="no-referrer"
            aria-label={`PDF document: ${decodedFileName}`}
          />
        ) : isOfficeDocument ? (
          <iframe
            id={iframeId}
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              fileUrl
            )}`}
            className="w-full h-full border-none"
            title="Office Document Viewer"
            referrerPolicy="no-referrer"
            aria-label={`Office document: ${decodedFileName}`}
          />
        ) : isImage ? (
          <div className="w-full h-full flex items-center justify-center p-4 bg-muted/30">
            <img
              src={fileUrl}
              alt={decodedFileName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-foreground text-base">
              This file type is not supported.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
