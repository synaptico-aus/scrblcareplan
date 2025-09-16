import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import scrblLogo from "@assets/scrbl-logo.png";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReplitLogin = () => {
    setIsLoading(true);
    setError("");
    // Redirect to Replit OAuth flow
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={scrblLogo} 
              alt="Scrbl Logo" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-semibold">scrbl_v2</CardTitle>
          <CardDescription>
            Digital Care Plan Agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleReplitLogin} 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Redirecting..." : "Login with Replit"}
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure Access Protected</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}