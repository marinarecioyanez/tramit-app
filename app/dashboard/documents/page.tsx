export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { DocumentOCR } from '@/components/features/document-ocr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, AlertTriangle, Clock } from 'lucide-react'

export const metadata = { title: 'Documents — Tràmit Economistes' }

export default async function DocumentsPage() {
  const supabase = createClient()

  const { data: documents } = await supabase
    .from('documents')
    .select('*, clients(name), profiles!documents_uploaded_by_fkey(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Documents i OCR</h1>
        <p className="text-muted-foreground mt-1">
          Analitza documents amb IA per extreure dades automàticament
        </p>
      </div>

      <DocumentOCR />

      {/* Historial de documents analitzats */}
      {documents && documents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Historial d&apos;anàlisis</h2>
          <div className="space-y-2">
            {documents.map((doc: {
              id: string
              name: string
              ocr_status: string
              ocr_summary: string | null
              created_at: string
              clients?: { name: string } | null
              profiles?: { full_name: string } | null
            }) => {
              const clientName = (doc.clients as { name: string } | null)?.name
              const uploaderName = (doc.profiles as { full_name: string } | null)?.full_name

              return (
                <Card key={doc.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        doc.ocr_status === 'done' ? 'bg-green-100 dark:bg-green-900/20' :
                        doc.ocr_status === 'error' ? 'bg-red-100 dark:bg-red-900/20' :
                        'bg-muted'
                      }`}>
                        {doc.ocr_status === 'done' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {doc.ocr_status === 'error' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {doc.ocr_status === 'pending' && <Clock className="h-4 w-4 text-muted-foreground" />}
                        {!['done', 'error', 'pending'].includes(doc.ocr_status) && <FileText className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        {doc.ocr_summary && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{doc.ocr_summary}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          {clientName && <span>Client: {clientName}</span>}
                          {uploaderName && <span>· {uploaderName}</span>}
                          <span>· {new Date(doc.created_at).toLocaleDateString('ca-ES')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
