import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
export default function useResource(path) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: '' })
  const [revision, setRevision] = useState(0)
  const key = `${path}:${revision}`
  const reload = useCallback(() => setRevision((v) => v + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    api(path, { signal: controller.signal })
      .then((r) => setState({ key, data: r.data, meta: r.meta, loading: false, error: '' }))
      .catch((e) => {
        if (e.name !== 'AbortError')
          setState({ key, data: null, meta: null, loading: false, error: e.message })
      })
    return () => controller.abort()
  }, [path, key])
  return state.key === key
    ? { ...state, reload }
    : { data: null, meta: null, loading: true, error: '', reload }
}
