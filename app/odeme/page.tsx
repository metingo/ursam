'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function OdemeEkrani() {
  const [cariler, setCariler] = useState<any[]>([])
  const [hesaplar, setHesaplar] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    cari_id: '',
    hesap_id: '',
    tutar: 0,
    aciklama: '',
    tarih: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: c } = await supabase.from('cariler').select('*').order('firma_adi')
    const { data: h } = await supabase.from('hesaplar').select('*').order('hesap_adi')
    setCariler(c || [])
    setHesaplar(h || [])
  }

  const odemeYap = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cari_id || !form.hesap_id || form.tutar <= 0) return alert("Lütfen tüm alanları doldurun!")
    
    setLoading(true)
    try {
      // 1. ADIM: Cari Hareket Kaydı
      const { error: e1 } = await supabase.from('cari_hareketleri').insert([{
        cari_id: form.cari_id,
        islem_turu: 'ODEME',
        borc: form.tutar, // Carinin borç hanesine (bizim ödememiz)
        alacak: 0,
        aciklama: `Ödeme: ${form.aciklama}`,
        kayit_tarihi: form.tarih
      }])
      if (e1) throw e1

      // 2. ADIM: Cari Kart Bakiyesi Güncelle (toplam_borc artar)
      const { data: cariData } = await supabase.from('cariler').select('toplam_borc').eq('id', form.cari_id).single()
      const yeniCariBorc = (cariData?.toplam_borc || 0) + form.tutar
      await supabase.from('cariler').update({ toplam_borc: yeniCariBorc }).eq('id', form.cari_id)

      // 3. ADIM: Hesap/Kasa Bakiyesi Güncelle (Para kasadan çıkar)
      const { data: hesapData } = await supabase.from('hesaplar').select('guncel_bakiye').eq('id', form.hesap_id).single()
      const yeniKasaBakiyesi = (hesapData?.guncel_bakiye || 0) - form.tutar
      await supabase.from('hesaplar').update({ guncel_bakiye: yeniKasaBakiyesi }).eq('id', form.hesap_id)

      alert("Ödeme Başarılı! Kasadan düşüldü ve Cari bakiyesi güncellendi.")
      setForm({ ...form, tutar: 0, aciklama: '' })
      fetchData() // Listeleri tazele

    } catch (error: any) {
      alert("Hata: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 text-black max-w-3xl mx-auto">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        <h1 className="text-3xl font-black text-slate-800 mb-2">💸 CARİ ÖDEME</h1>
        <p className="text-slate-400 mb-8 border-b pb-4 text-sm font-medium">Kasadan veya bankadan tedarikçiye para çıkışı yapın.</p>

        <form onSubmit={odemeYap} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ödeme Yapılacak Cari</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition" 
                value={form.cari_id} onChange={e => setForm({...form, cari_id: e.target.value})} required>
                <option value="">Seçiniz...</option>
                {cariler.map(c => <option key={c.id} value={c.id}>{c.firma_adi} (Borç: {(c.toplam_alacak - c.toplam_borc).toFixed(2)} ₺)</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Para Çıkacak Hesap</label>
              <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 transition" 
                value={form.hesap_id} onChange={e => setForm({...form, hesap_id: e.target.value})} required>
                <option value="">Seçiniz...</option>
                {hesaplar.map(h => <option key={h.id} value={h.id}>{h.hesap_adi} (Bakiye: {h.guncel_bakiye.toFixed(2)} ₺)</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ödeme Tutarı</label>
              <input type="number" step="0.01" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold" 
                value={form.tutar} onChange={e => setForm({...form, tutar: parseFloat(e.target.value)})} required />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">İşlem Tarihi</label>
              <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" 
                value={form.tarih} onChange={e => setForm({...form, tarih: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Açıklama</label>
            <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl" 
              placeholder="Örn: 123 nolu fatura ödemesi" value={form.aciklama} onChange={e => setForm({...form, aciklama: e.target.value})} />
          </div>

          <button disabled={loading} className={`w-full py-5 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${loading ? 'bg-slate-400' : 'bg-rose-600 hover:bg-rose-700'}`}>
            {loading ? 'İŞLENİYOR...' : 'ÖDEMEYİ ONAYLA VE KASADAN DÜŞ'}
          </button>
        </form>
      </div>
    </div>
  )
}