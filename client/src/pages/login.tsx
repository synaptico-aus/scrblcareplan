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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await apiRequest("POST", "/api/auth/login", { password });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onLogin();
        } else {
          setError("Authentication failed. Please try again.");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Invalid password. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred while logging in. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                  data-testid="input-password"
                  required
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
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Secure Access Protected</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}