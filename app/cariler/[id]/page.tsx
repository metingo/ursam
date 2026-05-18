'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function CariEkstre({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()

  const [cari, setCari] = useState<any>(null)
  const [hareketler, setHareketler] = useState<any[]>([])
  const [hesaplar, setHesaplar] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [baslangic, setBaslangic] = useState('')
  const [bitis, setBitis] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [islemTuru, setIslemTuru] = useState<'ODEME' | 'TAHSILAT'>('ODEME')
  const [form, setForm] = useState({ 
    hesap_id: '', 
    tutar: 0, 
    aciklama: '', 
    tarih: new Date().toISOString().split('T')[0] 
  })

  useEffect(() => { fetchCariVerileri(); fetchHesaplar(); }, [id])

  const fetchCariVerileri = async () => {
    setLoading(true)
    const { data: cData } = await supabase.from('cariler').select('*').eq('id', id).single()
    // Şemana göre 'tarih' sütununu kullanıyoruz
    const { data: hData } = await supabase.from('cari_hareketleri').select('*').eq('cari_id', id).order('tarih', { ascending: false })
    setCari(cData); setHareketler(hData || []); setLoading(false)
  }

  const fetchHesaplar = async () => {
    const { data } = await supabase.from('hesaplar').select('*').order('hesap_adi')
    setHesaplar(data || [])
  }

  const hareketSil = async (hId: string) => {
    if (!confirm("Bu işlem bakiyeleri otomatik düzeltecektir. Silinsin mi?")) return
    await supabase.from('cari_hareketleri').delete().eq('id', hId)
    fetchCariVerileri()
  }

  const islemKaydet = async (e: React.FormEvent) => {
    e.preventDefault()
    const aktifSubeId = localStorage.getItem('aktifSubeId')
    if (!form.hesap_id || form.tutar <= 0) return alert("Eksik bilgi!")

    const payload = {
      cari_id: id,
      hesap_id: form.hesap_id,
      islem_turu: islemTuru,
      borc: islemTuru === 'ODEME' ? form.tutar : 0,
      alacak: islemTuru === 'TAHSILAT' ? form.tutar : 0,
      aciklama: form.aciklama,
      tarih: form.tarih, // Şemadaki 'tarih' sütunu
      sube_id: aktifSubeId
    }

    const { error } = await supabase.from('cari_hareketleri').insert([payload])
    if (error) alert("Hata: " + error.message)
    else { setIsModalOpen(false); fetchCariVerileri(); }
  }

  // Filtreleme (tarih sütununa göre)
  const filtrelenmis = hareketler.filter(h => {
    const hTarih = h.tarih?.split('T')[0]
    return (!baslangic || hTarih >= baslangic) && (!bitis || hTarih <= bitis)
  })

  // Bakiye Hesaplama (Şemandaki guncel_bakiye numeric olduğu için güvenli hesaplama)
  const bakiye = (Number(cari?.toplam_alacak) || 0) - (Number(cari?.toplam_borc) || 0)

  // RAPORLAMA
  const exportPDF = () => {
    const doc = new jsPDF()
    autoTable(doc, {
      head: [['Tarih', 'İşlem', 'Açıklama', 'Borç', 'Alacak']],
      body: filtrelenmis.map(h => [new Date(h.tarih).toLocaleDateString('tr-TR'), h.islem_turu, h.aciklama, h.borc, h.alacak])
    })
    doc.save('ekstre.pdf')
  }

  if (loading) return <div className="p-20 text-center font-black">YÜKLENİYOR...</div>

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
        {/* Üst Bilgi Kartı */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border flex justify-between items-center mb-6">
            <div>
                <h1 className="text-5xl font-black uppercase tracking-tighter">{cari?.firma_adi}</h1>
                <p className="text-slate-400 font-bold uppercase text-xs mt-2">{cari?.yetkili_adi} | {cari?.telefon}</p>
            </div>
            <div className="text-right">
                <div className={`text-6xl font-black ${bakiye >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Math.abs(bakiye).toLocaleString('tr-TR')} ₺
                </div>
                <div className="text-[10px] font-black opacity-30 uppercase tracking-widest">
                    {bakiye >= 0 ? 'ALACAKLIYIZ' : 'BORÇLUYUZ'}
                </div>
            </div>
        </div>

        {/* Aksiyon Barı */}
        <div className="bg-white p-6 rounded-[2rem] border flex justify-between items-center mb-6 shadow-sm">
            <div className="flex gap-2">
                <button onClick={() => { setIslemTuru('TAHSILAT'); setIsModalOpen(true); }} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs">💰 TAHSİLAT</button>
                <button onClick={() => { setIslemTuru('ODEME'); setIsModalOpen(true); }} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black text-xs">💸 ÖDEME</button>
            </div>
            <div className="flex gap-3">
                <input type="date" className="p-3 bg-slate-100 rounded-xl font-bold text-xs" value={baslangic} onChange={e => setBaslangic(e.target.value)} />
                <input type="date" className="p-3 bg-slate-100 rounded-xl font-bold text-xs" value={bitis} onChange={e => setBitis(e.target.value)} />
                <button onClick={exportPDF} className="p-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase px-6">PDF</button>
            </div>
        </div>

        {/* Hareket Tablosu */}
        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                    <tr>
                        <th className="p-6">Tarih</th>
                        <th className="p-6">İşlem</th>
                        <th className="p-6">Açıklama</th>
                        <th className="p-6 text-right">Borç (-)</th>
                        <th className="p-6 text-right">Alacak (+)</th>
                        <th className="p-6 text-center">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y font-bold uppercase text-xs">
                    {filtrelenmis.map(h => (
                        <tr key={h.id} className="hover:bg-slate-50 transition-all">
                            <td className="p-6 text-slate-400">{new Date(h.tarih).toLocaleDateString('tr-TR')}</td>
                            <td className="p-6">
                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${h.islem_turu === 'TAHSILAT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {h.islem_turu}
                                </span>
                            </td>
                            <td className="p-6 text-slate-600">{h.aciklama}</td>
                            <td className="p-6 text-right text-rose-600">{h.borc > 0 ? h.borc.toLocaleString() : '-'}</td>
                            <td className="p-6 text-right text-emerald-600">{h.alacak > 0 ? h.alacak.toLocaleString() : '-'}</td>
                            <td className="p-6 text-center">
                                <button onClick={() => hareketSil(h.id)} className="text-slate-300 hover:text-rose-600 transition-colors">🗑️</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* İşlem Modalı */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
                <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
                    <h2 className="text-3xl font-black mb-6 uppercase italic">{islemTuru} KAYDI</h2>
                    <form onSubmit={islemKaydet} className="space-y-4">
                        <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-100" value={form.hesap_id} onChange={e => setForm({...form, hesap_id: e.target.value})} required>
                            <option value="">Hesap Seçiniz...</option>
                            {hesaplar.map(h => <option key={h.id} value={h.id}>{h.hesap_adi} ({h.bakiye} ₺)</option>)}
                        </select>
                        <input type="number" placeholder="Tutar" className="w-full p-4 bg-slate-50 rounded-2xl font-black text-xl" value={form.tutar} onChange={e => setForm({...form, tutar: parseFloat(e.target.value)})} required />
                        <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={form.tarih} onChange={e => setForm({...form, tarih: e.target.value})} />
                        <textarea placeholder="Açıklama" className="w-full p-4 bg-slate-50 rounded-2xl font-bold min-h-[100px]" value={form.aciklama} onChange={e => setForm({...form, aciklama: e.target.value})} />
                        <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase shadow-lg">Kaydet</button>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-[10px] font-black text-slate-400 uppercase mt-2">Vazgeç</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  )
}