import React, { useCallback, useRef, useState } from 'react';
import type { FileRejection, FileWithPath } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { useUpload } from '../context/uploadContext';
import {
  Loader2,
  Upload as CloudUploadIcon,
  X as CloseIcon,
  FileText as DescriptionIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useLanguage } from '@/components/ui/languageContext';

const SUPPORTED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf', '.PDF'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
    '.DOCX'
  ],
  'image/jpeg': ['.jpg', '.jpeg', '.JPG', '.JPEG'],
  'image/png': ['.png', '.PNG']
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB in bytes
const MAX_TOTAL_FILES = 10; // Maximum number of files to upload at once

function LinearProgressWithLabel({
  value,
  status
}: {
  value: number;
  status: string;
}) {
  const { t } = useLanguage();
  const statusesWithSpinner = [
    'Initializing...',
    'Uploading...',
    'Analyzing...',
    'Saving to Database...',
  ];

  const shouldShowSpinner = statusesWithSpinner.includes(status);

  return (
    <>
      <div className="flex items-center w-full mb-1">
        <div className="w-full mr-1">
          <Progress
            value={value}
            className="h-1.5 bg-muted [&>div]:bg-primary [&>div]:transition-transform [&>div]:duration-400 [&>div]:ease-linear rounded-md"
          />
        </div>
        <div className="min-w-[35px]">
          <p className="text-sm text-muted-foreground">{`${Math.round(
            value
          )}%`}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-1 min-h-[20px]">
        <p className="text-sm text-muted-foreground font-medium flex items-center gap-1 transition-opacity duration-300">
          {t(status as any)}
          {shouldShowSpinner && (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
        </p>
      </div>
    </>
  );
}

export default function ServerUploadPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const {
    isUploading,
    uploadFiles,
    uploadProgress,
    uploadStatus,
    statusSeverity,
    selectedFiles,
    setSelectedFiles
  } = useUpload();

  const validateFile = useCallback(
    (file: FileWithPath | null, fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        fileRejections.forEach((rejection) => {
          rejection.errors.forEach((error) => {
            if (error.code === 'file-too-large') {
              alert(`File is too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
            } else if (error.code === 'file-invalid-type') {
              alert('File type not supported. Please upload PDF or DOCX files.');
            }
          });
        });
        return false;
      }
      return true;
    },
    []
  );

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[], fileRejections: FileRejection[]) => {
      if (!validateFile(acceptedFiles[0], fileRejections)) return;

      const newFiles = acceptedFiles.slice(0, MAX_TOTAL_FILES - (selectedFiles?.length || 0));
      if (newFiles.length < acceptedFiles.length) {
        alert(`You can upload up to ${MAX_TOTAL_FILES} files at once.`);
      }

      // const today = new Date();
      // const formattedDate = format(today, 'yyyy-MM-dd');
      // const updatedFiles = newFiles.map(file => ({
      //   ...file,
      //   update_at: formattedDate
      // }));

      // setSelectedFiles(prev => [...(prev || []), ...updatedFiles]);
      // console.log("@@@ updatedFiles => ", updatedFiles)
      setSelectedFiles(prev => [...(prev || []), ...newFiles]);
    },
    [selectedFiles, setSelectedFiles, validateFile]
  );

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev?.filter((_, i) => i !== index) || null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      await uploadFiles(selectedFiles);
    } finally {
      formRef.current?.reset();
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: SUPPORTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true
  });

  const { t } = useLanguage();

  return (
    <form
      className="w-full bg-background"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div>
        <div
          {...getRootProps()}
          className={`min-h-[40px] border border-dashed ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary hover:bg-primary/5'
          } rounded-lg flex items-center justify-center text-center cursor-pointer p-2 mb-2 transition-all duration-200`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-1">
            <CloudUploadIcon
              className={`w-5 h-5 ${
                isDragActive ? 'text-primary' : 'text-foreground'
              } transition-colors duration-200`}
            />
            <div className="text-xs text-muted-foreground">
              {t('Drag files here')} {t('Or')} 
              <Button
                variant="link"
                className="text-xs text-primary p-0 h-auto font-normal hover:text-primary/80 ml-1"
                type="button"
              >
                {t('Browse')}
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground/80">
              PDF, DOCX, JPG, PNG ({t('Max')} {MAX_TOTAL_FILES})
            </div>
          </div>
        </div>

        <div className="relative">
          <AnimatePresence mode="popLayout">
            {selectedFiles && selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1 mb-2"
              >
                {selectedFiles.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    layout="position"
                  >
                    <Card className="bg-card/50 p-2 rounded-md shadow-none">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center text-primary">
                            <DescriptionIcon className="h-3 w-3" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground truncate leading-tight">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(index);
                          }}
                          disabled={isUploading}
                          className="text-foreground hover:text-primary flex-shrink-0 h-6 w-6 p-0"
                        >
                          <CloseIcon className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectedFiles && selectedFiles.length > 0 && (
          <div className="mt-1 sticky bottom-0 bg-background pt-1">
            <LinearProgressWithLabel
              value={uploadProgress}
              status={uploadStatus}
            />
            {uploadStatus && statusSeverity !== 'info' && (
              <Alert
                variant={statusSeverity === 'error' ? 'destructive' : 'default'}
                className="mt-1 rounded-md text-xs p-2"
              >
                <AlertDescription>{uploadStatus}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>

      <Button
        type="submit"
        disabled={isUploading || !selectedFiles || selectedFiles.length === 0}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium rounded-md h-8 disabled:opacity-50 mt-2"
      >
        <CloudUploadIcon className="mr-1 h-3 w-3" />
        {isUploading
          ? `${t('Uploading')} ${selectedFiles?.length || 0} ${t('file')}${selectedFiles?.length !== 1 ? 's' : ''}...`
          : `${t('Upload')} ${selectedFiles?.length || 0} ${t('file')}${selectedFiles?.length !== 1 ? 's' : ''}`}
      </Button>
    </form>
  );
}