import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const JoinWorkspace = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptInvitation } = useWorkspaces();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    const success = await acceptInvitation(token);
    
    if (success) {
      setJoined(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } else {
      setError('Failed to join workspace. The invitation may be invalid or expired.');
    }
    
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto text-primary mb-4" />
            <CardTitle>Join Workspace</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Please log in to accept this workspace invitation.
            </p>
            <Link to="/login">
              <Button className="w-full">Log In</Button>
            </Link>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>
            {joined ? 'Welcome!' : 'Join Workspace'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {joined ? (
            <>
              <p className="text-muted-foreground">
                You have successfully joined the workspace!
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard...
              </p>
            </>
          ) : error ? (
            <>
              <p className="text-destructive">{error}</p>
              <Link to="/dashboard">
                <Button variant="outline" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                You've been invited to join a workspace. Click below to accept.
              </p>
              <Button onClick={handleJoin} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Accept Invitation'
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinWorkspace;
