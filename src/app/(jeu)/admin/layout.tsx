import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/data/admin";

/**
 * Zone réservée au rôle admin. Le layout ne suffit pas (rendu en parallèle des pages) :
 * chaque page appelle aussi requireAdmin(), et la base protège écritures et lectures (RLS / RPC).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <div className="mb-4">
        <p className="font-display text-xs font-bold tracking-widest text-r-iconique uppercase">Administration</p>
        <AdminNav />
      </div>
      {children}
    </>
  );
}
