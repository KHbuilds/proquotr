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
          setNote
