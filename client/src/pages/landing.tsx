import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle2, 
  Clock, 
  Shield, 
  FileText, 
  TrendingUp, 
  Users,
  Zap,
  Award,
  ArrowRight,
  Calculator
} from "lucide-react";
import scrblLogo from "@assets/scrbl-logo.png";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";

export default function Landing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect logged-in users to care planner
  useEffect(() => {
    if (user) {
      setLocation("/care-planner");
    }
  }, [user, setLocation]);

  // ROI Calculator state
  const [plansPerMonth, setPlansPerMonth] = useState("10");
  const [hourlyRate, setHourlyRate] = useState("50");
  
  // Calculate savings (114 minutes per plan)
  const timeSavedPerPlan = 114; // minutes
  const plans = parseInt(plansPerMonth) || 0;
  const rate = parseFloat(hourlyRate) || 0;
  
  const monthlyMinutesSaved = plans * timeSavedPerPlan;
  const monthlyHoursSaved = monthlyMinutesSaved / 60;
  const monthlyCostSavings = monthlyHoursSaved * rate;
  const yearlyCostSavings = monthlyCostSavings * 12;

  const benefits = [
    {
      icon: Clock,
      title: "95% Time Savings",
      description: "Generate care plans in 6 minutes instead of 2 hours"
    },
    {
      icon: Shield,
      title: "100% Compliant",
      description: "Meets all Aged Care Quality Standards and Privacy Act requirements"
    },
    {
      icon: FileText,
      title: "Gold Standard Format",
      description: "Professionally formatted care plans ready for review and distribution"
    },
    {
      icon: TrendingUp,
      title: "AI-Powered Intelligence",
      description: "GPT-4 extracts structured data from your assessment notes"
    },
    {
      icon: Users,
      title: "Multi-Tenant Security",
      description: "Complete data isolation with Australian data residency"
    },
    {
      icon: Award,
      title: "Export to Word",
      description: "Download care plans for editing and client distribution"
    }
  ];

  const features = [
    "Intelligent fact extraction from assessment transcripts",
    "Automatic compliance with Aged Care Quality Standards 1-8",
    "Support at Home Program and HCP package support",
    "Risk assessment with color-coded severity levels",
    "Client document management with secure cloud storage",
    "Australian data hosting (AWS Sydney region)"
  ];

  return (
    <>
      <Helmet>
        <title>SCRBL 2.0 - AI-Powered Care Plan Generator for Australian Aged Care | Save 95% Time</title>
        <meta 
          name="description" 
          content="Generate compliant Gold Standard care plans in 6 minutes instead of 2 hours. SCRBL uses AI to transform assessment notes into professional care plans meeting all Aged Care Quality Standards. Australian data residency, multi-tenant security." 
        />
        <meta name="keywords" content="aged care, care plan generator, AI care planning, Australian aged care, Gold Standard care plans, Support at Home, HCP, Aged Care Quality Standards, care plan software" />
        
        {/* Open Graph tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="SCRBL 2.0 - AI-Powered Care Plan Generator for Australian Aged Care" />
        <meta property="og:description" content="Generate compliant Gold Standard care plans in 6 minutes instead of 2 hours. Save 95% of care planning time with AI-powered automation." />
        <meta property="og:site_name" content="SCRBL 2.0" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SCRBL 2.0 - AI-Powered Care Plan Generator" />
        <meta name="twitter:description" content="Generate compliant Gold Standard care plans in 6 minutes instead of 2 hours." />
        
        {/* Structured Data - JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "SCRBL 2.0",
            "applicationCategory": "HealthApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "AUD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5",
              "ratingCount": "1"
            },
            "description": "AI-powered care plan generator for Australian aged care providers. Generate Gold Standard care plans in minutes, not hours.",
            "featureList": [
              "AI-powered fact extraction",
              "Aged Care Quality Standards compliance",
              "Australian data residency",
              "Multi-tenant security",
              "Word export functionality"
            ]
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={scrblLogo} 
                  alt="SCRBL Logo - AI Care Plan Generator" 
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-xl font-bold text-foreground">SCRBL 2.0</h1>
                  <p className="text-xs text-muted-foreground">AI Assisted Care Plans</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="outline" data-testid="button-login">
                    Login
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button data-testid="button-signup">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                    <Zap className="mr-2 h-4 w-4" />
                    95% Time Savings
                  </div>
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                    Transform Assessment Notes into{" "}
                    <span className="text-primary">Gold Standard</span> Care Plans
                  </h2>
                  <p className="text-xl text-muted-foreground max-w-2xl">
                    Generate compliant, professionally formatted care plans in 6 minutes instead of 2 hours. 
                    SCRBL uses AI to extract structured data and create plans that meet all Australian regulatory requirements.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="w-full sm:w-auto" data-testid="button-hero-signup">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-hero-login">
                      Login to Your Account
                    </Button>
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap gap-6 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Australian Data Residency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Privacy Act 1988 Compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-muted-foreground">Quality Standards 1-8</span>
                  </div>
                </div>
              </div>

              {/* ROI Calculator Card */}
              <div>
                <Card className="shadow-2xl border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                      <Calculator className="mr-2 h-6 w-6 text-primary" />
                      Calculate Your Savings
                    </CardTitle>
                    <CardDescription>
                      See how much time and money SCRBL can save your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="plans-per-month">Care Plans Generated Per Month</Label>
                        <Input
                          id="plans-per-month"
                          type="number"
                          min="1"
                          value={plansPerMonth}
                          onChange={(e) => setPlansPerMonth(e.target.value)}
                          className="mt-1.5"
                          data-testid="input-plans-per-month"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="hourly-rate">Staff Hourly Rate (AUD)</Label>
                        <Input
                          id="hourly-rate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          className="mt-1.5"
                          data-testid="input-hourly-rate"
                        />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-6 space-y-4 border border-primary/20">
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Time Saved Per Month:</span>
                          <span className="text-2xl font-bold text-foreground" data-testid="text-monthly-hours">
                            {monthlyHoursSaved.toFixed(1)} hours
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Monthly Cost Savings:</span>
                          <span className="text-3xl font-bold text-primary" data-testid="text-monthly-savings">
                            ${monthlyCostSavings.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-baseline pt-3 border-t border-primary/20">
                          <span className="text-base font-semibold text-foreground">Yearly Cost Savings:</span>
                          <span className="text-4xl font-bold text-primary" data-testid="text-yearly-savings">
                            ${yearlyCostSavings.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Based on 114 minutes saved per care plan (120 min manual - 6 min AI)
                      </p>
                    </div>

                    <Link href="/signup" className="block">
                      <Button className="w-full" size="lg" data-testid="button-calculator-signup">
                        Start Saving Today
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                Why Choose SCRBL?
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Purpose-built for Australian aged care providers to streamline care planning while maintaining the highest standards of compliance and quality.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{benefit.title}</CardTitle>
                      <CardDescription className="text-base">
                        {benefit.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                  Everything You Need for Compliant Care Planning
                </h2>
                <p className="text-lg text-muted-foreground">
                  SCRBL combines advanced AI technology with deep understanding of Australian aged care requirements to deliver care plans that meet regulatory standards while saving you hours of work.
                </p>
                
                <ul className="space-y-4">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 border-2 border-primary/10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">How It Works</h3>
                    <p className="text-muted-foreground">Simple 3-step process to create professional care plans</p>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Enter Assessment Notes</h4>
                        <p className="text-sm text-muted-foreground">
                          Copy your assessment transcript into SCRBL - no special formatting required
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">AI Extracts Key Facts</h4>
                        <p className="text-sm text-muted-foreground">
                          Our AI identifies client details, medical info, risks, preferences, and support networks
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">Generate & Export</h4>
                        <p className="text-sm text-muted-foreground">
                          Review the Gold Standard care plan and export to Word for distribution
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary to-primary/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground">
              Ready to Transform Your Care Planning?
            </h2>
            <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
              Join aged care providers across Australia who are saving time and improving care plan quality with SCRBL.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto" data-testid="button-cta-signup">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/30" data-testid="button-cta-login">
                  Login to Continue
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border bg-card py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <img src={scrblLogo} alt="SCRBL Logo" className="h-8 w-auto" />
                  <span className="font-bold text-lg">SCRBL 2.0</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-powered care plan generation for Australian aged care providers. Compliant, fast, and professional.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/signup" className="hover:text-foreground transition-colors">Get Started</Link></li>
                  <li><Link href="/login" className="hover:text-foreground transition-colors">Login</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="/settings" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/settings" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} SCRBL 2.0. All rights reserved. Australian data residency. Privacy Act 1988 compliant.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
