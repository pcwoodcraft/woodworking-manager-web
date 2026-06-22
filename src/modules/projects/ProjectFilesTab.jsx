import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { Spinner, ErrorBox } from '../../components/ui'
import { useToast } from '../../components/Toast'

function fmtFileDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear()
  } catch {
    return '—'
  }
}

export default function ProjectFilesTab({ project, onProjectUpdated }) {
  const toast = useToast()
  const { can } = useAuth()
  const canWrite = can('perm_projects_write')
  const [state, setState] = useState({ loading: true, error: null })
  const [data, setData] = useState({ files: [], driveFolderUrl: '' })
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setState({ loading: true, error: null })
    try {
      const res = await apiCall('getProjectFiles', { projectId: project.id })
      setData({ files: res.files || [], driveFolderUrl: res.driveFolderUrl || project.driveFolderUrl || '' })
      setState({ loading: false, error: null })
    } catch (e) {
      setState({ loading: false, error: e })
    }
  }

  useEffect(() => { load() }, [project.id, project.driveFolderId]) // eslint-disable-line react-hooks/exhaustive-deps

  const createFolder = async () => {
    setCreating(true)
    try {
      const res = await apiCall('ensureProjectFolder', { projectId: project.id })
      toast(res.created ? 'Priečinok vytvorený na Drive' : 'Priečinok už existuje')
      if (onProjectUpdated) await onProjectUpdated()
      await load()
    } catch (e) {
      toast('Nepodarilo sa vytvoriť priečinok: ' + e.message, 'err')
    } finally {
      setCreating(false)
    }
  }

  if (state.loading) return <Spinner label="Načítavajú sa súbory…" />
  if (state.error) return <ErrorBox error={state.error} onRetry={load} />

  const folderUrl = data.driveFolderUrl || project.driveFolderUrl
  const hasFolder = !!(project.driveFolderId || folderUrl)

  return (
    <div className="card">
      <div className="card-head">
        <h2>Súbory ({data.files.length})</h2>
        <div className="btn-group">
          {hasFolder && folderUrl && (
            <a className="btn btn-sm btn-secondary" href={folderUrl} target="_blank" rel="noreferrer">
              Otvoriť priečinok na Drive
            </a>
          )}
          {!hasFolder && canWrite && (
            <button className="btn btn-sm" onClick={createFolder} disabled={creating}>
              {creating ? 'Vytvára sa…' : 'Vytvoriť priečinok na Drive'}
            </button>
          )}
        </div>
      </div>

      {!hasFolder ? (
        <p className="muted">
          Projekt ešte nemá priečinok na zdieľanom disku.
          {canWrite ? ' Kliknite na tlačidlo vyššie pre vytvorenie.' : ' Požiadajte kolegu s právom upravovať projekty.'}
        </p>
      ) : data.files.length === 0 ? (
        <p className="muted">
          Priečinok je pripravený, zatiaľ v ňom nie sú súbory. Nahrajte PDF, fotky alebo výkresy priamo cez Google Drive
          (web alebo mobil) do podpriečinkov Dokumentácia, Výkresy, Fotky, Faktúry.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Súbor</th><th>Priečinok</th><th>Upravené</th></tr>
          </thead>
          <tbody>
            {data.files.map((f, i) => (
              <tr key={i}>
                <td>
                  <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
                </td>
                <td>{f.folder}</td>
                <td>{fmtFileDate(f.modifiedTime)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
