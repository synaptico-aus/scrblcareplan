import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordProtectedProps {
  children: React.ReactNode;
  requiredPassword: string;
  title?: string;
  description?: string;
}

const STORAGE_KEY = "savedPlansAccess";

export function PasswordProtected({ 
  children, 
  requiredPassword, 
  title = "Protected Area",
  description = "Please enter the password to continue"
}: PasswordProtectedProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has previously authenticated
    const savedAuth = localStorage.getItem(STORAGE_KEY);
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        const now = Date.now();
        // Auth expires after 24 hours
        if (authData.timestamp && (now - authData.timestamp) < 24 * 60 * 60 * 1000) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password === requiredPassword) {
      setIsAuthenticated(true);
      // Store authentication with timestamp
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        authenticated: true,
        timestamp: Date.now()
      }));
    } else {
      setError("Incorrect password");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={error ? "border-destructive" : ""}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive" data-testid="text-error">
                    {error}
                  </p>
                )}
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!password.trim()}
                data-testid="button-submit-password"
              >
                Access Protected Area
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          data-testid="button-logout"
        >
          <Lock className="h-4 w-4 mr-2" />
          Lock Access
        </Button>
      </div>
      {children}
    </div>
  );
}