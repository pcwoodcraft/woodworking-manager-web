import { useEffect, useState } from 'react'
import { apiCall } from '../../api/client'

export default function SalesOwnerSelect({ value, onChange, disabled, className }) {
  const [users, setUsers] = useState([])
  useEffect(() => {
    apiCall('getSalesUsers').then(setUsers).catch(() => {})
  }, [])

  return (
    <select
      className={className}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">— vyberte —</option>
      {users.map(u => (
        <option key={u.email} value={u.email}>{u.name}</option>
      ))}
    </select>
  )
}
