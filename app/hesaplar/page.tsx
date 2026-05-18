'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useSube } from '@/context/SubeContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function HesapYonetimi() {
  const { aktifSubeId } = useSube()
  const [hesaplar, setHesaplar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal Kontrolleri
  const [isFormOpen, setIsFormOpen] = useState(false) // Sol Modal
  const [seciliHesap, setSeciliHesap] = useState<any>(null) // Sağ Modal
  
  // State Yönetimi
  const [form, setForm] = useState({ hesap_adi: '', hesap_turu: 'NAKİT', guncel_bakiye: 0 })
  const [hamEkstreVerisi, setHamEkstreVerisi] = useState<any[]>([])
  const [ekstreLoading, setEkstreLoading] = useState(false)
  
  // Tarih Filtresi (Ayın 1'inden Bugüne)
  const [ekstreFiltre, setEkstreFiltre] = useState({ 
    cari: '', 
    aciklama: '', 
    baslangic: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    bitis: new Date().toISOString().split('T')[0] 
  })

  useEffect(() => {
    if (aktifSubeId) fetchHesaplar()
  }, [aktifSubeId])

  async function fetchHesaplar() {
    setLoading(true)
    const { data } = await supabase
      .from('hesaplar')
      .select('*')
      .eq('sube_id', aktifSubeId)
      .order('hesap_adi')
    setHesaplar(data || [])
    setLoading(false)
  }

  // --- HESAP SİLME FONKSİYONU ---
  const hesapSil = async (id: string, hesapAdi: string) => {
    const { count } = await supabase
      .from('hesap_hareketleri')
      .select('*', { count: 'exact', head: true })
      .eq('hesap_id', id)

    if (count && count > 0) {
      alert(`"${hesapAdi}" hesabına ait ${count} adet işlem kaydı var. İşlem görmüş hesaplar silinemez!`);
      return;
    }

    if (!confirm(`"${hesapAdi}" hesabını silmek istediğinize emin misiniz?`)) return;

    const { error } = await supabase.from('hesaplar').delete().eq('id', id)
    if (error) alert("Hata: " + error.message)
    else fetchHesaplar()
  }

  // --- YENİ HESAP KAYDET (SOL MODAL) ---
  const handleHesapEkle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!aktifSubeId) return alert("Şube seçilmedi!")
    const { error } = await supabase.from('hesaplar').insert([{ ...form, sube_id: aktifSubeId }])
    if (error) alert(error.message)
    else {
      setForm({ hesap_adi: '', hesap_turu: 'NAKİT', guncel_bakiye: 0 })
      setIsFormOpen(false)
      fetchHesaplar()
    }
  }

  // --- EKSTRE VERİSİ ÇEK (SAĞ MODAL) ---
  const ekstreGetir = async (hesap: any) => {
    setSeciliHesap(hesap)
    setEkstreLoading(true)
    let query = supabase
      .from('hesap_hareketleri')
      .select('*, cariler(firma_adi)')
      .eq('hesap_id', hesap.id)
      .gte('tarih', ekstreFiltre.baslangic + 'T00:00:00')
      .lte('tarih', ekstreFiltre.bitis + 'T23:59:59')
      .order('tarih', { ascending: false })

    const { data, error } = await query
    if (!error) setHamEkstreVerisi(data || [])
    setEkstreLoading(false)
  }

  const filtrelenmisEkstre = useMemo(() => {
    return hamEkstreVerisi.filter(h => 
      (h.cariler?.firma_adi || '').toLowerCase().includes(ekstreFiltre.cari.toLowerCase()) &&
      (h.aciklama || '').toLowerCase().includes(ekstreFiltre.aciklama.toLowerCase())
    )
  }, [hamEkstreVerisi, ekstreFiltre.cari, ekstreFiltre.aciklama])

  // --- RAPORLAMA ---
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtrelenmisEkstre.map(h => ({
      Tarih: new Date(h.tarih).toLocaleString('tr-TR'),
      Cari: h.cariler?.firma_adi || '-',
      İşlem: h.islem_turu,
      Açıklama: h.aciklama,
      Tutar: h.tutar.toFixed(2)
    })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    XLSX.writeFile(wb, `${seciliHesap.hesap_adi}_Ekstre.xlsx`)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFont("helvetica", "bold")
    doc.text(`${seciliHesap.hesap_adi.toUpperCase()} EKSTRESI`, 14, 15)
    autoTable(doc, {
      startY: 25,
      head: [['Tarih', 'Cari/Firma', 'İşlem', 'Açıklama', 'Tutar']],
      body: filtrelenmisEkstre.map(h => [
        new Date(h.tarih).toLocaleString('tr-TR'),
        h.cariler?.firma_adi || '-',
        h.islem_turu,
        h.aciklama || '',
        h.tutar.toFixed(2) + " TL"
      ]),
      styles: { font: "helvetica", fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59] }
    })
    doc.save(`${seciliHesap.hesap_adi}_Ekstre.pdf`)
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-slate-50/50">
      {/* ÜST BAR */}
      <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] border shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">Hesaplar</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Kasa ve Banka Yönetimi</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          + Yeni Hesap Ekle
        </button>
      </header>

      {/* HESAP KARTLARI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {hesaplar.map(h => (
          <div 
            key={h.id} 
            onClick={() => ekstreGetir(h)}
            className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-500 cursor-pointer transition-all group relative"
          >
            {/* Silme Butonu */}
            <button 
              onClick={(e) => { e.stopPropagation(); hesapSil(h.id, h.hesap_adi); }}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-400 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all z-20"
            >
              ✕
            </button>

            <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase">{h.hesap_turu}</span>
            <h3 className="text-2xl font-black text-slate-800 mt-4 leading-tight group-hover:text-indigo-600 transition-colors italic">{h.hesap_adi}</h3>
            <p className="text-3xl font-black text-emerald-600 mt-2 tracking-tighter">
              {h.guncel_bakiye.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
            </p>
          </div>
        ))}
      </div>

      {/* --- SOL MODAL (YENİ HESAP) --- */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-start">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)} />
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl p-10 flex flex-col animate-in slide-in-from-left duration-300">
            <h2 className="text-3xl font-black text-slate-800 uppercase italic mb-10">Hesap Tanımla</h2>
            <form onSubmit={handleHesapEkle} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-2">HESAP ADI</label>
                <input className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-indigo-500" value={form.hesap_adi} onChange={e => setForm({...form, hesap_adi: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-2">HESAP TÜRÜ</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={form.hesap_turu} onChange={e => setForm({...form, hesap_turu: e.target.value})}>
                  <option value="NAKİT">NAKİT KASA</option>
                  <option value="BANKA">BANKA HESABI</option>
                  <option value="KREDİ KARTI">KREDİ KARTI</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-2">AÇILIŞ BAKİYESİ</label>
                <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-emerald-600 outline-none" value={form.guncel_bakiye} onChange={e => setForm({...form, guncel_bakiye: Number(e.target.value)})} />
              </div>
              <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-indigo-600 transition-all">Kaydet</button>
              <button type="button" onClick={() => setIsFormOpen(false)} className="w-full text-slate-400 font-black text-xs uppercase">Vazgeç</button>
            </form>
          </div>
        </div>
      )}

      {/* --- SAĞ MODAL (EKSTRE) --- */}
      {seciliHesap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSeciliHesap(null)} />
          <div className="relative bg-white w-full max-w-5xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-8 border-b flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-slate-800 uppercase italic tracking-tighter">{seciliHesap.hesap_adi}</h2>
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Hareket Detayları</p>
              </div>
              <button onClick={() => setSeciliHesap(null)} className="p-4 bg-slate-100 rounded-full font-black text-xs hover:bg-rose-500 hover:text-white transition-all">KAPAT</button>
            </div>

            {/* FİLTRE PANELİ */}
            <div className="p-6 bg-slate-50 border-b space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 ml-1">BAŞLANGIÇ</label>
                  <input type="date" className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-xs" value={ekstreFiltre.baslangic} onChange={e => setEkstreFiltre({...ekstreFiltre, baslangic: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 ml-1">BİTİŞ</label>
                  <input type="date" className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-xs" value={ekstreFiltre.bitis} onChange={e => setEkstreFiltre({...ekstreFiltre, bitis: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 ml-1">CARİ ARA</label>
                  <input placeholder="Firma..." className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-xs" value={ekstreFiltre.cari} onChange={e => setEkstreFiltre({...ekstreFiltre, cari: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 ml-1">AÇIKLAMA</label>
                  <input placeholder="Detay..." className="w-full p-3 rounded-xl border-none shadow-sm font-bold text-xs" value={ekstreFiltre.aciklama} onChange={e => setEkstreFiltre({...ekstreFiltre, aciklama: e.target.value})} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => ekstreGetir(seciliHesap)} className="w-full bg-slate-900 text-white h-[42px] rounded-xl font-black text-[10px] uppercase hover:bg-indigo-600 transition-all">SORGULA</button>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={exportExcel} className="px-5 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[10px] uppercase">Excel</button>
                <button onClick={exportPDF} className="px-5 py-2 bg-rose-100 text-rose-700 rounded-lg font-black text-[10px] uppercase">PDF</button>
              </div>
            </div>

            {/* TABLO */}
            <div className="flex-1 overflow-y-auto p-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-4">
                    <th className="pb-4">Tarih</th>
                    <th className="pb-4">Cari / Firma</th>
                    <th className="pb-4">Açıklama</th>
                    <th className="pb-4 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold">
                  {ekstreLoading ? (
                    <tr><td colSpan={4} className="py-20 text-center text-indigo-500 animate-pulse font-black uppercase">Veriler Çekiliyor...</td></tr>
                  ) : filtrelenmisEkstre.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-5 text-[11px] text-slate-500">{new Date(h.tarih).toLocaleString('tr-TR')}</td>
                      <td className="py-5 text-sm text-slate-800">{h.cariler?.firma_adi || '-'}</td>
                      <td className="py-5 text-sm text-slate-400 italic font-medium">{h.aciklama || '-'}</td>
                      <td className={`py-5 text-right text-base font-black ${h.islem_turu === 'GIRIS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {h.islem_turu === 'GIRIS' ? '+' : '-'} {h.tutar.toFixed(2)} ₺
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}