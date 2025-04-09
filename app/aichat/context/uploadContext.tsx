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
  uploadFile: (files: File[]) => Promise<void>;
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
  const [uploadFileCount, setUploadFileCount] = useState<number>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [statusSeverity, setStatusSeverity] = useState<string>('info');
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentFileNames, setCurrentFileNames] = useState<string[]>([]);
  const [shouldProcessDoc, setShouldProcessDoc] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);
  const [selectedBlobs, setSelectedBlobs] = useState<string[]>([]);

  const { mutate } = useSWRConfig();

  const { data: processingStatus, error: processingError } = useSWR(
    currentJobId && !shouldProcessDoc ? `/api/checkdoc` : null,
    async (url) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId: currentJobId })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch processing status');
      }
      return response.json();
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: false
    }
  );

  const { data: processDocResult, error: processDocError } = useSWR(
    shouldProcessDoc && currentJobId && currentFileNames.length > 0
      ? ['/api/processdoc', currentJobId, currentFileNames]
      : null,
    async ([url, jobId, fileNames]) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ jobId, fileNames })
      });
      if (!response.ok) {
        throw new Error('Failed to process document');
      }
      return response.json();
    }
  );

  const uploadFile = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      setUploadProgress(0);
      await setUploadFileCount(files.length);
      setUploadStatus(`Uploading ${files.length} file${files.length !== 1 ? 's' : ''}...`);
      setStatusSeverity('info');

      async function getTotalUploadedSize(): Promise<number> {
        const { data, error } = await supabase.storage
          .from('userfiles')
          .list(userId + '/');
        
        if (error) {
          console.error('Error fetching user files:', error);
          return 0;
        }
        
        return data.reduce(
          (total, file) => total + (file.metadata.size || 0),
          0
        );
      }
      
      
      const uploadToSupabase = async (file: File, userId: string) => {
        const fileNameWithUnderscores = file.name.replace(/ /g, '_').trim();
        const encodedFileName = encodeBase64(fileNameWithUnderscores);
        const filePath = `${userId}/${encodedFileName}`;
        
        console.log("OKAY!", filePath);

        const { data, error } = await supabase.storage
          .from('userfiles')
          .upload(filePath, file, { upsert: true });

        if (error) {
          console.error('Error uploading file:', error);
          throw new Error(`Failed to upload file: ${file.name}`);
        }

        if (!data.path) {
          console.error('Upload successful but path is missing');
          throw new Error(`Failed to get path for uploaded file: ${file.name}`);
        }

        return data.path;
      };

      const uploadedFilePaths: string[] = [];

      try {
        const currentTotalSize = await getTotalUploadedSize();
        const newTotalSize = currentTotalSize + files.reduce((sum, file) => sum + file.size, 0);

        if (newTotalSize > MAX_TOTAL_SIZE) {
          throw new Error(
            'Upload would exceed the maximum allowed total size of 150 MB.'
          );
        }

        // Upload all files first
        for (const file of files) {
          const path = await uploadToSupabase(file, userId);
          uploadedFilePaths.push(path);
        }

        const fileNamesWithUnderscores = files.map(file => 
          file.name.replace(/ /g, '_').trim()
        );

        setUploadProgress((prev) => prev + (25 / uploadFileCount));
        setUploadStatus('Preparing files for analysis...');

        const response = await fetch('/api/uploaddoc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            uploadedFiles: fileNamesWithUnderscores.map((name, i) => ({
              name,
              path: uploadedFilePaths[i]
            }))
          })
        });

        if (!response.ok) {
          throw new Error(
            `Error processing files on server: ${response.statusText}`
          );
        }

        const result = await response.json();
        setUploadProgress((prev) => prev + (25 / uploadFileCount));
        setUploadStatus('Analyzing files...');

        if (result.results[0]?.jobId) {
          setCurrentJobId(result.results[0].jobId);
          setCurrentFileNames(files.map(file => file.name));
        } else {
          throw new Error('No job ID received from server.');
        }
      } catch (error) {
        console.error('Error uploading files:', error);

        // Clean up any uploaded files if there was an error
        if (uploadedFilePaths.length > 0) {
          try {
            const { error: deleteError } = await supabase.storage
              .from('userfiles')
              .remove(uploadedFilePaths);

            if (deleteError) {
              console.error(
                'Error deleting files:',
                deleteError
              );
            }
          } catch (deleteError) {
            console.error(
              'Error deleting files:',
              deleteError
            );
          }
        }

        if (error instanceof Error) {
          setUploadStatus(error.message);
        } else {
          setUploadStatus(
            'Error uploading or processing files. Please try again.'
          );
        }
        setStatusSeverity('error');
        setIsUploading(false);
        setCurrentJobId(null);
        setCurrentFileNames([]);
      }
    },
    [userId]
  );

  const resetUploadState = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus('');
    setStatusSeverity('info');
    setCurrentJobId(null);
    setCurrentFileNames([]);
    setShouldProcessDoc(false);
    setSelectedFiles(null);
  };

  useEffect(() => {
    if (processingStatus) {
      if (processingStatus.status === 'SUCCESS') {
        setUploadProgress((prev) => prev + (25 / uploadFileCount));
        setUploadStatus('Finalizing files...');
        setShouldProcessDoc(true);
      } else if (processingStatus.status === 'PENDING') {
        setUploadStatus('Still analyzing files...');
      }
    } else if (processingError) {
      setIsUploading(false);
      setUploadStatus('Error analyzing files.');
      setStatusSeverity('error');
      setCurrentJobId(null);
      setCurrentFileNames([]);
      setShouldProcessDoc(false);
    }

    if (processDocResult) {
      if (processDocResult.status === 'SUCCESS') {
        setIsUploading(false);
        setUploadProgress((prev) => prev + (25 / uploadFileCount));
        setUploadStatus('Files are uploaded and processed.');
        setStatusSeverity('success');
        mutate(`userFiles`);

        setTimeout(() => {
          resetUploadState();
        }, 3000);
      } else {
        // setIsUploading(false);
        // setUploadStatus('Error finalizing files.');
        // setStatusSeverity('error');
        // setCurrentJobId(null);
        // setCurrentFileNames([]);
        // setShouldProcessDoc(false);
        toast.error('Successfully Uploaded, but Processing Document Engine is Not Completed Yet...');
      }
    } else if (processDocError) {
      // setIsUploading(false);
      // setUploadStatus('Error finalizing files.');
      // setStatusSeverity('error');
      // setCurrentJobId(null);
      // setCurrentFileNames([]);
      // setShouldProcessDoc(false);
      toast.error('Successfully Uploaded, but Processing Document Engine is Not Completed Yet...');
    }
  }, [
    processingStatus,
    processingError,
    processDocResult,
    processDocError,
    mutate
  ]);

  const contextValue = useMemo(
    () => ({
      isUploading,
      uploadFile,
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
      uploadFile,
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