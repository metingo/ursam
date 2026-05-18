'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DashboardStats = {
  cariSayisi: number
  stokSayisi: number
  toplamBorc: number
  toplamAlacak: number
  kritikStok: number
  kasaBakiyesi: number
}

type AnyRow = Record<string, any>

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})

const numberFormat = new Intl.NumberFormat('tr-TR')

const relationRow = (value: unknown) => Array.isArray(value) ? value[0] : value

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    cariSayisi: 0,
    stokSayisi: 0,
    toplamBorc: 0,
    toplamAlacak: 0,
    kritikStok: 0,
    kasaBakiyesi: 0,
  })
  const [kritikStoklar, setKritikStoklar] = useState<AnyRow[]>([])
  const [sonHareketler, setSonHareketler] = useState<AnyRow[]>([])

  useEffect(() => {
    const getStats = async () => {
      setLoading(true)

      const [
        { count: cCount },
        { count: sCount },
        { data: hareketler },
        { data: stoklar },
        { data: hesaplar },
        { data: hareketListesi },
      ] = await Promise.all([
        supabase.from('cariler').select('*', { count: 'exact', head: true }),
        supabase.from('stok_kartlari').select('*', { count: 'exact', head: true }),
        supabase.from('cari_hareketleri').select('borc, alacak'),
        supabase
          .from('stok_kartlari')
          .select('id, urun_adi, mevcut_stok, min_stok, birimler(birim_adi)')
          .order('mevcut_stok', { ascending: true })
          .limit(8),
        supabase.from('hesaplar').select('guncel_bakiye'),
        supabase
          .from('cari_hareketleri')
          .select('id, kayit_tarihi, islem_turu, borc, alacak, aciklama, cariler(firma_adi)')
          .order('kayit_tarihi', { ascending: false })
          .limit(6),
      ])

      const toplamAlacak = hareketler?.reduce((acc, curr) => acc + (curr.alacak || 0), 0) || 0
      const toplamBorc = hareketler?.reduce((acc, curr) => acc + (curr.borc || 0), 0) || 0
      const kritikler = stoklar?.filter((stok) => (stok.mevcut_stok || 0) <= (stok.min_stok || 0)) || []
      const kasaBakiyesi = hesaplar?.reduce((acc, hesap) => acc + (hesap.guncel_bakiye || 0), 0) || 0

      setStats({
        cariSayisi: cCount || 0,
        stokSayisi: sCount || 0,
        toplamAlacak,
        toplamBorc,
        kritikStok: kritikler.length,
        kasaBakiyesi,
      })
      setKritikStoklar(kritikler)
      setSonHareketler(hareketListesi || [])
      setLoading(false)
    }

    getStats()
  }, [])

  const netBakiye = stats.toplamBorc - stats.toplamAlacak
  const tahsilatOrani = stats.toplamBorc > 0 ? Math.min(100, Math.round((stats.toplamAlacak / stats.toplamBorc) * 100)) : 0

  const metricCards = [
    {
      title: 'Müşteri Alacak',
      value: currency.format(stats.toplamBorc),
      detail: `${numberFormat.format(stats.cariSayisi)} aktif cari`,
      accent: 'bg-emerald-500',
      soft: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Tedarikçi Borç',
      value: currency.format(stats.toplamAlacak),
      detail: `${tahsilatOrani}% tahsilat dengesi`,
      accent: 'bg-rose-500',
      soft: 'bg-rose-50 text-rose-700',
    },
    {
      title: 'Stok Kalemi',
      value: numberFormat.format(stats.stokSayisi),
      detail: `${stats.kritikStok} kritik stok`,
      accent: 'bg-amber-500',
      soft: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Kasa Durumu',
      value: currency.format(stats.kasaBakiyesi),
      detail: `Net bakiye ${currency.format(netBakiye)}`,
      accent: 'bg-sky-500',
      soft: 'bg-sky-50 text-sky-700',
    },
  ]

  const quickActions = [
    { title: 'Yeni Satış', href: '/satis', tone: 'bg-slate-950 text-white hover:bg-slate-800' },
    { title: 'Alış Faturası', href: '/alis-faturasi', tone: 'bg-indigo-600 text-white hover:bg-indigo-700' },
    { title: 'Cari Ekle', href: '/cariler', tone: 'bg-white text-slate-900 hover:bg-slate-100 ring-1 ring-slate-200' },
    { title: 'Üretim Emri', href: '/uretim-emri', tone: 'bg-white text-slate-900 hover:bg-slate-100 ring-1 ring-slate-200' },
  ]

  return (
    <div className="space-y-8 text-slate-950">
      <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-slate-200">
        <div className="grid gap-8 p-8 lg:p-10 2xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-300">UrSaM Kontrol Merkezi</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight 2xl:text-5xl">
                Bugünün satış, stok ve kasa ritmi tek ekranda.
              </h1>
              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                Pastane operasyonunu hızlı okumak için alacaklar, borçlar, kritik stoklar ve son cari hareketler burada toplanır.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex min-h-14 items-center justify-center rounded-2xl px-5 text-sm font-black uppercase transition ${action.tone}`}
                >
                  {action.title}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white/10 p-6 ring-1 ring-white/10">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Net Cari Pozisyon</p>
            <p className="mt-4 text-4xl font-black">{currency.format(netBakiye)}</p>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300" style={{ width: `${tahsilatOrani}%` }} />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Tahsilat</span>
              <span>{tahsilatOrani}%</span>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Cari</p>
                <p className="mt-1 text-2xl font-black">{numberFormat.format(stats.cariSayisi)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">Stok</p>
                <p className="mt-1 text-2xl font-black">{numberFormat.format(stats.stokSayisi)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <div key={card.title} className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{card.title}</p>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{loading ? '...' : card.value}</p>
              </div>
              <span className={`h-3 w-3 rounded-full ${card.accent}`} />
            </div>
            <div className={`mt-5 inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase ${card.soft}`}>
              {card.detail}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Stok Alarmi</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Kritik seviyedeki ürünler</h2>
            </div>
            <Link href="/stoklar" className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-700 transition hover:bg-slate-200">
              Stoklar
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {kritikStoklar.length === 0 && (
              <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-bold text-emerald-700">
                Kritik stok uyarısı yok.
              </div>
            )}
            {kritikStoklar.map((stok) => {
              const birim = relationRow(stok.birimler) as AnyRow | undefined

              return (
                <div key={stok.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase text-slate-800">{stok.urun_adi}</p>
                    <p className="text-xs font-bold text-slate-400">Minimum: {stok.min_stok || 0} {birim?.birim_adi || ''}</p>
                  </div>
                  <div className="rounded-xl bg-rose-100 px-3 py-2 text-right">
                    <p className="text-lg font-black text-rose-700">{stok.mevcut_stok || 0}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Son Hareketler</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Cari ve fatura akış özeti</h2>
            </div>
            <Link href="/faturalar" className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-700 transition hover:bg-slate-200">
              Faturalar
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-slate-100">
            {sonHareketler.length === 0 && (
              <div className="bg-slate-50 p-5 text-sm font-bold text-slate-500">
                Henüz cari hareket bulunamadı.
              </div>
            )}
            {sonHareketler.map((hareket) => {
              const cari = relationRow(hareket.cariler) as AnyRow | undefined
              const tutar = (hareket.borc || 0) > 0 ? hareket.borc : hareket.alacak
              const isBorc = (hareket.borc || 0) > 0

              return (
                <div key={hareket.id} className="grid grid-cols-[1fr_auto] gap-4 border-b border-slate-100 bg-white p-4 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-800">{cari?.firma_adi || 'Cari secilmedi'}</p>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                      {hareket.islem_turu || 'Hareket'} - {hareket.kayit_tarihi ? new Date(hareket.kayit_tarihi).toLocaleDateString('tr-TR') : 'Tarih yok'}
                    </p>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-right ${isBorc ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    <p className="text-sm font-black">{currency.format(tutar || 0)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
