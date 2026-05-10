import './globals.css';
import Sidebar from '../components/Sidebar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <div className="flex">
          <Sidebar />
          <main className="md:ml-64 w-full min-h-screen p-4 md:p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}