import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, UserCog, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface ManageEmployeesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ManageEmployeesDialog = ({ open, onOpenChange }: ManageEmployeesDialogProps) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  useEffect(() => {
    if (open) {
      fetchNonEmployeeUsers();
    }
  }, [open]);

  const fetchNonEmployeeUsers = async () => {
    setFetchingUsers(true);
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profilesError) throw profilesError;

      // Get all users who are already employees
      const { data: employeeRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "employee");

      if (rolesError) throw rolesError;

      const employeeUserIds = new Set(employeeRoles?.map(r => r.user_id) || []);
      
      // Filter out users who are already employees
      const nonEmployees = (profiles || []).filter(p => !employeeUserIds.has(p.id));
      setUsers(nonEmployees);
    } catch (error: any) {
      toast.error("Error fetching users: " + error.message);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleConvertToEmployee = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUserId,
          role: "employee"
        });

      if (error) throw error;

      toast.success("User has been granted employee access");
      setSelectedUserId("");
      fetchNonEmployeeUsers();
    } catch (error: any) {
      toast.error("Error converting user: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewEmployee = async () => {
    if (!newEmail || !newPassword) {
      toast.error("Please fill in email and password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Create the new user via Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            full_name: newFullName,
            role: "employee"
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success("New employee account created successfully");
        setNewEmail("");
        setNewPassword("");
        setNewFullName("");
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error("Error creating employee: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Employees</DialogTitle>
          <DialogDescription>
            Add new employees by converting existing users or creating new accounts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="convert" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="convert" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Convert User
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="convert" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Select User to Convert</Label>
              {fetchingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No users available to convert
                </p>
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleConvertToEmployee}
                disabled={loading || !selectedUserId}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Grant Employee Access
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="newFullName">Full Name</Label>
              <Input
                id="newFullName"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="employee@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreateNewEmployee}
                disabled={loading || !newEmail || !newPassword}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Employee
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ManageEmployeesDialog;
