import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';

export default function TravelerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
