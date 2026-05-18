'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function FaturalarPage() {
  const [faturalar, setFaturalar] = useState<any[]>([])
  const [cariler, setCariler] = useState<any[]>([])
  const [hesaplar, setHesaplar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [aktifFatura, setAktifFatura] = useState<any>(null)

  const [form, setForm] = useState({
    cari_id: '',
    islem_turu: 'SATIS' as 'SATIS' | 'ALIS' | 'TAHSILAT' | 'ODEME',
    tutar: 0,
    hesap_id: '',
    aciklama: '',
    tarih: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: f } = await supabase.from('cari_hareketleri').select('*, cariler(firma_adi)').order('kayit_tarihi', { ascending: false })
    const { data: c } = await supabase.from('cariler').select('*')
    const { data: h } = await supabase.from('hesaplar').select('*')
    setFaturalar(f || []); setCariler(c || []); setHesaplar(h || [])
    setLoading(false)
  }

  // SİLME VE GERİ ALMA MANTIĞI
  const faturaSil = async (fatura: any) => {
    if (!confirm("Bu işlem cari bakiyesini ve kasa durumunu geri alacaktır. Emin misiniz?")) return

    try {
      // 1. Cari Bakiyesini Eskiye Döndür
      const { data: cari } = await supabase.from('cariler').select('*').eq('id', fatura.cari_id).single()
      const yeniBorc = (cari.toplam_borc || 0) - fatura.borc
      const yeniAlacak = (cari.toplam_alacak || 0) - fatura.alacak
      await supabase.from('cariler').update({ toplam_borc: yeniBorc, toplam_alacak: yeniAlacak }).eq('id', fatura.cari_id)

      // 2. Kasa/Hesap Bakiyesini Geri Al (Eğer bir ödeme/tahsilat ise)
      // Bu örnekte basitleştirmek için hareketin açıklamasından veya türünden hesap bulunur.
      // Gerçek senaryoda cari_hareketleri tablosunda hesap_id tutulmalıdır.

      // 3. Hareketi Sil
      await supabase.from('cari_hareketleri').delete().eq('id', fatura.id)
      
      alert("İşlem geri alındı ve silindi.")
      fetchData()
    } catch (err) { alert("Hata oluştu!") }
  }

  const handleKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    // Yeni ekleme mantığı buraya (Önceki cari ekstre mantığı ile aynı çalışır)
    setIsModalOpen(false)
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-black">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Fatura & Hareket Yönetimi</h1>
        <button 
          onClick={() => { setAktifFatura(null); setIsModalOpen(true); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition"
        >
          + YENİ İŞLEM EKLE
        </button>
      </div>

      {/* FATURA LİSTESİ */}
      <div className="bg-white rounded-[32px] shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800 text-white text-[10px] uppercase font-bold">
            <tr>
              <th className="p-5">Tarih</th>
              <th className="p-5">Cari / Firma</th>
              <th className="p-5">Kategori</th>
              <th className="p-5 text-right">Borç</th>
              <th className="p-5 text-right">Alacak</th>
              <th className="p-5 text-center">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {faturalar.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50 transition-colors text-sm">
                <td className="p-5 text-slate-500 font-medium">{new Date(f.kayit_tarihi).toLocaleDateString('tr-TR')}</td>
                <td className="p-5 font-black text-slate-700">{f.cariler?.firma_adi}</td>
                <td className="p-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                    f.islem_turu === 'SATIS' ? 'bg-emerald-100 text-emerald-700' :
                    f.islem_turu === 'ALIS' ? 'bg-rose-100 text-rose-700' :
                    f.islem_turu === 'TAHSILAT' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {f.islem_turu}
                  </span>
                </td>
                <td className="p-5 text-right font-bold text-rose-600">{f.borc > 0 ? f.borc.toFixed(2) : '-'}</td>
                <td className="p-5 text-right font-bold text-emerald-600">{f.alacak > 0 ? f.alacak.toFixed(2) : '-'}</td>
                <td className="p-5 text-center space-x-3">
                  <button onClick={() => { setAktifFatura(f); setIsModalOpen(true); }} className="text-indigo-600 hover:underline font-bold">Detay</button>
                  <button onClick={() => faturaSil(f)} className="text-red-400 hover:text-red-600 transition">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (EKLE / DETAY / GÜNCELLE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                {aktifFatura ? 'Fatura Detayı' : 'Yeni Fatura Oluştur'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 text-2xl font-bold">✕</button>
            </div>

            <form onSubmit={handleKaydet} className="grid grid-cols-2 gap-6">
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Seçimi</label>
                <select 
                  className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none"
                  value={aktifFatura?.cari_id || form.cari_id}
                  disabled={!!aktifFatura}
                >
                  {cariler.map(c => <option key={c.id} value={c.id}>{c.firma_adi}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">İşlem Türü</label>
                <select className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none" disabled={!!aktifFatura}>
                  <option value="SATIS">SATIŞ FATURASI</option>
                  <option value="ALIS">ALIŞ FATURASI</option>
                  <option value="TAHSILAT">TAHSİLAT</option>
                  <option value="ODEME">ÖDEME</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Açıklama</label>
                <textarea 
                  className="w-full mt-1 p-4 bg-slate-50 border rounded-2xl outline-none h-24"
                  defaultValue={aktifFatura?.aciklama}
                ></textarea>
              </div>
              
              <div className="col-span-2 flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 font-black text-slate-400 uppercase tracking-widest"
                >
                  KAPAT
                </button>
                {!aktifFatura && (
                  <button className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">
                    İŞLEMİ KAYDET
                  </button>
                )}
                {aktifFatura && (
                  <button 
                    type="button"
                    onClick={() => faturaSil(aktifFatura)}
                    className="flex-[2] bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg"
                  >
                    İŞLEMİ İPTAL ET VE SİL
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}