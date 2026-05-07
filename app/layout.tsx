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
          <main className="ml-64 p-6 w-full min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}