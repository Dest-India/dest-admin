"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DeleteAccountDialog({ 
  accountId, 
  accountType = "partner", // "partner" or "user"
  accountName,
  onDeleted 
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const endpoint = accountType === "partner" 
        ? `/api/partners/${accountId}/delete`
        : `/api/users/${accountId}/delete`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account");
      }

      toast.success(
        `${accountType === "partner" ? "Partner" : "User"} account deleted successfully`,
        {
          description: "Account can be recovered within 30 days"
        }
      );
      
      setOpen(false);
      
      // Callback to parent component or redirect
      if (onDeleted) {
        onDeleted();
      } else {
        // Redirect to list page
        router.push(accountType === "partner" ? "/partners" : "/customers");
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete account", error);
      toast.error("Failed to delete account", {
        description: error.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete Account
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Account?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-foreground">
                Are you sure you want to delete {accountName ? `"${accountName}"` : "this account"}?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                <p className="font-medium text-yellow-900 mb-1">⚠️ Important:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800">
                  <li>This is a <strong>soft delete</strong></li>
                  <li>Account status will be set to "deleted"</li>
                  <li>Account can be recovered within <strong>30 days</strong></li>
                  <li>After 30 days, data may be permanently removed</li>
                </ul>
              </div>

              <p className="text-sm text-muted-foreground">
                The account will be hidden from active listings but can be restored by an administrator if needed.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
