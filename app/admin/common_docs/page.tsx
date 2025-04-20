'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { CommonDocument } from './fetch';
import { fetchCommonDocs, deleteDocument } from './fetch';

export default function CommonDocsPage() {
  const [docs, setDocs] = useState<CommonDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const docsData = await fetchCommonDocs();
      setDocs(docsData);
    } catch (error) {
      console.error('Error loading docs:', error);
      toast.error('Failed to load documents');
    }
  };

  // const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const files = e.target.files;
  //   if (!files?.length) return;

  //   setIsLoading(true);
  //   try {
  //     for (const file of files) {
  //       await uploadDocument(file);
  //     }
  //     toast.success('Documents uploaded successfully');
  //     loadDocs();
  //   } catch (error) {
  //     console.error('Error uploading document:', error);
  //     toast.error('Failed to upload document');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(docId);
      toast.success('Document deleted successfully');
      setDocs(prev => prev.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Common Documents</h1>
        {/* <Button asChild>
          <label className="cursor-pointer">
            {isLoading ? 'Uploading...' : 'Upload Document'}
            <input
              type="file"
              className="hidden"
              multiple
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        </Button> */}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>AI Title</TableHead>
            <TableHead>Pages</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Uploaded By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {docs.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.title}</TableCell>
              <TableCell>{doc.ai_title || '-'}</TableCell>
              <TableCell>{doc.total_pages}</TableCell>
              <TableCell>
                {new Date(doc.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>{doc.admin_name || 'Unknown admin'}</TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}