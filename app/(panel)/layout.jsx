import { AdminGuard } from "@/components/auth/admin-guard";
import { AdminShell } from "@/components/layouts/admin-shell";
export default function PanelLayout({ children }) {
  return (
    <AdminGuard>
      <AdminShell>{children}</AdminShell>
    </AdminGuard>
  );
}
