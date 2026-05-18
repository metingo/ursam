'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface SubeContextType {
  aktifSubeId: string | null
  aktifSubeAd: string | null
  subeler: any[]
  setSube: (id: string) => void
  loading: boolean
}

const SubeContext = createContext<SubeContextType | undefined>(undefined)

export function SubeProvider({ children }: { children: ReactNode }) {
  const [aktifSubeId, setAktifSubeId] = useState<string | null>(null)
  const [aktifSubeAd, setAktifSubeAd] = useState<string | null>(null)
  const [subeler, setSubeler] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubeler()
  }, [])

  const fetchSubeler = async () => {
    const { data } = await supabase.from('subeler').select('*').order('sube_adi')
    const list = data || []
    setSubeler(list)

    // LocalStorage'dan kontrol et
    const savedSubeId = localStorage.getItem('aktifSubeId')
    if (savedSubeId && list.length > 0) {
      const bulundu = list.find(s => s.id === savedSubeId)
      if (bulundu) {
        setAktifSubeId(bulundu.id)
        setAktifSubeAd(bulundu.sube_adi)
      }
    } else if (list.length > 0) {
      // Hiç seçilmemişse ilk şubeyi varsayılan yap (Geliştirme kolaylığı)
      setSube(list[0].id)
    }
    setLoading(false)
  }

  const setSube = (id: string) => {
    const sube = subeler.find(s => s.id === id)
    if (sube) {
      setAktifSubeId(id)
      setAktifSubeAd(sube.sube_adi)
      localStorage.setItem('aktifSubeId', id)
    }
  }

  return (
    <SubeContext.Provider value={{ aktifSubeId, aktifSubeAd, subeler, setSube, loading }}>
      {children}
    </SubeContext.Provider>
  )
}

export const useSube = () => {
  const context = useContext(SubeContext)
  if (!context) throw new Error('useSube must be used within a SubeProvider')
  return context
}