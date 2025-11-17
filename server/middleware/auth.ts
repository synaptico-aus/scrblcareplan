import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";

export interface AuthRequest extends Request {
  user?: User;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized - Please log in" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized - Please log in" });
    return;
  }

  const user = req.user as User;
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ message: "Forbidden - Admin access required" });
    return;
  }

  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized - Please log in" });
    return;
  }

  const user = req.user as User;
  if (user.role !== "super_admin") {
    res.status(403).json({ message: "Forbidden - Super admin access required" });
    return;
  }

  next();
}

export function requireProfileComplete(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized - Please log in" });
    return;
  }

  const user = req.user as User;
  
  const isComplete = !!(
    user.firstName &&
    user.lastName &&
    user.email &&
    user.company &&
    user.phoneNumber
  );

  if (!isComplete) {
    res.status(403).json({ 
      message: "Profile incomplete - Please complete your profile information (First Name, Last Name, Email, Company, and Phone Number) in Settings before generating care plans.",
      requiresProfileCompletion: true
    });
    return;
  }

  next();
}

export function getOrganizationId(req: Request): string {
  const user = req.user as User;
  return user.organizationId;
}
