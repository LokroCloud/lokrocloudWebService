import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, ArrowLeft, Coins, HardDrive, Gift, Loader2 } from 'lucide-react';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Shop = () => {
  const { profile } = useAuth();
  const { upgrades, fetchUpgrades, redeemVoucher, purchaseUpgrade, loading } = useCredits();
  const [voucherCode, setVoucherCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchUpgrades();
  }, [fetchUpgrades]);

  const handleRedeemVoucher = async () => {
    if (!voucherCode.trim()) return;
    setRedeeming(true);
    const success = await redeemVoucher(voucherCode);
    if (success) setVoucherCode('');
    setRedeeming(false);
  };

  const handlePurchase = async (upgradeId: string) => {
    setPurchasing(upgradeId);
    await purchaseUpgrade(upgradeId);
    setPurchasing(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Cloud className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Shop</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-warning" />
            <span className="font-medium">{profile?.credit_balance || 0} credits</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-4xl">
        {/* Voucher Redemption */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Redeem Voucher
            </CardTitle>
            <CardDescription>Enter a voucher code to receive credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="XXXX-XXXX-XXXX"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="flex-1 font-mono"
              />
              <Button onClick={handleRedeemVoucher} disabled={redeeming || !voucherCode.trim()}>
                {redeeming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redeem
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Storage Upgrades */}
        <h2 className="text-2xl font-bold mb-4">Storage Upgrades</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {loading ? (
            <div className="col-span-3 flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            upgrades.map((upgrade) => (
              <Card key={upgrade.id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium">
                    {upgrade.credit_cost} credits
                  </div>
                  <CardTitle className="flex items-center gap-2 mt-4">
                    <HardDrive className="h-5 w-5 text-primary" />
                    {upgrade.name}
                  </CardTitle>
                  <CardDescription>
                    Add {formatBytes(upgrade.storage_added)} to your storage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handlePurchase(upgrade.id)}
                    disabled={purchasing === upgrade.id || (profile?.credit_balance || 0) < upgrade.credit_cost}
                    className="w-full"
                  >
                    {purchasing === upgrade.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {(profile?.credit_balance || 0) < upgrade.credit_cost ? 'Insufficient Credits' : 'Purchase'}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;