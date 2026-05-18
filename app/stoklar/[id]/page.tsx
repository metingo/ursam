'use client'
import { useEffect, useState, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function StokEkstre({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  
  const [stok, setStok] = useState<any>(null)
  const [hareketler, setHareketler] = useState<any[]>([])
  const [cariler, setCariler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filtre State'leri
  const [baslangicTarih, setBaslangicTarih] = useState('')
  const [bitisTarih, setBitisTarih] = useState('')
  const [seciliCari, setSeciliCari] = useState('')

  useEffect(() => {
    const fetchDetay = async () => {
      const { data: sData } = await supabase.from('stok_kartlari').select('*, birimler(birim_adi)').eq('id', id).single()
      const { data: hData } = await supabase.from('stok_hareketleri').select('*, cariler(firma_adi)').eq('stok_id', id).order('tarih', { ascending: false })
      const { data: cData } = await supabase.from('cariler').select('id, firma_adi')
      
      setStok(sData); setHareketler(hData || []); setCariler(cData || []); setLoading(false)
    }
    fetchDetay()
  }, [id])

  const hareketSil = async (hId: string) => {
    if (confirm("Bu hareketi silmek bakiyeleri geri alacaktır. Emin misiniz?")) {
      await supabase.from('stok_hareketleri').delete().eq('id', hId)
      window.location.reload()
    }
  }

  // --- FİLTRELEME MANTIĞI ---
  const filtrelenmisHareketler = hareketler.filter(h => {
    const tarih = new Date(h.tarih).toISOString().split('T')[0]
    const tarihUygun = (!baslangicTarih || tarih >= baslangicTarih) && (!bitisTarih || tarih <= bitisTarih)
    const cariUygun = !seciliCari || h.cari_id === seciliCari
    return tarihUygun && cariUygun
  })

  // --- RAPORLAMA ---
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtrelenmisHareketler.map(h => ({
      'Tarih': new Date(h.tarih).toLocaleDateString('tr-TR'),
      'İşlem': h.islem_turu, 'Cari': h.cariler?.firma_adi || 'Genel', 'Miktar': h.miktar
    })))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Ekstre");
    XLSX.writeFile(wb, `${stok?.urun_adi}_ekstre.xlsx`)
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const tableData = filtrelenmisHareketler.map(h => [
        new Date(h.tarih).toLocaleDateString('tr-TR'), 
        h.islem_turu, h.cariler?.firma_adi || 'Genel', h.miktar
    ])
    autoTable(doc, { head: [['Tarih', 'İşlem', 'Cari/Kaynak', 'Miktar']], body: tableData })
    doc.save(`${stok?.urun_adi}_ekstre.pdf`)
  }

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase">Veriler Alınıyor...</div>

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border flex justify-between items-end">
          <div>
            <button onClick={() => router.back()} className="text-[10px] font-black text-indigo-600 uppercase mb-4 block hover:underline">← Geri Dön</button>
            <h1 className="text-5xl font-black uppercase tracking-tighter italic">{stok?.urun_adi}</h1>
            <p className="text-slate-400 font-bold uppercase text-xs mt-2">Mevcut Stok: {stok?.mevcut_stok} {stok?.birimler?.birim_adi}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
             <div className="text-6xl font-black text-slate-900">{stok?.satis_fiyati} ₺</div>
             <div className="flex gap-2">
                <button onClick={exportExcel} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black">EXCEL</button>
                <button onClick={exportPDF} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black">PDF</button>
             </div>
          </div>
        </div>

        {/* EKSTRE FİLTRELERİ */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Başlangıç</label>
                <input type="date" className="p-3 bg-slate-50 rounded-xl font-bold text-xs" value={baslangicTarih} onChange={e => setBaslangicTarih(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Bitiş</label>
                <input type="date" className="p-3 bg-slate-50 rounded-xl font-bold text-xs" value={bitisTarih} onChange={e => setBitisTarih(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Cari Filtresi</label>
                <select className="p-3 bg-slate-50 rounded-xl font-bold text-xs" value={seciliCari} onChange={e => setSeciliCari(e.target.value)}>
                    <option value="">Tüm Cariler</option>
                    {cariler.map(c => <option key={c.id} value={c.id}>{c.firma_adi}</option>)}
                </select>
            </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black">
              <tr>
                <th className="p-6">Tarih</th>
                <th className="p-6">İşlem Türü</th>
                <th className="p-6">Cari / Kaynak</th>
                <th className="p-6 text-center">Miktar</th>
                <th className="p-6 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y font-bold">
              {filtrelenmisHareketler.map(h => (
                <tr key={h.id} className="hover:bg-slate-50">
                  <td className="p-6 text-xs text-slate-400">{new Date(h.tarih).toLocaleDateString('tr-TR')}</td>
                  <td className="p-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${h.islem_turu.includes('GIRIS') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {h.islem_turu}
                    </span>
                  </td>
                  <td className="p-6 text-xs uppercase">{h.cariler?.firma_adi || 'Genel Giriş'}</td>
                  <td className={`p-6 text-center text-xl font-black ${h.islem_turu.includes('GIRIS') ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {h.islem_turu.includes('GIRIS') ? '+' : '-'}{h.miktar}
                  </td>
                  <td className="p-6 text-right">
                    <button onClick={() => hareketSil(h.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-xs">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}