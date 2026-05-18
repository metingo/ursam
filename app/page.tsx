'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    cariSayisi: 0,
    stokSayisi: 0,
    toplamBorc: 0,
    toplamAlacak: 0
  })

  useEffect(() => {
    const getStats = async () => {
      const { count: cCount } = await supabase.from('cariler').select('*', { count: 'exact', head: true })
      const { count: sCount } = await supabase.from('stok_kartlari').select('*', { count: 'exact', head: true })
      
      // Cari bakiyelerini hesapla (Özet borç/alacak)
      const { data: hareketler } = await supabase.from('cari_hareketleri').select('borc, alacak')
      const alacak = hareketler?.reduce((acc, curr) => acc + (curr.alacak || 0), 0) || 0
      const borc = hareketler?.reduce((acc, curr) => acc + (curr.borc || 0), 0) || 0

      setStats({
        cariSayisi: cCount || 0,
        stokSayisi: sCount || 0,
        toplamAlacak: alacak, // Tedarikçilere olan toplam borcumuz
        toplamBorc: borc      // Müşterilerin bize olan borcu
      })
    }
    getStats()
  }, [])

  const cards = [
    { title: "Toplam Cari", value: stats.cariSayisi, color: "border-blue-500", icon: "👥" },
    { title: "Stok Kalemi", value: stats.stokSayisi, color: "border-indigo-500", icon: "📦" },
    { title: "Tedarikçi Borç", value: stats.toplamAlacak.toFixed(2) + " ₺", color: "border-red-500", icon: "📉" },
    { title: "Müşteri Alacak", value: stats.toplamBorc.toFixed(2) + " ₺", color: "border-green-500", icon: "📈" },
  ]

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Genel Durum</h1>
        <p className="text-gray-500">İşletmenizin canlı verileri aşağıdadır.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card, i) => (
          <div key={i} className={`bg-white p-6 rounded-xl border-l-4 ${card.color} shadow-sm transition-transform hover:scale-105`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">{card.title}</p>
                <h3 className="text-2xl font-black mt-1 text-black">{card.value}</h3>
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Buraya son 5 fatura veya stok uyarısı gelecek tabloyu ekleyebiliriz */}
         <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold mb-4">Hızlı Erişim</h2>
            <div className="grid grid-cols-2 gap-4">
               <a href="/alis-faturasi" className="p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition text-center font-bold text-blue-600 border border-transparent hover:border-blue-200">➕ Yeni Alış</a>
               <a href="/cariler" className="p-4 bg-gray-50 rounded-lg hover:bg-indigo-50 transition text-center font-bold text-indigo-600 border border-transparent hover:border-indigo-200">👥 Cari Ekle</a>
            </div>
         </div>
      </div>
    </div>
  )
}