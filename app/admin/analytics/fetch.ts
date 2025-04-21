'use server';

import { createAdminClient } from '@/lib/server/admin';

export interface DocumentStats {
  user_id: string;
  user_full_name: string;
  total_pages: number;
}

export interface TimelineStats {
  date: string;
  admin_uploads: number;
  user_uploads: number;
}

export async function fetchUserDocumentStats(): Promise<DocumentStats[]> {
  const supabase = createAdminClient();
  
  try {
    // First fetch all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, full_name');
    
    if (usersError) throw usersError;
    if (!allUsers?.length) return [];

    // Then fetch document statistics
    const { data: documents, error: docsError } = await supabase
      .from('vector_documents')
      .select('user_id, total_pages');
    
    if (docsError) throw docsError;

    // Create a map of user_id to total_pages
    const pagesMap = new Map<string, number>();
    documents?.forEach(doc => {
      const current = pagesMap.get(doc.user_id) || 0;
      pagesMap.set(doc.user_id, current + (doc.total_pages || 0));
    });

    // Combine with all users data
    const result = allUsers.map(user => ({
      user_id: user.id,
      user_full_name: user.full_name || 'Unknown',
      total_pages: pagesMap.get(user.id) || 0 // Default to 0 if no documents
    }));

    // Sort by total_pages descending
    return result.sort((a, b) => b.total_pages - a.total_pages);
    
  } catch (error) {
    console.error('Error fetching user document stats:', error);
    throw new Error('Failed to fetch user document statistics');
  }
}

export async function fetchTimelineStats(): Promise<TimelineStats[]> {
  const supabase = createAdminClient();
  
  try {
    // First fetch documents with user_ids
    const { data: documents, error: docsError } = await supabase
      .from('vector_documents')
      .select('created_at, user_id')
      .eq('chunk_number', 1);

    if (docsError) throw docsError;
    if (!documents?.length) return [];

    // Get unique user IDs
    const userIds = [...new Set(documents.map(doc => doc.user_id))];

    // Then fetch user roles in bulk
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role')
      .in('id', userIds);

      if (usersError) throw usersError;
      if (!users) throw new Error('No users found');
      if (!users.length) return [];

    // Create a map of user_id to role
    // const userRoleMap = new Map(users?.map(user => [user.id, user.role]) ?? []);
    const userRoleMap = new Map(
      (users as unknown as { id: string; role: string }[]).map(user => [user.id, user.role])
    );

    // Group uploads by date and user role
    const timelineData = documents.reduce((acc: Record<string, TimelineStats>, doc) => {
      if (!doc.created_at) return acc;

      const date = new Date(doc.created_at).toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          admin_uploads: 0,
          user_uploads: 0
        };
      }
      
      // Determine if the uploader was an admin
      const role = userRoleMap.get(doc.user_id);
      if (role === 'admin') {
        acc[date].admin_uploads++;
      } else {
        acc[date].user_uploads++;
      }
      
      return acc;
    }, {});

    // Convert to array and sort chronologically
    return Object.values(timelineData).sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching timeline stats:', error);
    throw new Error('Failed to fetch timeline statistics');
  }
}