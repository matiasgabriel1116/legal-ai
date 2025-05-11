import React, { FC, memo, useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { useUpload } from '../context/uploadContext';
import { deleteFilterTagAndDocumentChunks } from '../actions';
import { decodeBase64, encodeBase64 } from '../lib/base64';
import { useLanguage } from '@/components/ui/languageContext';
import { useFormStatus } from 'react-dom';
import { KeyedMutator } from 'swr';

// Lucide Icons
import { Trash, Loader2 } from 'lucide-react';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import ServerUploadPage from './FileUpload';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-100 hover:opacity-80 transition-opacity cursor-pointer"
            disabled={pending}
        >
            {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Trash className="h-4 w-4 text-destructive" />
            )}
        </Button>
    );
}

interface FileInfo {
    name: string;
    updated_at: string;
}

interface RenderFilesSectionProps {
    title: string;
    files: FileInfo[];
    onFileSelect?: (file: string) => void;
    onMutate?: KeyedMutator<any>;
}

const RenderFilesSection: FC<RenderFilesSectionProps> = memo(
    ({ title, files, onFileSelect, onMutate }) => {
        const searchParams = useSearchParams();
        const pathname = usePathname();
        const { selectedBlobs, setSelectedBlobs } = useUpload();
        const { t } = useLanguage();

        if (files.length === 0) return null;

        return (
            <>
                <div className="border-t border-border p-2 mt-auto bg-card">
                    <ServerUploadPage />
                </div>

                <ul className="space-y-0.5 px-1 overflow-y-auto">
                    {files.map((file) => {
                        const formattedDate = format(new Date(file.updated_at), 'yyyy-MM-dd');
                        const filterTag = `${file.name}[[${formattedDate}]]`;
                        const isSelected = selectedBlobs.includes(filterTag);

                        // Get current PDF from URL parameters
                        const currentPdfParam = searchParams.get('pdf');
                        const currentPdf = currentPdfParam
                            ? decodeBase64(decodeURIComponent(currentPdfParam))
                            : null;
                        const isCurrentFile = currentPdf === file.name;

                        const currentParams = new URLSearchParams(searchParams.toString());
                        currentParams.set(
                            'pdf',
                            encodeURIComponent(encodeBase64(file.name))
                        );
                        currentParams.delete('url');
                        const href = `${pathname}?${currentParams.toString()}`;

                        return (
                            <li key={file.name} className="relative group">
                                <Link
                                    href={href}
                                    className={`block p-2 text-[15px] rounded-lg relative
                hover:bg-neutral-200 active:bg-neutral-300 transition-colors duration-150 ${isCurrentFile ? 'bg-muted/80' : ''
                                        }`}
                                    onClick={() => {
                                        if (onFileSelect) {
                                            onFileSelect(file.name);
                                        }
                                    }}
                                >
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => {
                                                                const newFilterTag = `${file.name}[[${formattedDate}]]`;
                                                                if (selectedBlobs.includes(newFilterTag)) {
                                                                    setSelectedBlobs(
                                                                        selectedBlobs.filter(
                                                                            (blob) => blob !== newFilterTag
                                                                        )
                                                                    );
                                                                } else {
                                                                    setSelectedBlobs([
                                                                        ...selectedBlobs,
                                                                        newFilterTag
                                                                    ]);
                                                                }
                                                            }}
                                                            className="border-primary border-2"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-medium text-foreground truncate">
                                                            {file.name.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {format(new Date(file.updated_at), 'PPP')}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-end min-w-[40px]">
                                                        <form
                                                            action={async (formData: FormData) => {
                                                                formData.append(
                                                                    'filePath',
                                                                    encodeBase64(file.name)
                                                                );
                                                                formData.append('filterTag', filterTag);
                                                                await deleteFilterTagAndDocumentChunks(
                                                                    formData
                                                                );
                                                                if (onMutate) {
                                                                    await onMutate();
                                                                }
                                                            }}
                                                        >
                                                            <SubmitButton />
                                                        </form>
                                                    </div>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">{file.name}</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </>
        );
    }
);

RenderFilesSection.displayName = 'RenderFilesSection';

export default RenderFilesSection; 