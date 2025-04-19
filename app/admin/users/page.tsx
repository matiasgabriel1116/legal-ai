'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { fetchUsers, handleSubscriptionToggle, handleDeleteUser, inviteUserByEmail } from './fetch';
import { createAdminClient } from '@/lib/server/admin';


export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadUsers = async () => {
    try {
      const usersData = await fetchUsers();
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const inviteUser = async () => {
    if (!newUserEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsLoading(true);
    try {
      await inviteUserByEmail(newUserEmail);
      toast.success('Invitation sent successfully');
      await loadUsers();
      setNewUserEmail('');
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubscription = async (userId: string, checked: string) => {
    try {
      await handleSubscriptionToggle(userId, checked == 'free' ? 'premium' : 'free');
      toast.success(`User subscription updated to ${checked ? 'Premium' : 'Free'}`);
      await loadUsers();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast.error('Failed to update subscription status');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await handleDeleteUser(userId);
      toast.success('User deleted successfully');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        
        <div className="flex gap-4">
          <Input
            placeholder="Enter lawyer's email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="min-w-[300px]"
          />
          <Button 
            onClick={inviteUser} 
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Invite Lawyer'}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Premium Access</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.status || 'Active'}</TableCell>
              <TableCell>
                <Switch
                  checked={user.subscription_type == "free" ? 0: 1}
                  onCheckedChange={(checked) => toggleSubscription(user.id, user.subscription_type)}
                />
              </TableCell>
              <TableCell>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => deleteUser(user.id)}
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