export default function TravelerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>Traveler Navbar</nav>
      <main>{children}</main>
      <footer>TravelHub Footer</footer>
    </div>
  );
}
