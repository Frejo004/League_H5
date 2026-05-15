import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Message personnalisé affiché à l'utilisateur */
  message?: string
  /** Fallback UI complet — remplace le rendu par défaut si fourni */
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary React — capture les erreurs de rendu dans l'arbre enfant
 * et affiche un fallback propre au lieu d'un écran blanc.
 *
 * Usage :
 *   <ErrorBoundary>
 *     <MonComposant />
 *   </ErrorBoundary>
 *
 *   <ErrorBoundary message="Impossible de charger les matchs.">
 *     <MatchesPage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)

    // Détection automatique des erreurs de chargement de chunks (nouveaux déploiements Vercel)
    const errorMsg = error.message.toLowerCase()
    const isChunkError = 
      errorMsg.includes('failed to fetch dynamically imported module') ||
      errorMsg.includes('loading chunk') ||
      errorMsg.includes('dynamically imported module')

    if (isChunkError) {
      // Éviter une boucle infinie de rechargement
      const lastReload = sessionStorage.getItem('last_chunk_reload')
      const now = Date.now()
      
      // Si on a déjà rechargé il y a moins de 10 secondes, on ne recommence pas
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('last_chunk_reload', now.toString())
        console.warn('[ErrorBoundary] Chunk error detected, reloading page...')
        window.location.reload()
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const isDev = import.meta.env.DEV

    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20
                        flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-red-400" />
        </div>

        <h2 className="text-white font-bold text-lg mb-1">
          Une erreur est survenue
        </h2>

        <p className="text-slate-400 text-sm max-w-sm mb-4">
          {this.props.message ?? 'Cette section a rencontré un problème inattendu.'}
        </p>

        {/* Détail technique en dev uniquement */}
        {isDev && this.state.error && (
          <pre className="text-left text-xs text-red-400/80 bg-red-500/5 border border-red-500/15
                          rounded-xl p-3 max-w-lg w-full overflow-auto mb-4 font-mono">
            {this.state.error.message}
          </pre>
        )}

        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-raised
                     border border-surface-border text-slate-300 text-sm
                     hover:text-white hover:border-slate-600 transition-colors"
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }
}
