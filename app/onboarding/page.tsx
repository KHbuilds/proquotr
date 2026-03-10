'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    company_name: '',
    phone: '',
    email: '',
    address: '',
    license_number: '',
    website: '',
    terms: 'Payment due within 14 days. Thank you for your business.',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_name.trim()) { setError('Company name is required'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { error } = await supabase.from('profiles').update(form).eq('id', user.id)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-gray-900 dark:bg-white rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#d97706"/>
                <polyline points="14 2 14 8 20 8" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">ProQuotr</span>
          </div>
          <h1 className="text-2xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white">Set up your business</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This info appears on every quote you send.</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business name <span className="text-red-500">*</span></label>
              <input type="text" required value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Sunrise Cleaning Co." className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="hello@yourbiz.com" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">License # <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={form.license_number} onChange={e => set('license_number', e.target.value)} placeholder="Lic# 00000" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Website <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={form.website} onChange={e => set('website', e.target.value)} placeholder="yourbiz.com" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Address <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, FL" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Default terms</label>
              <textarea value={form.terms} onChange={e => set('terms', e.target.value)} rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none"/>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-3.5 py-2.5 rounded-xl">{error}</div>}

            <button type="submit" disabled={loading} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold text-sm py-2.5 rounded-xl hover:opacity-90 transition disabled:opacity-50">
              {loading ? 'Saving...' : 'Continue to dashboard →'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">You can update all of this later in Settings.</p>
      </div>
    </div>
  )
}
