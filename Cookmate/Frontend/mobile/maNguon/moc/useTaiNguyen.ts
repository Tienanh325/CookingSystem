import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { goiApi } from '../dichVu/KetNoiApi'
export default function useTaiNguyen(path, enabled = true) {
  const [state, setState] = useState({ data: null, meta: null, loading: enabled, error: '' }),
    [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((v) => v + 1), [])
  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setState({ data: null, meta: null, loading: false, error: '' })
        return
      }
      const controller = new AbortController()
      setState((s) => ({ ...s, loading: true, error: '' }))
      goiApi(path, { signal: controller.signal })
        .then((r) => {
          if (!controller.signal.aborted)
            setState({ data: r.data, meta: r.meta, loading: false, error: '' })
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setState({ data: null, meta: null, loading: false, error: e.message })
        })
      return () => controller.abort()
    }, [path, enabled, revision]),
  )
  return { ...state, reload }
}
