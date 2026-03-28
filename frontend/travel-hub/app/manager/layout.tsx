import AuthGuard from '../components/AuthGuard';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div style={{ display: 'flex' }}>
        <aside>Manager Sidebar</aside>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </AuthGuard>
  );
}
