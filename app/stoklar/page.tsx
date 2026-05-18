'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

function StokYonetimi() {
  const [stoklar, setStoklar] = useState<any[]>([])
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [stok_turleri, setstok_turleri] = useState<any[]>([])
  const [birimler, setBirimler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtre State'leri
  const [aramaMetni, setAramaMetni] = useState('')
  const [seciliKategori, setSeciliKategori] = useState('')
  const [secilistok_turleri, setsecilistok_turleri] = useState('')
  const [stokDurumFiltresi, setStokDurumFiltresi] = useState('HEPSI')

  // Modal State'leri
  const [isStokModalOpen, setIsStokModalOpen] = useState(false)
  const [isBirimModalOpen, setIsBirimModalOpen] = useState(false)
  const [duzenlemeId, setDuzenlemeId] = useState<string | null>(null)
  
  const [yeniBirimAdi, setYeniBirimAdi] = useState('')
  const [form, setForm] = useState({
    urun_adi: '', stok_tur_id: '', kategori_id: '', birim_id: '', barkod: '',
    alis_fiyati: 0, satis_fiyati: 0, kdv_orani: 20, iskonto_orani: 0,
    mevcut_stok: 0, min_stok: 0, satis_ekraninda_goster: false, aciklama: ''
  })

  useEffect(() => { fetchVeriler() }, [])

  const fetchVeriler = async () => {
    setLoading(true)
    const aktifSubeId = localStorage.getItem('aktifSubeId')
    try {
      const { data: sData } = await supabase.from('stok_kartlari')
        .select('*, birimler(birim_adi), kategoriler(ad), stok_turleri(tur_adi)')
        .eq('sube_id', aktifSubeId).order('urun_adi')

      const { data: kData } = await supabase.from('kategoriler').select('*')
      const { data: bData } = await supabase.from('birimler').select('*')
      const { data: tdata } = await supabase.from('stok_turleri').select('*')
      setStoklar(sData || [])
      setKategoriler(kData || [])
      setstok_turleri(tdata || [])
      setBirimler(bData || [])
    } catch (error) {
        console.error("Veri çekme hatası:", error)
    } finally { setLoading(false) }
  }

  const handleStokKaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    const aktifSubeId = localStorage.getItem('aktifSubeId');

    const payload = { 
      ...form, 
      sube_id: aktifSubeId,
      kategori_id: form.kategori_id || null, 
      stok_tur_id: form.stok_tur_id || null, 
      birim_id: form.birim_id || null,
      barkod: form.barkod?.trim() === "" ? null : form.barkod.trim()
    };

    const { id, kategoriler, birimler, stok_turleri, ...cleanPayload } = payload as any;

    let response;
    if (duzenlemeId) {
      response = await supabase.from('stok_kartlari').update(cleanPayload).eq('id', duzenlemeId);
    } else {
      response = await supabase.from('stok_kartlari').insert([cleanPayload]);
    }

    if (response.error) {
      if (response.error.code === '23505') {
        toast.error(`"${form.barkod}" barkodu zaten kullanımda!`, {
          style: { borderRadius: '15px', background: '#333', color: '#fff', fontWeight: 'bold' }
        });
      } else {
        toast.error("İşlem başarısız: " + response.error.message);
      }
      return;
    }

    toast.success(duzenlemeId ? 'Ürün Güncellendi' : 'Yeni Ürün Eklendi', {
      icon: '🚀',
      style: { borderRadius: '15px', fontWeight: 'bold' }
    });

    setIsStokModalOpen(false);
    fetchVeriler();
  };

  const handleBirimEkle = async () => {
    if (!yeniBirimAdi) return
    await supabase.from('birimler').insert([{ birim_adi: yeniBirimAdi }])
    setYeniBirimAdi(''); fetchVeriler()
  }

  const stokSil = async (id: string, ad: string) => {
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: `"${ad}" ürünü kalıcı olarak silinecek!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Evet, Sil!',
      cancelButtonText: 'Vazgeç'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.from('stok_kartlari').delete().eq('id', id);
      if (error) {
        Swal.fire('Hata!', 'Ürün silinemedi: ' + error.message, 'error');
      } else {
        Swal.fire('Silindi!', 'Ürün başarıyla silindi.', 'success');
        fetchVeriler();
      }
    }
  };

  const filtrelenmis = stoklar.filter(s => {
    const metinUygun = (s.urun_adi?.toLowerCase().includes(aramaMetni.toLowerCase()) || s.barkod?.includes(aramaMetni))
    const kategoriUygun = !seciliKategori || s.kategori_id === seciliKategori
    const stok_turleriUygun = !secilistok_turleri || s.stok_tur_id === secilistok_turleri
    
    let stokUygun = true
    if (stokDurumFiltresi === 'KRITIK') stokUygun = s.mevcut_stok <= s.min_stok
    else if (stokDurumFiltresi === 'VAR') stokUygun = s.mevcut_stok > 0
    else if (stokDurumFiltresi === 'YOK') stokUygun = s.mevcut_stok <= 0

    return metinUygun && stok_turleriUygun && kategoriUygun && stokUygun
  })

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtrelenmis.map(s => ({
      'Ürün Adı': s.urun_adi, 'Stok Tür Adı': s.stok_turleri?.tur_adi, 'Barkod': s.barkod, 'Kategori': s.kategoriler?.ad,
      'Stok': s.mevcut_stok, 'Birim': s.birimler?.birim_adi, 'Fiyat': s.satis_fiyati
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "StokListesi")
    XLSX.writeFile(wb, "stok_listesi.xlsx")
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const tableData = filtrelenmis.map(s => [s.urun_adi, s.barkod || '-', s.kategoriler?.ad || '-', s.mevcut_stok, s.satis_fiyati + ' TL'])
    autoTable(doc, { 
        head: [['Ürün Adı', 'Barkod', 'Kategori', 'Stok', 'Fiyat']], 
        body: tableData,
        styles: { fontSize: 8 }
    })
    doc.save("stok_raporu.pdf")
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border flex justify-between items-center">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Envanter Master</h1>
          <div className="flex gap-2">
            <button onClick={() => setIsBirimModalOpen(true)} className="px-6 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase hover:bg-slate-200">Birim Tanımla</button>
            <button onClick={() => { setDuzenlemeId(null); setForm({ urun_adi: '', stok_tur_id: '', kategori_id: '', birim_id: '', barkod: '', alis_fiyati: 0, satis_fiyati: 0, kdv_orani: 20, iskonto_orani: 0, mevcut_stok: 0, min_stok: 0, satis_ekraninda_goster: false, aciklama: '' }); setIsStokModalOpen(true); }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-indigo-600">+ Yeni Ürün</button>
          </div>
        </div>

        {/* GELİŞMİŞ FİLTRE ÇUBUĞU */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border flex flex-wrap gap-4 items-center">
          <input placeholder="Ürün veya Barkod Ara..." className="flex-1 min-w-[200px] p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-indigo-500" value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
          
          <select className="p-4 bg-slate-50 rounded-2xl font-bold text-xs" value={seciliKategori} onChange={e => setSeciliKategori(e.target.value)}>
            <option value="">Tüm Kategoriler</option>
            {kategoriler.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
          </select>
          <select className="p-4 bg-slate-50 rounded-2xl font-bold text-xs" value={secilistok_turleri} onChange={e => setsecilistok_turleri(e.target.value)}>
            <option value="">Tüm Stok Türleri</option>
            {stok_turleri.map(t => <option key={t.id} value={t.id}>{t.tur_adi}</option>)}
          </select>

          <select className="p-4 bg-slate-50 rounded-2xl font-bold text-xs" value={stokDurumFiltresi} onChange={e => setStokDurumFiltresi(e.target.value)}>
            <option value="HEPSI">Tüm Stoklar</option>
            <option value="KRITIK">Kritik Seviyedekiler</option>
            <option value="VAR">Stokta Olanlar</option>
            <option value="YOK">Tükenenler</option>
          </select>

          <div className="flex gap-2">
            <button onClick={exportExcel} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] hover:bg-emerald-600 hover:text-white">EXCEL</button>
            <button onClick={exportPDF} className="p-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] hover:bg-rose-600 hover:text-white">PDF</button>
          </div>
        </div>

        {/* LİSTE */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
              <tr>
                <th className="p-8">Ürün / Barkod</th>
                <th className="p-8 text-center">Stok Durumu</th>
                <th className="p-8 text-center">Fiyat (KDV Dahil)</th>
                <th className="p-8 text-right px-12">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtrelenmis.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-all">
                  <td className="p-8">
                    <div className="font-black text-slate-800 uppercase text-lg">{s.urun_adi}</div>
                    <div className="text-[10px] font-bold text-slate-400">#{s.barkod || 'BKSZ'} • {s.kategoriler?.ad || 'Genel'} • {s.stok_turleri?.tur_adi || 'Genel'}</div>
                  </td>
                  <td className="p-8 text-center">
                    <div className={`text-3xl font-black ${s.mevcut_stok <= s.min_stok ? 'text-rose-500' : 'text-slate-900'}`}>{s.mevcut_stok}</div>
                    <div className="text-[9px] font-black opacity-30 uppercase">{s.birimler?.birim_adi}</div>
                  </td>
                  <td className="p-8 text-center font-black text-2xl text-indigo-600">{s.satis_fiyati} ₺</td>
                  <td className="p-8 text-right px-12">
                    <div className="flex justify-end gap-2">
                        <Link href={`/stoklar/${s.id}`} className="p-4 bg-slate-100 rounded-2xl font-black text-[10px] hover:bg-slate-900 hover:text-white transition-all">EKSTRE</Link>
                        <button onClick={() => { setDuzenlemeId(s.id); setForm(s); setIsStokModalOpen(true); }} className="p-4 bg-slate-100 rounded-2xl hover:bg-indigo-600 hover:text-white">✏️</button>
                        <button onClick={() => stokSil(s.id, s.urun_adi)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BİRİM MODAL */}
      {isBirimModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-md">
            <h2 className="text-2xl font-black mb-6 uppercase italic">Birimler</h2>
            <div className="flex flex-col gap-1 mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">Yeni Birim Adı</label>
              <div className="flex gap-2">
                <input className="flex-1 p-4 bg-slate-50 rounded-2xl font-bold outline-none ring-1 ring-slate-200/60 focus:ring-slate-900" value={yeniBirimAdi} onChange={e => setYeniBirimAdi(e.target.value)} placeholder="Örn: Adet, Koli, Kg..." />
                <button onClick={handleBirimEkle} className="bg-slate-900 text-white px-6 rounded-2xl font-bold hover:bg-slate-800">+</button>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-auto pr-2">
              {birimler.map(b => <div key={b.id} className="p-4 bg-slate-50 rounded-xl font-bold uppercase text-xs flex justify-between">{b.birim_adi}</div>)}
            </div>
            <button onClick={() => setIsBirimModalOpen(false)} className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Kapat</button>
          </div>
        </div>
      )}

      {/* STOK EKLE/GÜNCELLE MODAL */}
      {isStokModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-3xl font-black mb-6 uppercase italic tracking-tighter">{duzenlemeId ? 'Kartı Güncelle' : 'Yeni Stok Kartı'}</h2>
            
            <form onSubmit={handleStokKaydet} className="grid grid-cols-2 gap-4">
              
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Ürün Adı</label>
                <input className="p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 outline-none" placeholder="Ürün adını eksiksiz giriniz" value={form.urun_adi} onChange={e => setForm({...form, urun_adi: e.target.value})} required />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Kategori</label>
                <select className="p-4 bg-slate-50 rounded-2xl font-bold text-xs border-none ring-1 ring-slate-200/60 focus:ring-slate-900 outline-none" value={form.kategori_id} onChange={e => setForm({...form, kategori_id: e.target.value})}>
                  <option value="">Kategori Seçiniz...</option>
                  {kategoriler.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Birim</label>
                <select className="p-4 bg-slate-50 rounded-2xl font-bold text-xs border-none ring-1 ring-slate-200/60 focus:ring-slate-900 outline-none" value={form.birim_id} onChange={e => setForm({...form, birim_id: e.target.value})}>
                  <option value="">Birim Seçiniz...</option>
                  {birimler.map(b => <option key={b.id} value={b.id}>{b.birim_adi}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Stok Türü</label>
                <select className="p-4 bg-slate-50 rounded-2xl font-bold text-xs border-none ring-1 ring-slate-200/60 focus:ring-slate-900 outline-none" value={form.stok_tur_id} onChange={e => setForm({...form, stok_tur_id: e.target.value})}>
                  <option value="">Stok Türü Seçiniz...</option>
                  {stok_turleri.map(t => <option key={t.id} value={t.id}>{t.tur_adi}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Barkod Numarası</label>
                <input className="p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/60 focus:ring-slate-900 outline-none" placeholder="Barkod kodu taratın" value={form.barkod} onChange={e => setForm({...form, barkod: e.target.value})} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-wider">Mevcut Stok Miktarı</label>
                <input className="p-4 bg-slate-50 rounded-2xl font-bold border-none ring-1 ring-slate-200/6