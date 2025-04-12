'use client';
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import { createClient } from '@/lib/client/client';
import { encodeBase64 } from '../lib/base64';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';

interface UploadContextType {
  isUploading: boolean;
  uploadFiles: (files: File[]) => Promise<void>;
  uploadProgress: number;
  uploadStatus: string;
  statusSeverity: string;
  selectedFiles: File[] | null;
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[] | null>>;
  selectedBlobs: string[];
  setSelectedBlobs: (blobs: string[]) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const MAX_TOTAL_SIZE = 150 * 1024 * 1024;
const supabase = createClient();

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider: React.FC<{
  children: React.ReactNode;
  userId: string;
}> = ({ children, userId }) => {
  // Maintain all original state variables
  const [uploadFileCount, setUploadFileCount] = useState<number>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [statusSeverity, setStatusSeverity] = useState<string>('info');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [shouldProcessDoc, setShouldProcessDoc] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [selectedBlobs, setSelectedBlobs] = useState<string[]>([]);

  const { mutate } = useSWRConfig();

  // Helper function to update upload status
  const updateUploadStatus = (status: string, severity: string = 'info') => {
    setUploadStatus(status);
    setStatusSeverity(severity);
    console.debug(`[Upload Status] ${severity.toUpperCase()}: ${status}`);
  };

  // Get total uploaded size (original functionality maintained)
  const getTotalUploadedSize = useCallback(async (): Promise<number> => {
    try {
      const { data, error } = await supabase.storage
        .from('userfiles')
        .list(userId + '/');
      
      if (error) {
        console.error('Error fetching user files:', error);
        return 0;
      }
      
      return data.reduce(
        (total, file) => total + (file.metadata?.size || 0),
        0
      );
    } catch (error) {
      console.error('Error in getTotalUploadedSize:', error);
      return 0;
    }
  }, [userId]);

  // Maintain original uploadToSupabase function with enhanced error handling
  const uploadToSupabase = useCallback(async (file: File, userId: string): Promise<string> => {
    try {
      const fileNameWithUnderscores = file.name.replace(/ /g, '_').trim();
      const encodedFileName = encodeBase64(fileNameWithUnderscores);
      const filePath = `${userId}/${encodedFileName}`;

      console.debug('Uploading file to path:', filePath);

      const { data, error } = await supabase.storage
        .from('userfiles')
        .upload(filePath, file, { upsert: true });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      if (!data?.path) {
        throw new Error('Upload successful but path is missing');
      }

      return data.path;
    } catch (error) {
      console.error('Error in uploadToSupabase:', error);
      throw error; // Re-throw to be handled by caller
    }
  }, []);

  // Maintain original uploadFiles function with enhanced structure
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadFileCount(files.length);
    updateUploadStatus(`Uploading ${files.length} file${files.length !== 1 ? 's' : ''}...`);

    const uploadedFilePaths: string[] = [];

    try {
      // Check storage quota
      const currentTotalSize = await getTotalUploadedSize();
      const newTotalSize = currentTotalSize + files.reduce((sum, file) => sum + file.size, 0);

      if (newTotalSize > MAX_TOTAL_SIZE) {
        throw new Error('Upload would exceed the maximum allowed total size of 150MB');
      }

      // Upload all files
      for (const [index, file] of files.entries()) {
        const path = await uploadToSupabase(file, userId);
        uploadedFilePaths.push(path);
        setUploadProgress(prev => prev + (25 / files.length));
        updateUploadStatus(`Uploading file ${index + 1} of ${files.length}...`);
      }

      // Process files
      updateUploadStatus('Preparing files for analysis...');
      const fileNamesWithUnderscores = files.map(file => file.name.replace(/ /g, '_').trim());

      for (const [index, fileName] of fileNamesWithUnderscores.entries()) {
        const response = await fetch('/api/uploaddoc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fileName,       // Direct property
            path: uploadedFilePaths[index]  // Direct property
          })
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();
        console.log("@@@ result => ", result)
        setUploadProgress(prev => prev + (25 / files.length));
        
        if (result.jobId) {
          setCurrentJobId(result.jobId);
          setCurrentFileName(fileName);
        } else {
          throw new Error('No job ID received from server');
        }
      }

      updateUploadStatus('Analyzing files...');
    } catch (error) {
      console.error('Error in uploadFiles:', error);

      // Cleanup uploaded files on error
      if (uploadedFilePaths.length > 0) {
        try {
          await supabase.storage
            .from('userfiles')
            .remove(uploadedFilePaths);
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }

      updateUploadStatus(
        error instanceof Error ? error.message : 'Upload failed',
        'error'
      );
      setIsUploading(false);
      setCurrentJobId(null);
      setCurrentFileName('');
    }
  }, [getTotalUploadedSize, uploadToSupabase, userId]);

  // Maintain original reset function
  const resetUploadState = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus('');
    setStatusSeverity('info');
    setCurrentJobId(null);
    setCurrentFileName('');
    setShouldProcessDoc(false);
    setSelectedFiles(null);
  }, []);

  // Maintain original SWR hooks
  const { data: processingStatus, error: processingError } = useSWR(
    currentJobId && !shouldProcessDoc ? `/api/checkdoc` : null,
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: currentJobId })
      });
      if (!response.ok) throw new Error('Failed to fetch processing status');
      return response.json();
    },
    { refreshInterval: 5000, revalidateOnFocus: false }
  );

  const { data: processDocResult, error: processDocError } = useSWR(
    shouldProcessDoc && currentJobId && currentFileName
      ? ['/api/processdoc', currentJobId, currentFileName]
      : null,
    async ([url, jobId, fileName]) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, fileName })
      });

      if (!response.ok) throw new Error('Failed to process document');
      return response.json();
    }
  );

  // Maintain original effects with enhanced error handling
  useEffect(() => {
    if (processingStatus) {
      if (processingStatus.status === 'SUCCESS') {
        setUploadProgress(prev => prev + (25 / uploadFileCount));
        updateUploadStatus('Finalizing files...');
        setShouldProcessDoc(true);
      } else if (processingStatus.status === 'PENDING') {
        updateUploadStatus('Still analyzing files...');
      }
    } else if (processingError) {
      setIsUploading(false);
      updateUploadStatus('Error analyzing files', 'error');
      setCurrentJobId(null);
      setCurrentFileName('');
      setShouldProcessDoc(false);
    }
  }, [processingStatus, processingError, uploadFileCount]);

  useEffect(() => {
    if (processDocResult) {
      if (processDocResult.status === 'SUCCESS') {
        setIsUploading(false);
        setUploadProgress(prev => prev + (25 / uploadFileCount));
        updateUploadStatus('Files uploaded and processed', 'success');
        mutate(`userFiles`);

        setTimeout(() => {
          resetUploadState();
        }, 3000);
      } else {
        setIsUploading(false);
        updateUploadStatus('Error finalizing files', 'error');
        setCurrentJobId(null);
        setCurrentFileName('');
        setShouldProcessDoc(false);
      }
    } else if (processDocError) {
      setIsUploading(false);
      updateUploadStatus('Error finalizing files', 'error');
      setCurrentJobId(null);
      setCurrentFileName('');
      setShouldProcessDoc(false);
    }
  }, [processDocResult, processDocError, uploadFileCount, mutate, resetUploadState]);

  // Maintain original context value structure
  const contextValue = useMemo<UploadContextType>(
    () => ({
      isUploading,
      uploadFiles,
      uploadProgress,
      uploadStatus,
      statusSeverity,
      selectedFiles,
      setSelectedFiles,
      selectedBlobs,
      setSelectedBlobs
    }),
    [
      isUploading,
      uploadFiles,
      uploadProgress,
      uploadStatus,
      statusSeverity,
      selectedFiles,
      selectedBlobs
    ]
  );

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
};