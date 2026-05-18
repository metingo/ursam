'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HizliSatisPage() {
  const [stoklar, setStoklar] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<string[]>([])
  const [seciliKategori, setSeciliKategori] = useState('HEPSİ')
  const [aramaTerimi, setAramaTerimi] = useState('')
  const [sepet, setSepet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aktifSubeId, setAktifSubeId] = useState<string | null>(null)

  useEffect(() => {
    const sube = localStorage.getItem('aktif_sube_id')
    setAktifSubeId(sube)
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      // 400 hatasını önlemek için filtrelemeyi client tarafında yapıyoruz
      const { data, error } = await supabase
        .from('stok_kartlari')
        .select('*')
      
      if (error) throw error

      if (data) {
        // stok_tur_id: 1 (Hammadde) olanları çıkarıyoruz
        const satisUrunleri = data.filter(item => item.stok_tur_id !== 1)
        setStoklar(satisUrunleri)
        
        // alt_kimlik alanını kategori olarak kullanıyoruz
        const uniqueCats: any = ['HEPSİ', ...new Set(satisUrunleri.map(item => item.alt_kimlik || 'DİĞER'))]
        setKategoriler(uniqueCats)
      }
    } catch (err) {
      console.error("Yükleme hatası:", err)
    } finally {
      setLoading(false)
    }
  }

  // ARAMA MANTIĞI: Arama barına yazılan metni anlık filtreler
  const filtrelenmisUrunler = stoklar.filter(urun => {
    const isimUyum = urun.urun_adi?.toLowerCase().includes(aramaTerimi.toLowerCase())
    const barkodUyum = urun.barkod?.includes(aramaTerimi)
    const kategoriUyum = seciliKategori === 'HEPSİ' || urun.alt_kimlik === seciliKategori
    
    return (isimUyum || barkodUyum) && kategoriUyum
  })

  const sepeteEkle = (urun: any) => {
    setSepet(prev => {
      const varmi = prev.find(s => s.id === urun.id)
      if (varmi) {
        return prev.map(s => s.id === urun.id ? { ...s, miktar: s.miktar + 1 } : s)
      }
      return [...prev, { ...urun, miktar: 1 }]
    })
  }

  const toplamTutar = sepet.reduce((acc, curr) => acc + ((curr.satis_fiyati || 0) * curr.miktar), 0)

  return (
    <div className="flex h-screen bg-slate-50 text-black overflow-hidden">
      
      {/* SOL: ÜRÜN SEÇİM ALANI */}
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
        
        {/* ÜST ARAMA BARI (image_6915e1.png'deki alan) */}
        <div className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-200 flex items-center">
          <div className="flex-1 relative text-slate-400">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
            <input 
              type="text"
              placeholder="Ürün adı yazın veya barkod okutun..."
              className="w-full pl-14 pr-6 py-5 bg-slate-100 rounded-[24px] outline-none font-bold text-lg focus:ring-2 focus:ring-indigo-500 transition-all text-black"
              value={aramaTerimi}
              onChange={(e) => setAramaTerimi(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* KATEGORİ SEÇİMİ */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {kategoriler.map(kat => (
            <button
              key={kat}
              onClick={() => setSeciliKategori(kat)}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all whitespace-nowrap ${
                seciliKategori === kat ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {kat}
            </button>
          ))}
        </div>

        {/* ÜRÜN GRİDİ */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 pr-2">
          {loading ? (
            <div className="col-span-full text-center py-20 font-bold text-slate-400 italic">Ürünler Hazırlanıyor...</div>
          ) : filtrelenmisUrunler.length > 0 ? (
            filtrelenmisUrunler.map(urun => (
              <button
                key={urun.id}
                onClick={() => sepeteEkle(urun)}
                className="bg-white p-6 rounded-[40px] shadow-sm border border-transparent hover:border-indigo-500 hover:shadow-xl transition-all flex flex-col items-center text-center group active:scale-95"
              >
                <div className="w-20 h-20 bg-slate-100 rounded-3xl mb-4 flex items-center justify-center text-3xl group-hover:bg-indigo-50 transition-colors">
                  {urun.foto_url ? <img src={urun.foto_url} className="w-full h-full object-cover rounded-3xl" /> : '🍰'}
                </div>
                <h3 className="font-black text-[11px] uppercase leading-tight text-slate-700 h-8 flex items-center">{urun.urun_adi}</h3>
                <p className="text-indigo-600 font-black mt-3 text-lg">{urun.satis_fiyati?.toFixed(2)} ₺</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic">Stok: {urun.mevcut_stok}</p>
              </button>
            ))
          ) : (
            <div className="col-span-full text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-slate-200">
               <p className="font-black text-slate-300 uppercase text-xl">Ürün Bulunamadı</p>
            </div>
          )}
        </div>
      </div>

      {/* SAĞ: SEPET VE ÖDEME */}
      <div className="w-[450px] bg-white border-l shadow-2xl flex flex-col">
        <div className="p-8 border-b bg-slate-50/50">
          <h2 className="text-2xl font-black uppercase tracking-tighter italic text-indigo-900 leading-none">SİPARİŞ EKRANI</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 truncate max-w-full">
            ŞUBE: <span className="text-indigo-600">{aktifSubeId}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {sepet.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-slate-50 p-5 rounded-[28px] border border-slate-100">
              <div className="flex-1">
                <p className="font-black text-xs uppercase text-slate-800 truncate">{item.urun_adi}</p>
                <div className="flex items-center gap-3 mt-2">
                   <button onClick={() => setSepet(sepet.map(s => s.id === item.id && s.miktar > 1 ? {...s, miktar: s.miktar - 1} : s))} className="w-8 h-8 bg-white border rounded-xl font-black">-</button>
                   <span className="text-sm font-black w-6 text-center">{item.miktar}</span>
                   <button onClick={() => setSepet(sepet.map(s => s.id === item.id ? {...s, miktar: s.miktar + 1} : s))} className="w-8 h-8 bg-white border rounded-xl font-black">+</button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-indigo-600 text-lg">{(item.miktar * (item.satis_fiyati || 0)).toFixed(2)} ₺</p>
                <button onClick={() => setSepet(sepet.filter(s => s.id !== item.id))} className="text-[10px] text-slate-300 font-bold uppercase hover:text-rose-500">Kaldır</button>
              </div>
            </div>
          ))}
        </div>

        {/* TOPLAM VE BUTONLAR */}
        <div className="p-10 bg-[#0f172a] text-white rounded-t-[50px] space-y-8">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ÖDENECEK TOPLAM</span>
            <span className="text-5xl font-black tracking-tighter text-emerald-400">{toplamTutar.toFixed(2)} ₺</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-slate-800 hover:bg-slate-700 py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all">NAKİT</button>
            <button className="bg-indigo-600 hover:bg-indigo-500 py-6 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">KREDİ KARTI</button>
          </div>
        </div>
      </div>
    </div>
  )
}