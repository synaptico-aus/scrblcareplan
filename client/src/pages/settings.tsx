import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen, Shield, FileText, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import scrblLogo from "@assets/scrbl-logo.png";
import { UserGuideContent } from "@/components/UserGuideContent";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <img 
              src={scrblLogo} 
              alt="Scrbl Logo" 
              className="h-8 sm:h-10 w-auto"
            />
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">SCRBL 2.0</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Settings</p>
            </div>
          </div>
          <Link href="/care-planner">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Care Planner
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Account Information
              </CardTitle>
              <CardDescription>Your user details and role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Name:</span>
                <p className="text-base">{user?.firstName} {user?.lastName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <p className="text-base">{user?.email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Role:</span>
                <p className="text-base capitalize">{user?.role}</p>
              </div>
              {user?.monthlyPlanLimit !== null && user?.monthlyPlanLimit !== undefined && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Monthly Plan Limit:</span>
                  <p className="text-base">
                    {user.plansGeneratedThisMonth || 0} of {user.monthlyPlanLimit} plans used this month
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Complete User Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Complete User Guide & Training Manual
              </CardTitle>
              <CardDescription>
                Comprehensive guide for users and AI agent training | Version 2.0 | November 2024
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Scrollable container with max height */}
              <div className="max-h-[800px] overflow-y-auto border border-border rounded-lg p-6">
                <UserGuideContent userRole={user?.role} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
