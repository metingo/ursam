import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { SubeProvider } from "@/context/SubeContext"; // Bunu ekledik
import SubeSeciciNavbar from "@/components/SubeSeciciNavbar"; // Bunu ekledik
import { Toaster } from 'react-hot-toast';


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UrSaM | Pastane Yönetimi",
  description: "Üretim ve Satış Takip Sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const menuItems = [
    { name: "Dashboard", href: "/", icon: "📊" },
    { name: "Şube Yönetimi", href: "/subeler", icon: "🏢" },
    { name: "Kasa & Hesaplar", href: "/hesaplar", icon: "💰" },
    { name: "Cari Yönetimi", href: "/cariler", icon: "👥" },
    { name: "Stok Kartları", href: "/stoklar", icon: "📦" },
    { name: "Faturalar", href: "/faturalar", icon: "📄" },
    { name: "Hızlı Satış (POS)", href: "/satis", icon: "🛒" },
   
    { name: "Alış Faturası ", href: "/alis-faturasi", icon: "📑" },
    { name: "Reçeteler", href: "/receteler", icon: "🥐" },
    { name: "Üretim Emri", href: "/uretim-emri", icon: "🔥" },
    { name: "Zayi Takibi", href: "/zayi-takibi", icon: "🗑️" },
  ];

  return (
    <html lang="tr">
      <body className={inter.className}>
 
    <Toaster position="top-center" reverseOrder={false} />

        {/* SubeProvider her şeyin en dışında olmalı ki useSube hata vermesin */}
        <SubeProvider> 
          <div className="flex min-h-screen bg-gray-100 text-black">
            {/* SIDEBAR */}
            <aside className="w-64 bg-white border-r shadow-sm flex flex-col fixed h-full z-50">
              <div className="p-6 border-b">
                <h1 className="text-2xl font-bold text-blue-600 tracking-tight">UrSaM</h1>
                <p className="text-xs text-gray-400">Pastane Yönetim Sistemi</p>
              </div>
              
              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all font-medium text-sm"
                  >
                    <span>{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>

              <div className="p-4 border-t bg-gray-50 space-y-4">
                {/* Statik yazı yerine yeni bileşeni ekledik */}
                <SubeSeciciNavbar />

                <div className="flex items-center gap-3 px-2 pt-2 border-t">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
                    AD
                  </div>
                  <div className="text-sm">
                    <p className="font-bold">Admin Kullanıcı</p>
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Yönetici</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 ml-64 p-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </SubeProvider>
      </body>
    </html>
  );
}