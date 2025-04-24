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
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Download, FileSearch, Trash2, Upload, View } from 'lucide-react';
import { toast } from 'sonner';
import type { LawyerDocument } from './fetch';
// import { fetchLawyerDocuments, deleteDocument, downloadDocument } from './fetch';
import { fetchLawyerDocuments, deleteDocument } from './fetch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

export default function LawyerDocsPage() {
  const [docs, setDocs] = useState<LawyerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof LawyerDocument; direction: 'ascending' | 'descending' } | null>(null);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    setIsLoading(true);
    try {
      const docsData = await fetchLawyerDocuments();
      setDocs(docsData);
    } catch (error) {
      console.error('Error loading docs:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${docTitle}"?`)) return;
    
    try {
      await deleteDocument(docId);
      toast.success('Document deleted successfully');
      setDocs(prev => prev.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // const handleDownload = async (docId: string, docTitle: string) => {
  //   try {
  //     await downloadDocument(docId, docTitle);
  //     toast.success('Download started');
  //   } catch (error) {
  //     console.error('Error downloading document:', error);
  //     toast.error('Failed to download document');
  //   }
  // };

  const handleSort = (key: keyof LawyerDocument) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedDocs = [...docs].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key] || undefined;
    const bValue = b[sortConfig.key] || undefined;
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    if (aValue < bValue) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const filteredDocs = sortedDocs.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.ai_title && doc.ai_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lawyer Documents</h1>
          <p className="text-sm text-muted-foreground">
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} available
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Input
            placeholder="Search documents..."
            className="w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {/* <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button> */}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center gap-1">
                  Title
                  {sortConfig?.key === 'title' && (
                    <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('ai_title')}
              >
                <div className="flex items-center gap-1">
                  AI Title
                  {sortConfig?.key === 'ai_title' && (
                    <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('total_pages')}
              >
                <div className="flex items-center gap-1">
                  Pages
                  {sortConfig?.key === 'total_pages' && (
                    <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created At
                  {sortConfig?.key === 'created_at' && (
                    <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSort('user_name')}
              >
                <div className="flex items-center gap-1">
                  Uploaded By
                  {sortConfig?.key === 'user_name' && (
                    <span>{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  {searchTerm ? 'No documents match your search' : 'No documents available'}
                </TableCell>
              </TableRow>
            ) : (
              filteredDocs.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[180px]">{doc.title}</span>
                      {doc.id === docs[0]?.id && (
                        <Badge variant="secondary">New</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{doc.ai_title || <span className="text-muted-foreground">-</span>}</TableCell>
                  <TableCell>{doc.total_pages}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{doc.created_at ? formatDate(doc.created_at) : 'N/A'}</span>
                      <span className="text-xs text-muted-foreground">
                        {doc.created_at ? new Date(doc.created_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{doc.user_name || 'Unknown user'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          // onClick={() => handlePreview(doc.id, doc.title)}
                          className="gap-2"
                        >
                          <View className="h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          // onClick={() => handleDownload(doc.id, doc.title)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem 
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}