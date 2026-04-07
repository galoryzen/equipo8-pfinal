import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function TravelerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
