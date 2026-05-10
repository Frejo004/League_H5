/**
 * useExport — Utilitaires d'export CSV et impression PDF
 */

/** Convertit un tableau d'objets en CSV et déclenche le téléchargement */
export function exportCSV(
  rows: Record<string, string | number | null | undefined>[],
  filename: string,
) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const csvContent = [
    headers.join(';'),
    ...rows.map(row =>
      headers
        .map(h => {
          const val = row[h] ?? ''
          // Échapper les guillemets et entourer si nécessaire
          const str = String(val).replace(/"/g, '""')
          return str.includes(';') || str.includes('"') || str.includes('\n')
            ? `"${str}"`
            : str
        })
        .join(';'),
    ),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Déclenche l'impression de la page courante (PDF via le dialogue système) */
export function printPage() {
  window.print()
}
