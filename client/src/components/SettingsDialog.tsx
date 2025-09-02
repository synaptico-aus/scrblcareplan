import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Moon, Sun, Key, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isKeyModified, setIsKeyModified] = useState(false);
  const { toast } = useToast();

  // Initialize theme from localStorage and document class
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (savedTheme === null && systemDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Load API key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem("openai-api-key");
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleThemeToggle = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    toast({
      title: "Theme Updated",
      description: `Switched to ${newDarkMode ? "dark" : "light"} mode`,
    });
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setIsKeyModified(true);
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("openai-api-key", apiKey.trim());
      toast({
        title: "API Key Saved",
        description: "Your OpenAI API key has been saved securely",
      });
    } else {
      localStorage.removeItem("openai-api-key");
      toast({
        title: "API Key Removed",
        description: "Your OpenAI API key has been removed",
      });
    }
    setIsKeyModified(false);
  };

  const handleClearApiKey = () => {
    setApiKey("");
    localStorage.removeItem("openai-api-key");
    setIsKeyModified(false);
    toast({
      title: "API Key Cleared",
      description: "Your OpenAI API key has been removed",
    });
  };

  const maskedApiKey = apiKey ? `sk-...${apiKey.slice(-8)}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              <Label className="text-sm font-medium">Theme</Label>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  {isDarkMode ? "Dark mode" : "Light mode"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred appearance
                </p>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={handleThemeToggle}
                data-testid="theme-toggle"
              />
            </div>
          </div>

          <Separator />

          {/* API Key Management */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <Label className="text-sm font-medium">OpenAI API Key</Label>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally and never transmitted to our servers
              </p>
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    data-testid="api-key-input"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                    data-testid="toggle-api-key-visibility"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {apiKey && !showApiKey && (
                  <p className="text-xs text-muted-foreground">
                    Current key: {maskedApiKey}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveApiKey}
                  disabled={!isKeyModified}
                  size="sm"
                  data-testid="save-api-key"
                  className="flex-1"
                >
                  Save Key
                </Button>
                <Button
                  onClick={handleClearApiKey}
                  disabled={!apiKey}
                  variant="outline"
                  size="sm"
                  data-testid="clear-api-key"
                  className="flex-1"
                >
                  Clear Key
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}