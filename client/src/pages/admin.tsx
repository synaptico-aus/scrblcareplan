import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, ArrowLeft, UserCog, DollarSign, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type User = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  monthlyPlanLimit: number | null;
  plansGeneratedThisMonth: number;
  organizationId: string;
  organizationName: string;
  createdAt: Date;
  updatedAt: Date;
};

type ServiceRate = {
  id: string;
  organizationId: string;
  serviceName: string;
  category: string;
  hourlyRate: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function AdminDashboard() {
  const { user, refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [monthlyLimit, setMonthlyLimit] = useState<string>("");
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "user" as "admin" | "user",
  });
  const [serviceRates, setServiceRates] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isSuperAdmin = user?.role === "super_admin";

  if (user?.role !== "admin" && user?.role !== "super_admin") {
    setLocation("/");
    return null;
  }

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: rates, isLoading: isLoadingRates } = useQuery<ServiceRate[]>({
    queryKey: ["/api/service-rates"],
  });

  // Initialize service rates when data loads
  useEffect(() => {
    if (rates) {
      const ratesMap: Record<string, string> = {};
      rates.forEach(rate => {
        ratesMap[rate.id] = rate.hourlyRate || "";
      });
      setServiceRates(ratesMap);
      setHasUnsavedChanges(false);
    }
  }, [rates]);

  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return apiRequest("POST", "/api/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setNewUser({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "user",
      });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateLimitMutation = useMutation({
    mutationFn: async ({ userId, limit }: { userId: string; limit: number | null }) => {
      return apiRequest("PATCH", `/api/users/${userId}/limit`, { 
        monthlyPlanLimit: limit 
      });
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // If updating own limit, refresh current user data
      if (variables.userId === user?.id) {
        await refetchUser();
      }
      
      setIsLimitDialogOpen(false);
      setSelectedUser(null);
      setMonthlyLimit("");
      toast({
        title: "Success",
        description: "Monthly plan limit updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update limit",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleOpenLimitDialog = (user: User) => {
    setSelectedUser(user);
    setMonthlyLimit(user.monthlyPlanLimit !== null ? user.monthlyPlanLimit.toString() : "");
    setIsLimitDialogOpen(true);
  };

  const handleUpdateLimit = () => {
    if (!selectedUser) return;
    
    const limit = monthlyLimit.trim() === "" ? null : parseInt(monthlyLimit);
    
    if (limit !== null && (isNaN(limit) || limit < 0)) {
      toast({
        title: "Error",
        description: "Please enter a valid number (0 or greater) or leave empty for unlimited",
        variant: "destructive",
      });
      return;
    }

    updateLimitMutation.mutate({ userId: selectedUser.id, limit });
  };

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest("POST", "/api/impersonation/start", { userId });
      return response.json();
    },
    onSuccess: async () => {
      // Refresh user data to get impersonation state
      await refetchUser();
      toast({
        title: "Success",
        description: "Now impersonating user",
      });
      // Redirect to care planner as the impersonated user
      setLocation("/care-planner");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start impersonation",
        variant: "destructive",
      });
    },
  });

  const handleImpersonate = (targetUser: User) => {
    impersonateMutation.mutate(targetUser.id);
  };

  const updateServiceRateMutation = useMutation({
    mutationFn: async ({ id, hourlyRate }: { id: string; hourlyRate: string | null }) => {
      return apiRequest("PUT", `/api/service-rates/${id}`, { hourlyRate });
    },
  });

  const handleSaveRates = async () => {
    if (!rates || !Array.isArray(rates)) return;
    
    try {
      const updates = rates.map((rate: ServiceRate) => ({
        id: rate.id,
        hourlyRate: serviceRates[rate.id] || null,
      }));

      await Promise.all(
        updates.map((update: { id: string; hourlyRate: string | null }) => updateServiceRateMutation.mutateAsync(update))
      );

      queryClient.invalidateQueries({ queryKey: ["/api/service-rates"] });
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "Service rates updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update service rates",
        variant: "destructive",
      });
    }
  };

  const handleRateChange = (id: string, value: string) => {
    setServiceRates(prev => ({ ...prev, [id]: value }));
    setHasUnsavedChanges(true);
  };

  const groupedRates = rates?.reduce((acc: Record<string, ServiceRate[]>, rate: ServiceRate) => {
    if (!acc[rate.category]) {
      acc[rate.category] = [];
    }
    acc[rate.category].push(rate);
    return acc;
  }, {} as Record<string, ServiceRate[]>) || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            data-testid="button-back-to-planner"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Planner
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="text-page-title">
            Admin Dashboard
          </h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
            <TabsTrigger value="rates" data-testid="tab-rates">Service Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-create-user">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to your organization. They will receive an email with login instructions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter a secure password"
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="John"
                    data-testid="input-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="Doe"
                    data-testid="input-lastname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value as "admin" | "user" })}
                  >
                    <SelectTrigger data-testid="select-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-user"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isSuperAdmin && (
            <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
              <DialogContent data-testid="dialog-set-limit">
                <DialogHeader>
                  <DialogTitle>Set Monthly Plan Limit</DialogTitle>
                  <DialogDescription>
                    Set the monthly care plan generation limit for {selectedUser?.email}. Leave empty for unlimited plans.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyLimit">Monthly Plan Limit</Label>
                    <Input
                      id="monthlyLimit"
                      type="number"
                      min="0"
                      value={monthlyLimit}
                      onChange={(e) => setMonthlyLimit(e.target.value)}
                      placeholder="Leave empty for unlimited"
                      data-testid="input-monthly-limit"
                    />
                    <p className="text-sm text-muted-foreground">
                      Current: {selectedUser?.plansGeneratedThisMonth || 0} generated this month
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsLimitDialogOpen(false)}
                    data-testid="button-cancel-limit"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateLimit}
                    disabled={updateLimitMutation.isPending}
                    data-testid="button-submit-limit"
                  >
                    {updateLimitMutation.isPending ? "Updating..." : "Update Limit"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400" data-testid="text-loading">
              Loading users...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {isSuperAdmin && <TableHead>Organization</TableHead>}
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead>Monthly Limit</TableHead>}
                  {isSuperAdmin && <TableHead>Generated</TableHead>}
                  <TableHead>Created</TableHead>
                  {isSuperAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((targetUser) => (
                    <TableRow key={targetUser.id} data-testid={`row-user-${targetUser.id}`}>
                      <TableCell data-testid={`text-username-${targetUser.id}`}>
                        {targetUser.firstName && targetUser.lastName
                          ? `${targetUser.firstName} ${targetUser.lastName}`
                          : targetUser.firstName || targetUser.lastName || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-email-${targetUser.id}`}>{targetUser.email}</TableCell>
                      {isSuperAdmin && (
                        <TableCell data-testid={`text-org-${targetUser.id}`}>
                          {targetUser.organizationName}
                        </TableCell>
                      )}
                      <TableCell data-testid={`text-role-${targetUser.id}`}>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            targetUser.role === "super_admin"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : targetUser.role === "admin"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          }`}
                        >
                          {targetUser.role === "super_admin" ? "Super Admin" : targetUser.role}
                        </span>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell data-testid={`text-limit-${targetUser.id}`}>
                          {targetUser.monthlyPlanLimit === null ? "Unlimited" : targetUser.monthlyPlanLimit}
                        </TableCell>
                      )}
                      {isSuperAdmin && (
                        <TableCell data-testid={`text-generated-${targetUser.id}`}>
                          {targetUser.plansGeneratedThisMonth || 0}
                        </TableCell>
                      )}
                      <TableCell data-testid={`text-created-${targetUser.id}`}>
                        {new Date(targetUser.createdAt).toLocaleDateString()}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenLimitDialog(targetUser)}
                              data-testid={`button-set-limit-${targetUser.id}`}
                            >
                              Set Limit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleImpersonate(targetUser)}
                              disabled={impersonateMutation.isPending || targetUser.id === user?.id}
                              data-testid={`button-impersonate-${targetUser.id}`}
                            >
                              <UserCog className="h-4 w-4 mr-1" />
                              Impersonate
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 8 : 4} className="text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
          </TabsContent>

          <TabsContent value="rates" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Configure Service Rates</h2>
              <Button
                onClick={handleSaveRates}
                disabled={!hasUnsavedChanges || updateServiceRateMutation.isPending || isLoadingRates}
                data-testid="button-save-rates"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateServiceRateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {isLoadingRates ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/4"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : !rates || rates.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                <p className="text-yellow-800 dark:text-yellow-200" data-testid="text-no-rates">
                  No service rates configured. Default services will be created automatically on first save.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedRates).map(([category, categoryRates]) => (
                  <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-primary" />
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(categoryRates as ServiceRate[]).map((rate: ServiceRate) => (
                        <div key={rate.id} className="space-y-2">
                          <Label htmlFor={`rate-${rate.id}`} className="text-sm font-medium">
                            {rate.serviceName}
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <Input
                              id={`rate-${rate.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={serviceRates[rate.id] || ""}
                              onChange={(e) => handleRateChange(rate.id, e.target.value)}
                              placeholder="0.00"
                              className="pl-7"
                              data-testid={`input-rate-${rate.id}`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/hour</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
