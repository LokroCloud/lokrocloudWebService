import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StorageUpgrade {
  id: string;
  name: string;
  storage_added: number;
  credit_cost: number;
  active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export const useCredits = () => {
  const { user, refreshProfile } = useAuth();
  const [upgrades, setUpgrades] = useState<StorageUpgrade[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUpgrades = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('storage_upgrades')
        .select('*')
        .eq('active', true)
        .order('credit_cost');

      if (error) throw error;
      setUpgrades(data as StorageUpgrade[]);
    } catch (error) {
      console.error('Error fetching upgrades:', error);
      toast.error('Failed to load upgrades');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data as Transaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transaction history');
    }
  }, [user]);

  const redeemVoucher = async (code: string) => {
    if (!user) return false;

    try {
      // Check if voucher exists and is valid
      const { data: voucher, error: voucherError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_redeemed', false)
        .maybeSingle();

      if (voucherError) throw voucherError;
      
      if (!voucher) {
        toast.error('Invalid or already redeemed voucher code');
        return false;
      }

      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        toast.error('This voucher has expired');
        return false;
      }

      // Mark voucher as redeemed
      const { error: updateError } = await supabase
        .from('vouchers')
        .update({
          is_redeemed: true,
          redeemed_by: user.id,
          redeemed_at: new Date().toISOString(),
        })
        .eq('id', voucher.id);

      if (updateError) throw updateError;

      // Add credits to user
      const { data: profile } = await supabase
        .from('profiles')
        .select('credit_balance')
        .eq('id', user.id)
        .single();

      const newBalance = (profile?.credit_balance || 0) + voucher.credit_amount;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credit_balance: newBalance })
        .eq('id', user.id);

      if (creditError) throw creditError;

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'voucher_redemption',
        amount: voucher.credit_amount,
        description: `Redeemed voucher code: ${code.toUpperCase()}`,
        reference_id: voucher.id,
      });

      toast.success(`Successfully redeemed ${voucher.credit_amount} credits!`);
      await refreshProfile();
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error redeeming voucher:', error);
      toast.error('Failed to redeem voucher');
      return false;
    }
  };

  const purchaseUpgrade = async (upgradeId: string) => {
    if (!user) return false;

    try {
      // Get upgrade details
      const upgrade = upgrades.find(u => u.id === upgradeId);
      if (!upgrade) {
        toast.error('Upgrade not found');
        return false;
      }

      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credit_balance, storage_limit')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if ((profile?.credit_balance || 0) < upgrade.credit_cost) {
        toast.error('Insufficient credits');
        return false;
      }

      // Deduct credits and add storage
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          credit_balance: (profile?.credit_balance || 0) - upgrade.credit_cost,
          storage_limit: (profile?.storage_limit || 0) + upgrade.storage_added,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'storage_purchase',
        amount: -upgrade.credit_cost,
        description: `Purchased: ${upgrade.name}`,
        reference_id: upgrade.id,
      });

      toast.success(`Successfully purchased ${upgrade.name}!`);
      await refreshProfile();
      await fetchTransactions();
      return true;
    } catch (error) {
      console.error('Error purchasing upgrade:', error);
      toast.error('Failed to purchase upgrade');
      return false;
    }
  };

  return {
    upgrades,
    transactions,
    loading,
    fetchUpgrades,
    fetchTransactions,
    redeemVoucher,
    purchaseUpgrade,
  };
};