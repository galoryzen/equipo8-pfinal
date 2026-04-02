import AuthGuard from '@/app/components/AuthGuard';

export default function ProtectedTravelerLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
