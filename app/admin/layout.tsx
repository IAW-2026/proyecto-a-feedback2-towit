import { AdminTopbar } from "../ui/admin-topbar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AdminTopbar />
      <main className="flex-1">{children}</main>
    </>
  );
}
