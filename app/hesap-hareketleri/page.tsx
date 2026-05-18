'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSube } from '@/context/SubeContext'

export default function HesapHareketleri() {
  const { aktifSubeId } = useSube()
  const [hareketler, setHareketler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState({ arama: '', tur: 'HEPSI' })

  useEffect(() => {
    if (aktifSubeId) fetchHareketler()
  }, [aktifSubeId, filtre.tur])

  const fetchHareketler = async () => {
    setLoading(true)
    // ŞEMAYA GÖRE DÜZENLENDİ: created_at yerine 'tarih' kullanıyoruz
    let query = supabase
      .from('hesap_hareketleri')
      .select(`
        *,
        hesaplar (hesap_adi),
        cariler (firma_adi)
      `)
      .eq('sube_id', aktifSubeId)
      .order('tarih', { ascending: false }) 

    if (filtre.tur !== 'HEPSI') {
      query = query.eq('islem_turu', filtre.tur)
    }

    const { data, error } = await query
    if (error) {
      console.error("Sorgu Hatası:", error.message)
    } else {
      setHareketler(data || [])
    }
    setLoading(false)
  }

  const hareketSil = async (id: string, tutar: number, hesapId: string, tur: string) => {
    if (!confirm("Bu işlem kaydını silmek istediğinize emin misiniz? Bakiyeniz bu silme işlemine göre güncellenecektir.")) return

    try {
      const { error: silHata } = await supabase.from('hesap_hareketleri').delete().eq('id', id)
      if (silHata) throw silHata

      // Bakiyeyi ters işlemle düzeltme
      const { data: hesap } = await supabase.from('hesaplar').select('guncel_bakiye').eq('id', hesapId).single()
      const yeniBakiye = tur === 'GIRIS' 
        ? (hesap?.guncel_bakiye || 0) - tutar 
        : (hesap?.guncel_bakiye || 0) + tutar

      await supabase.from('hesaplar').update({ guncel_bakiye: yeniBakiye }).eq('id', hesapId)

      alert("İşlem silindi ve kasa bakiyesi güncellendi.")
      fetchHareketler()
    } catch (e: any) {
      alert("Hata: " + e.message)
    }
  }

  const filtrelenmisData = hareketler.filter(h => 
    h.aciklama?.toLowerCase().includes(filtre.arama.toLowerCase()) ||
    h.hesaplar?.hesap_adi?.toLowerCase().includes(filtre.arama.toLowerCase()) ||
    h.cariler?.firma_adi?.toLowerCase().includes(filtre.arama.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Hesap Hareketleri</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Kasa, Banka ve Cari Ödeme Kayıtları</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <select 
            className="flex-1 md:flex-none p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all"
            value={filtre.tur}
            onChange={e => setFiltre({...filtre, tur: e.target.value})}
           >
              <option value="HEPSI">TÜMÜ</option>
              <option value="GIRIS">GİRİŞLER</option>
              <option value="CIKIS">ÇIKIŞLAR</option>
           </select>
           <input 
            placeholder="Açıklama, hesap veya cari ara..." 
            className="flex-[2] md:w-64 p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all"
            onChange={e => setFiltre({...filtre, arama: e.target.value})}
           />
        </div>
      </header>

      <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <th className="p-5">Tarih</th>
                <th className="p-5">Hesap / Kasa</th>
                <th className="p-5">İlgili Cari</th>
                <th className="p-5">İşlem</th>
                <th className="p-5">Açıklama</th>
                <th className="p-5 text-right">Tutar</th>
                <th className="p-5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-bold text-sm text-slate-600">
              {loading ? (
                <tr><td colSpan={7} className="p-20 text-center text-blue-500 font-black animate-pulse">VERİLER YÜKLENİYOR...</td></tr>
              ) : filtrelenmisData.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5 text-[11px] whitespace-nowrap">
                    {h.tarih ? new Date(h.tarih).toLocaleString('tr-TR') : '-'}
                  </td>
                  <td className="p-5 text-slate-900 uppercase">{h.hesaplar?.hesap_adi || 'Bilinmeyen Hesap'}</td>
                  <td className="p-5 text-slate-500 text-xs">{h.cariler?.firma_adi || '-'}</td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black ${h.islem_turu === 'GIRIS' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {h.islem_turu === 'GIRIS' ? 'GİRİŞ' : 'ÇIKIŞ'}
                    </span>
                  </td>
                  <td className="p-5 italic text-slate-400 font-medium max-w-[200px] truncate">{h.aciklama || '-'}</td>
                  <td className={`p-5 text-right text-base font-black ${h.islem_turu === 'GIRIS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {h.islem_turu === 'CIKIS' ? '-' : '+'} {Number(h.tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                  </td>
                  <td className="p-5">
                    <button 
                      onClick={() => hareketSil(h.id, h.tutar, h.hesap_id, h.islem_turu)} 
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtrelenmisData.length === 0 && (
                <tr><td colSpan={7} className="p-20 text-center text-slate-300 uppercase font-black tracking-widest">Kayıtlı hareket bulunamadı</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}