import AuthGuard from '../components/AuthGuard';

export default function TravelerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div>
        <nav>Traveler Navbar</nav>
        <main>{children}</main>
        <footer>TravelHub Footer</footer>
      </div>
    </AuthGuard>
  );
}
