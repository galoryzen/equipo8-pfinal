export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex' }}>
      <aside>Manager Sidebar</aside>
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
}
