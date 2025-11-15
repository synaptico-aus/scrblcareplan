import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";

export function SubscriptionBanner() {
  const { organization } = useAuth();

  if (!organization) return null;

  const status = organization.subscriptionStatus;

  // Don't show banner if subscription is active
  if (status === "active") return null;

  // Show trial banner
  if (status === "trial") {
    return (
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-800 dark:text-blue-200">
            You're on a free trial. Upgrade to continue using SCRBL after your trial ends.
          </span>
          <Link href="/subscribe">
            <Button size="sm" variant="default" data-testid="button-upgrade">
              Upgrade Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Show expired/payment required banner
  return (
    <Alert className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-red-800 dark:text-red-200">
          {status === "canceled" 
            ? "Your subscription has been canceled. Subscribe to continue using SCRBL." 
            : "Payment required to access all features."}
        </span>
        <Link href="/subscribe">
          <Button size="sm" variant="destructive" data-testid="button-subscribe-now">
            Subscribe Now
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
