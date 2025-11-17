import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";

export function setupPassport() {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select({
              id: users.id,
              email: users.email,
              passwordHash: users.passwordHash,
              firstName: users.firstName,
              lastName: users.lastName,
              company: users.company,
              phoneNumber: users.phoneNumber,
              organizationId: users.organizationId,
              role: users.role,
              monthlyPlanLimit: users.monthlyPlanLimit,
              plansGeneratedThisMonth: users.plansGeneratedThisMonth,
              limitResetDate: users.limitResetDate,
              twoFactorSecret: users.twoFactorSecret,
              twoFactorEnabled: users.twoFactorEnabled,
              createdAt: users.createdAt,
              updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValidPassword = await bcrypt.compare(password, user.passwordHash);
          if (!isValidPassword) {
            return done(null, false, { message: "Invalid email or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });
}

// Middleware to handle impersonation
export function handleImpersonation(req: any, res: any, next: any) {
  const session = req.session as any;
  
  if (session && session.impersonatedUserId && req.user) {
    // If impersonating, load the impersonated user as req.user
    storage.getUser(session.impersonatedUserId)
      .then(impersonatedUser => {
        if (impersonatedUser) {
          req.user = impersonatedUser;
          next();
        } else {
          // Impersonated user not found - fail closed by clearing impersonation
          delete session.impersonatorId;
          delete session.impersonatedUserId;
          delete session.impersonationStartedAt;
          
          session.save((err: any) => {
            if (err) {
              console.error("Error clearing invalid impersonation session:", err);
              return res.status(500).json({ message: "Session error" });
            }
            // Continue with original user (super admin)
            next();
          });
        }
      })
      .catch(err => {
        console.error("Error loading impersonated user:", err);
        // Database error - fail closed by clearing impersonation and returning error
        delete session.impersonatorId;
        delete session.impersonatedUserId;
        delete session.impersonationStartedAt;
        
        res.status(500).json({ message: "Failed to load user context" });
      });
  } else {
    next();
  }
}
