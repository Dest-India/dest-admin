"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

export function ManualEnrollmentDialog({ userId, userName, onEnrolled }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [partners, setPartners] = useState([]);
  
  const [formData, setFormData] = useState({
    partnerId: "",
    paymentStatus: "unpaid",
    paymentMethod: "",
    amountPaid: "",
    notes: ""
  });

  // Fetch partners when dialog opens
  useEffect(() => {
    if (open && partners.length === 0) {
      fetchPartners();
    }
  }, [open]);

  const fetchPartners = async () => {
    try {
      const response = await fetch("/api/partners?limit=1000");
      if (!response.ok) throw new Error("Failed to fetch partners");
      const data = await response.json();
      setPartners(data.partners || []);
    } catch (error) {
      console.error("Failed to fetch partners", error);
      toast.error("Failed to load partners");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.partnerId) {
      toast.error("Please select a partner");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/enrollments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          partnerId: formData.partnerId,
          paymentStatus: formData.paymentStatus,
          paymentMethod: formData.paymentMethod || null,
          amountPaid: formData.amountPaid ? parseFloat(formData.amountPaid) : null,
          notes: formData.notes || null,
          enrolledBy: "admin" // Track that this was manual enrollment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enroll user");
      }

      const result = await response.json();
      
      toast.success("User enrolled successfully", {
        description: `${userName} has been enrolled`
      });
      
      setOpen(false);
      resetForm();
      
      if (onEnrolled) {
        onEnrolled(result);
      }
    } catch (error) {
      console.error("Failed to enroll user", error);
      toast.error("Failed to enroll user", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      partnerId: "",
      paymentStatus: "unpaid",
      paymentMethod: "",
      amountPaid: "",
      notes: ""
    });
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <UserPlus className="h-4 w-4" />
        Manual Enrollment
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Manual User Enrollment</DialogTitle>
            <DialogDescription>
              Enroll {userName} to a gym, academy, or turf manually
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Partner Selection */}
            <div className="space-y-2">
              <Label htmlFor="partner">Select Partner *</Label>
              <Select 
                value={formData.partnerId} 
                onValueChange={(value) => setFormData({ ...formData, partnerId: value })}
                required
              >
                <SelectTrigger id="partner">
                  <SelectValue placeholder="Choose gym, academy, or turf" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      {partner.name} ({partner.role}) - {partner.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status */}
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Payment Status *</Label>
              <Select 
                value={formData.paymentStatus} 
                onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                required
              >
                <SelectTrigger id="paymentStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="complimentary">Complimentary (Free)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method - Only show if paid or complimentary */}
            {(formData.paymentStatus === "paid" || formData.paymentStatus === "complimentary") && (
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="complimentary">Complimentary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount Paid - Only show if paid */}
            {formData.paymentStatus === "paid" && (
              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid (₹)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this enrollment..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Enrolling..." : "Enroll User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
