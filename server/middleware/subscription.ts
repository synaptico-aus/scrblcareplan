import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import { storage } from "../storage";

export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = req.user as User;
  const organization = await storage.getOrganization(user.organizationId);

  if (!organization) {
    return res.status(404).json({ message: "Organization not found" });
  }

  const status = organization.subscriptionStatus;

  // Allow access if:
  // 1. Subscription is active
  // 2. User is in trial period
  // 3. Super admin (bypass paywall)
  if (status === "active" || user.role === "super_admin") {
    return next();
  }

  // Check if trial is still valid
  if (status === "trial" && organization.trialEndsAt) {
    const now = new Date();
    if (now < organization.trialEndsAt) {
      return next(); // Trial still active
    }
  }

  // Subscription required
  return res.status(402).json({ 
    message: "Active subscription required",
    subscriptionStatus: status,
    requiresPayment: true
  });
}

export async function checkSubscriptionStatus(organizationId: string): Promise<{
  hasAccess: boolean;
  status: string | null;
  trialDaysLeft?: number;
  message?: string;
}> {
  const organization = await storage.getOrganization(organizationId);

  if (!organization) {
    return {
      hasAccess: false,
      status: null,
      message: "Organization not found"
    };
  }

  const status = organization.subscriptionStatus;

  // Active subscription
  if (status === "active") {
    return {
      hasAccess: true,
      status: "active"
    };
  }

  // Trial period
  if (status === "trial" && organization.trialEndsAt) {
    const now = new Date();
    const trialEnd = new Date(organization.trialEndsAt);
    
    if (now < trialEnd) {
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        hasAccess: true,
        status: "trial",
        trialDaysLeft: daysLeft,
        message: `Trial expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
      };
    }
  }

  // No access
  return {
    hasAccess: false,
    status,
    message: "Subscription required to access this feature"
  };
}
