'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type Quote = {
  id: string
  client_name: string
  document_type: string
  total: number
  created_at: string
  line_items: any[]
}

type Profile = {
  company_name: string
  email: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: prof }, { data: qs }] = await Promise.all([
        supabase.from('profiles').select('company_name, email').eq('id', user.id).single(),
        supabase.from('quotes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      ])

      if (!prof?.company_name) { router.push('/onboarding'); return }
      setProfile(prof)
      setQuotes(qs || [])
      setLoading(false)
    }
    load()
  }, [router])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const fmt = (n: number) => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const deleteQuote = async (id: string) => {
    if (!confirm('Delete this quote?')) return
    const supabase = createClient()
    await supabase.from('quotes').delete().eq('id', id)
    setQuotes(q => q.filter(x => x.id !== id))
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#d97706"/>
                <polyline points="14 2 14 8 20 8" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span className="font-display font-extrabold tracking-tight text-gray-900 dark:text-white">ProQuotr</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">Settings</Link>
            <button onClick={signOut} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">Sign out</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white">
              {profile?.company_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{quotes.length} quote{quotes.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link href="/quote/new" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New quote
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center">
            <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg mb-1">No quotes yet</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Create your first quote and send it to a client in under 60 seconds.</p>
            <Link href="/quote/new" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition inline-flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create first quote
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_100px_120px_48px] gap-0 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Total</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Date</span>
              <span/>
            </div>
            {quotes.map((q, i) => (
              <div key={q.id} className={`grid grid-cols-[1fr_100px_100px_120px_48px] gap-0 px-5 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition ${i < quotes.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}>
                <div>
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{q.client_name || 'Unnamed client'}</span>
                  {q.line_items?.length > 0 && <span className="text-xs text-gray-400 ml-2">{q.line_items.length} item{q.line_items.length !== 1 ? 's' : ''}</span>}
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${q.document_type === 'invoice' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                  {q.document_type === 'invoice' ? 'Invoice' : 'Estimate'}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white text-right">{fmt(q.total)}</span>
                <span className="text-xs text-gray-400 text-right">{fmtDate(q.created_at)}</span>
                <div className="flex justify-end gap-1">
                  <Link href={`/quote/new?load=${q.id}`} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-white transition" title="Load quote">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </Link>
                  <button onClick={() => deleteQuote(q.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition" title="Delete">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
