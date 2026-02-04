import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <div className="flex-1">
        <div className="max-w-[1150px] mx-auto flex gap-2.5 pt-2.5 px-2 sm:px-4">
          {/* Left Sidebar */}
          <aside className="hidden lg:block w-[180px] flex-shrink-0">
            <div className="sticky top-[58px]">
              <Sidebar />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 pb-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
