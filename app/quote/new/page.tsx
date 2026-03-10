'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

type LineItem = { id: string; description: string; qty: number; rate: number }
type Profile = { company_name: string; phone: string; email: string; address: string; website: string; license_number: string; logo_url: string; terms: string }
type LibItem = { id: string; name: string; rate: number }

const uid = () => Math.random().toString(36).slice(2, 9)
const fmt = (n: number) => '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export default function QuotePage() {
  const router = useRouter()
  const params = useSearchParams()
  const loadId = params.get('load')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState('')
  const [docType, setDocType] = useState<'estimate' | 'invoice'>('estimate')
  const [invoiceNum, setInvoiceNum] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [items, setItems] = useState<LineItem[]>([{ id: uid(), description: '', qty: 1, rate: 0 }])
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showLib, setShowLib] = useState(false)
  const [libItems, setLibItems] = useState<LibItem[]>([])
  const [libName, setLibName] = useState('')
  const [libRate, setLibRate] = useState('')
  const [polishing, setPolishing] = useState<string | null>(null)

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUserId(user.id)

      const [{ data: prof }, { data: lib }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('library_items').select('*').eq('user_id', user.id).order('created_at')
      ])
      if (!prof?.company_name) { router.push('/onboarding'); return }
      setProfile(prof)
      setLibItems(lib || [])

      if (loadId) {
        const { data: q } = await supabase.from('quotes').select('*').eq('id', loadId).single()
        if (q) {
          setDocType(q.document_type)
          setInvoiceNum(q.invoice_number || '')
          setClientName(q.client_name || '')
          setClientEmail(q.client_email || '')
          setClientAddress(q.client_address || '')
          setItems(q.line_items?.length ? q.line_items : [{ id: uid(), description: '', qty: 1, rate: 0 }])
          setTaxRate(q.tax_rate || 0)
          setNotes(q.notes || '')
        }
      }
    }
    load()
  }, [router, loadId])

  const addItem = () => setItems(i => [...i, { id: uid(), description: '', qty: 1, rate: 0 }])
  const removeItem = (id: string) => setItems(i => i.filter(x => x.id !== id))
  const updateItem = (id: string, k: keyof LineItem, v: string | number) =>
    setItems(i => i.map(x => x.id === id ? { ...x, [k]: v } : x))

  const polishItem = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item?.description.trim()) return
    setPolishing(id)
    try {
      const res = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.description })
      })
      const data = await res.json()
      if (data.result) updateItem(id, 'description', data.result)
    } catch {}
    setPolishing(null)
  }

  const saveAndDownload = async () => {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('quotes').insert({
      user_id: userId,
      client_name: clientName,
      client_email: clientEmail,
      client_address: clientAddress,
      document_type: docType,
      invoice_number: invoiceNum,
      line_items: items,
      tax_rate: taxRate,
      notes,
      total
    })
    await generatePDF()
    setSaving(false)
    router.push('/dashboard')
  }

  const generatePDF = async () => {
    if (!profile) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, margin = 18
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, W, 42, 'F')
    doc.setFillColor(217, 119, 6)
    doc.rect(0, 0, 5, 42, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text(profile.company_name, 12, 16)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 190, 210)
    const sub = [profile.phone, profile.email, profile.license_number ? `Lic# ${profile.license_number}` : ''].filter(Boolean).join('  ·  ')
    if (sub) doc.text(sub, 12, 23)
    if (profile.address) doc.text(profile.address, 12, 29)
    if (profile.website) doc.text(profile.website, 12, 35)
    const label = docType === 'invoice' ? 'INVOICE' : 'ESTIMATE'
    doc.setFillColor(217, 119, 6)
    doc.roundedRect(W - margin - 30, 10, 28, 10, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(15, 23, 42)
    doc.text(label, W - margin - 16, 16.5, { align: 'center' })
    if (docType === 'invoice' && invoiceNum) {
      doc.setTextColor(180, 190, 210)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`#${invoiceNum}`, W - margin - 16, 24, { align: 'center' })
    }
    let y = 52
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text('PREPARED FOR', margin, y)
    y += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text(clientName || 'Client Name', margin, y)
    y += 5
    if (clientEmail || clientAddress) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      const det = [clientEmail, clientAddress].filter(Boolean).join('  ·  ')
      doc.text(det, margin, y)
      y += 5
    }
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    doc.text(`Date: ${dateStr}`, W - margin, y - 14, { align: 'right' })
    doc.setFillColor(15, 23, 42)
    doc.rect(margin, y, W - margin * 2, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    const cols = { desc: margin + 2, qty: W - 80, rate: W - 55, total: W - margin - 2 }
    doc.text('SERVICE / DESCRIPTION', cols.desc, y + 5.2)
    doc.text('QTY', cols.qty, y + 5.2)
    doc.text('RATE', cols.rate, y + 5.2)
    doc.text('TOTAL', cols.total, y + 5.2, { align: 'right' })
    y += 8
    items.forEach((item, idx) => {
      const rowH = 8
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y, W - margin * 2, rowH, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(55, 65, 81)
      doc.text(item.description || '', cols.desc, y + 5.5, { maxWidth: 95 })
      doc.text(String(item.qty), cols.qty, y + 5.5)
      doc.text(fmt(item.rate), cols.rate, y + 5.5)
      doc.text(fmt(item.qty * item.rate), cols.total, y + 5.5, { align: 'right' })
      doc.setDrawColor(241, 245, 249)
      doc.line(margin, y + rowH, W - margin, y + rowH)
      y += rowH
    })
    y += 6
    if (taxRate > 0) {
      const rx = W - margin - 70
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text('Subtotal', rx, y); doc.text(fmt(subtotal), W - margin, y, { align: 'right' })
      y += 6
      doc.text(`Tax (${taxRate}%)`, rx, y); doc.text(fmt(tax), W - margin, y, { align: 'right' })
      y += 6
    }
    doc.setFillColor(15, 23, 42)
    doc.rect(margin, y, W - margin * 2, 11, 'F')
    doc.setFillColor(217, 119, 6)
    doc.rect(margin, y, 4, 11, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text('TOTAL DUE', margin + 8, y + 7.5)
    doc.setTextColor(217, 119, 6)
    doc.text(fmt(total), W - margin, y + 7.5, { align: 'right' })
    y += 18
    if (notes) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('NOTES', margin, y); y += 4
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(55, 65, 81)
      const noteLines = doc.splitTextToSize(notes, W - margin * 2)
      doc.text(noteLines, margin, y)
    }
    if (profile.terms) {
      doc.setFillColor(248, 250, 252)
      doc.rect(0, 272, W, 25, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(profile.company_name + '  ·  ' + profile.terms, W / 2, 282, { align: 'center', maxWidth: W - 20 })
    }
    const fileName = `${docType}-${(clientName || 'client').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`
    doc.save(fileName)
  }

  const addLibItem = async () => {
    if (!libName.trim()) return
    const supabase = createClient()
    const { data } = await supabase.from('library_items').insert({ user_id: userId, name: libName, rate: parseFloat(libRate) || 0 }).select().single()
    if (data) { setLibItems(l => [...l, data]); setLibName(''); setLibRate('') }
  }

  const insertLibItem = (item: LibItem) => {
    setItems(i => [...i, { id: uid(), description: item.name, qty: 1, rate: item.rate }])
    setShowLib(false)
  }

  const deleteLibItem = async (id: string) => {
    const supabase = createClient()
    await supabase.from('library_items').delete().eq('id', id)
    setLibItems(l => l.filter(x => x.id !== id))
  }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
            <span className="font-display font-extrabold tracking-tight text-gray-900 dark:text-white">New Quote</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLib(true)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Library
            </button>
            <button onClick={saveAndDownload} disabled={saving} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2 rounded-xl transition flex items-center gap-1.5">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
              {saving ? 'Saving...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex gap-2">
            {(['estimate', 'invoice'] as const).map(t => (
              <button key={t} onClick={() => setDocType(t)} className={`flex-1 py-2 rounded-xl text-sm font-semibold transition capitalize ${docType === t ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                {t}
              </button>
            ))}
          </div>
          {docType === 'invoice' && (
            <input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} placeholder="Invoice number (optional)" className="mt-3 w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white mb-3">Client</h3>
          <div className="space-y-2.5">
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
            <div className="grid grid-cols-2 gap-2.5">
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email (optional)" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
              <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Address (optional)" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Line items</h3>
            <button onClick={addItem} className="text-xs text-amber-600 font-semibold hover:text-amber-700 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add item
            </button>
          </div>
          <div className="grid grid-cols-[1fr_64px_84px_36px] gap-x-2 mb-2 px-1">
            <span className="text-xs text-gray-400 font-medium">Description</span>
            <span className="text-xs text-gray-400 font-medium text-center">Qty</span>
            <span className="text-xs text-gray-400 font-medium text-right">Rate ($)</span>
            <span/>
          </div>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-[1fr_64px_84px_36px] gap-x-2 items-center">
                <div className="relative">
                  <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Service description" className="w-full px-3 py-2 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
                  <button onClick={() => polishItem(item.id)} disabled={polishing === item.id} title="AI Polish" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-amber-500 transition disabled:opacity-50">
                    {polishing === item.id ? <span className="w-3.5 h-3.5 border border-amber-500 border-t-transparent rounded-full animate-spin block"/> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>}
                  </button>
                </div>
                <input type="number" min="1" value={item.qty} onChange={e => updateItem(item.id, 'qty', parseFloat(e.target.value) || 1)} className="w-full px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white text-center"/>
                <input type="number" min="0" step="0.01" value={item.rate} onChange={e => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className="w-full px-2 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white text-right"/>
                <button onClick={() => removeItem(item.id)} disabled={items.length === 1} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 disabled:opacity-20 transition">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Subtotal</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Tax %</span>
              <input type="number" min="0" max="100" step="0.1" value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white text-right"/>
            </div>
            {taxRate > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Tax ({taxRate}%)</span>
                <span className="text-sm text-gray-900 dark:text-white">{fmt(tax)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="font-display font-bold text-gray-900 dark:text-white">Total</span>
              <span className="font-display font-bold text-xl text-amber-600">{fmt(total)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white mb-3">Notes <span className="font-normal text-gray-400">(optional)</span></h3>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes for the client..." rows={3} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none"/>
        </div>

        <button onClick={saveAndDownload} disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-base py-3.5 rounded-2xl transition flex items-center justify-center gap-2">
          {saving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          {saving ? 'Saving...' : 'Download PDF & Save'}
        </button>
      </div>

      {showLib && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowLib(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-display font-bold text-gray-900 dark:text-white">Item Library</h3>
              <button onClick={() => setShowLib(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex gap-2">
                <input value={libName} onChange={e => setLibName(e.target.value)} placeholder="Service name" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
                <input value={libRate} onChange={e => setLibRate(e.target.value)} placeholder="Rate" type="number" className="w-20 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400"/>
                <button onClick={addLibItem} className="bg-amber-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-amber-700 transition">Save</button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {libItems.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">No saved items yet. Add your most-used services above.</p>
              ) : libItems.map(item => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 group">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                    {item.rate > 0 && <span className="text-xs text-gray-400 ml-2">{fmt(item.rate)}</span>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => insertLibItem(item)} className="text-xs bg-amber-600 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-amber-700">Insert</button>
                    <button onClick={() => deleteLibItem(item.id)} className="text-gray-400 hover:text-red-400 p-1 rounded-lg"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
