import { Topbar } from "../ui/topbar";

export default function EndUserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Topbar />
      <main className="flex-1">{children}</main>
    </>
  );
}
