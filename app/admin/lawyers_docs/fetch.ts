'use server';

import { createAdminClient } from '@/lib/server/admin';

export interface LawyerDocument {
  id: string;
  title: string;
  ai_title: string | null;
  ai_description: string | null;
  ai_maintopics: string[] | null;
  ai_keyentities: string[] | null;
  page_number: number;
  total_pages: number;
  created_at: string;
}

export async function fetchLawyerDocuments(): Promise<(LawyerDocument & { user_name?: string })[]> {
  const supabase = createAdminClient();
  
  try {

    // Then fetch users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('role', 'lawyer');

    if (usersError) throw usersError;

    const userIds = users?.map(user => user.id) ?? [];

    // First fetch documents
    const { data: docs, error: docsError } = await supabase
      .from('vector_documents')
      .select('*')
      .eq('chunk_number', 1) // Get only first chunk of each document
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (docsError) throw docsError;
    if (!docs?.length) return [];

    // Create a mapping of user IDs to names
    const userMap = new Map(users?.map(user => [user.id, user.full_name]) ?? new Map());

    // Combine the data
    return docs.map(doc => ({
      ...doc,
      user_name: userMap.get(doc.user_id) || 'Unknown user'
    }));
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw new Error('Failed to fetch documents');
  }
}

// export async function uploadDocument(file: File) {
//   const supabase = createAdminClient();
//   const fileName = encodeURIComponent(file.name.replace(/ /g, '_'));
//   const filePath = `common_docs/${fileName}`;
  
//   // Upload file to storage
//   const { data: uploadData, error: uploadError } = await supabase.storage
//     .from('userfiles')
//     .upload(filePath, file);

//   if (uploadError) throw uploadError;

//   return uploadData;
// }

export async function deleteDocument(docId: string) {
  const supabase = createAdminClient();
  
  // Delete all chunks of the document
  const { error } = await supabase
    .from('vector_documents')
    .delete()
    .eq('id', docId);

  if (error) throw error;
  return true;
}
