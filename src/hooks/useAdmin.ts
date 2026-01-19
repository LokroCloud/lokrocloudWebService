import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  username: string;
  credit_balance: number;
  storage_limit: number;
  storage_used: number;
  is_admin: boolean;
  created_at: string;
}

export interface Voucher {
  id: string;
  code: string;
  credit_amount: number;
  is_redeemed: boolean;
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_by: string | null;
  expires_at: string | null;
  created_at: string;
}

export const useAdmin = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.is_admin ?? false;

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, credit_balance, storage_limit, storage_used, is_admin, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as AdminUser[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const fetchVouchers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVouchers(data as Voucher[]);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      toast.error('Failed to load vouchers');
    }
  }, [isAdmin]);

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createVoucher = async (creditAmount: number, expiresAt?: string) => {
    if (!isAdmin || !profile) {
      toast.error('Unauthorized');
      return false;
    }

    try {
      const code = generateVoucherCode();
      
      const { error } = await supabase
        .from('vouchers')
        .insert({
          code,
          credit_amount: creditAmount,
          created_by: profile.id,
          expires_at: expiresAt || null,
        });

      if (error) throw error;
      
      toast.success(`Voucher created: ${code}`);
      await fetchVouchers();
      return true;
    } catch (error) {
      console.error('Error creating voucher:', error);
      toast.error('Failed to create voucher');
      return false;
    }
  };

  const deleteVoucher = async (voucherId: string) => {
    if (!isAdmin) return false;

    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', voucherId);

      if (error) throw error;
      
      toast.success('Voucher deleted');
      setVouchers(prev => prev.filter(v => v.id !== voucherId));
      return true;
    } catch (error) {
      console.error('Error deleting voucher:', error);
      toast.error('Failed to delete voucher');
      return false;
    }
  };

  const updateUserCredits = async (userId: string, newBalance: number) => {
    if (!isAdmin) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credit_balance: newBalance })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('User credits updated');
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating credits:', error);
      toast.error('Failed to update credits');
      return false;
    }
  };

  const toggleAdmin = async (userId: string, makeAdmin: boolean) => {
    if (!isAdmin) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: makeAdmin })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`User ${makeAdmin ? 'promoted to' : 'removed from'} admin`);
      await fetchUsers();
      return true;
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Failed to update admin status');
      return false;
    }
  };

  return {
    users,
    vouchers,
    loading,
    isAdmin,
    fetchUsers,
    fetchVouchers,
    createVoucher,
    deleteVoucher,
    updateUserCredits,
    toggleAdmin,
  };
};