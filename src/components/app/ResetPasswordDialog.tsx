import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetUserPassword } from "@/lib/admin-users.functions";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, Loader2, Copy, Check, AlertTriangle } from "lucide-react";

type Props = {
  userId: string;
  userName: string;
  children: React.ReactNode;
};

export function ResetPasswordDialog({ userId, userName, children }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pw = "";
    for (let i = 0; i < 14; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  };

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v) {
      setNewPassword(generatePassword());
      setConfirmPassword("");
      setCopied(false);
    }
  };

  const reset = useMutation({
    mutationFn: async () => {
      if (!newPassword) throw new Error("Password is required");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");

      return resetUserPassword({ data: { userId, newPassword } });
    },
    onSuccess: () => {
      toast.success(`Password reset for ${userName}`);
      qc.invalidateQueries({ queryKey: ["module:clients"] });
      setOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset password");
    },
  });

  const copyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" /> Reset Password
          </DialogTitle>
          <DialogDescription>
            Reset the password for <strong>{userName}</strong>. They will need the new password to log in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* New password */}
          <div>
            <Label>New Password</Label>
            <div className="mt-1 flex gap-2">
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setNewPassword(generatePassword())}>
                🔄
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={copyPassword}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <Label>Confirm Password</Label>
            <Input
              type="text"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type the same password"
              className="mt-1 font-mono"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="mt-1 text-xs text-destructive">Passwords do not match</p>
            )}
          </div>

          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Important:</strong> Copy the new password and share it securely with {userName}.
                They will be logged out of all other sessions.
              </div>
            </div>
          </div>

          <Button
            onClick={() => reset.mutate()}
            disabled={reset.isPending || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
            className="w-full"
          >
            {reset.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
            Reset Password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
