import type { Metadata } from "next";
import Link from "next/link";
import { NotificationList } from "@/components/community/NotificationList";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Panel";
import { listNotifications, NOTIFICATIONS_PAGE_SIZE } from "@/lib/data/notifications";
import { requireProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  await requireProfile();
  const { page: raw } = await searchParams;
  const page = Math.max(1, Math.min(1000, Number.parseInt(String(raw ?? "1"), 10) || 1));
  const { rows, total } = await listNotifications(page);
  const pages = Math.max(1, Math.ceil(total / NOTIFICATIONS_PAGE_SIZE));

  return (
    <>
      <PageHeader title="Notifications" subtitle={`${total} au total`} />
      {rows.length === 0 ? (
        <EmptyState title="Silence radio">Aucune notification pour l&apos;instant.</EmptyState>
      ) : (
        <NotificationList rows={rows} />
      )}
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={`/notifications?page=${page - 1}`} className={buttonClasses("secondary", "sm")}>← Plus récentes</Link> : <span />}
          <span className="text-chalk-muted tabular-nums">Page {page} / {pages}</span>
          {page < pages ? <Link href={`/notifications?page=${page + 1}`} className={buttonClasses("secondary", "sm")}>Plus anciennes →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
