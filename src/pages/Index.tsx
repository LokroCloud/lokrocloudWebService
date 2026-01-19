import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Cloud, HardDrive, Shield, Zap, Gift } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">CloudVault</span>
          </div>
          <div className="flex gap-2">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <h1 className="text-5xl font-bold mb-6 gradient-text">
              Your Files, Everywhere
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Secure cloud storage with 5 GB free. Upload, access, and share your files from any device.
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/signup">
                <Button size="lg" className="animate-pulse-glow">
                  Start Free
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 bg-card/50">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Why CloudVault?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <HardDrive className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">5 GB Free</h3>
                <p className="text-sm text-muted-foreground">Start with 5 GB of free storage space</p>
              </div>
              <div className="text-center p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Secure</h3>
                <p className="text-sm text-muted-foreground">Your files are encrypted and protected</p>
              </div>
              <div className="text-center p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Fast Access</h3>
                <p className="text-sm text-muted-foreground">Access your files from any device instantly</p>
              </div>
              <div className="text-center p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Earn Credits</h3>
                <p className="text-sm text-muted-foreground">Redeem vouchers to upgrade your storage</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4 text-center text-muted-foreground">
        <p>&copy; 2026 CloudVault. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;