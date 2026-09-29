import { requireOptionalNativeModule } from 'expo'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionOptions,
} from 'expo-speech-recognition'

type DangKySuKien = { remove: () => void }
type ModuleNhanDangGiongNoi = {
  addListener: <K extends keyof ExpoSpeechRecognitionNativeEventMap>(
    eventName: K,
    listener: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void,
  ) => DangKySuKien
  isRecognitionAvailable: () => boolean
  requestPermissionsAsync: () => Promise<{ granted: boolean }>
  start: (options: ExpoSpeechRecognitionOptions) => void
  stop: () => void
}

const moduleGiongNoi =
  requireOptionalNativeModule<ModuleNhanDangGiongNoi>('ExpoSpeechRecognition')

const thongBaoLoi = (code?: string) => {
  if (!moduleGiongNoi)
    return 'Tìm kiếm giọng nói cần bản Cookmate development; Expo Go chưa hỗ trợ tính năng này.'
  if (code === 'not-allowed') return 'Bạn chưa cấp quyền micro hoặc nhận dạng giọng nói.'
  if (code === 'no-speech') return 'Cookmate chưa nghe rõ. Bạn hãy thử nói lại.'
  if (code === 'language-not-supported') return 'Thiết bị chưa hỗ trợ nhận dạng tiếng Việt.'
  if (code === 'network') return 'Nhận dạng giọng nói cần kết nối mạng trên thiết bị này.'
  return 'Không thể nhận dạng giọng nói. Bạn vẫn có thể nhập tên món.'
}

export default function useTimKiemGiongNoi(onResult: (text: string) => void) {
  const [dangNghe, setDangNghe] = useState(false)
  const [loiGiongNoi, setLoiGiongNoi] = useState('')
  const onResultRef = useRef(onResult)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  useEffect(() => {
    if (!moduleGiongNoi) return
    const subscriptions = [
      moduleGiongNoi.addListener('start', () => {
        setDangNghe(true)
        setLoiGiongNoi('')
      }),
      moduleGiongNoi.addListener('end', () => setDangNghe(false)),
      moduleGiongNoi.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript?.trim()
        if (transcript) onResultRef.current(transcript)
        if (event.isFinal) moduleGiongNoi.stop()
      }),
      moduleGiongNoi.addListener('nomatch', () => setLoiGiongNoi(thongBaoLoi('no-speech'))),
      moduleGiongNoi.addListener('error', (event) => {
        setDangNghe(false)
        if (event.error !== 'aborted') setLoiGiongNoi(thongBaoLoi(event.error))
      }),
    ]
    return () => subscriptions.forEach((subscription) => subscription.remove())
  }, [])

  const batDau = useCallback(async () => {
    setLoiGiongNoi('')
    if (!moduleGiongNoi) {
      setLoiGiongNoi(thongBaoLoi())
      return
    }
    if (!moduleGiongNoi.isRecognitionAvailable()) {
      setLoiGiongNoi('Thiết bị chưa bật dịch vụ nhận dạng giọng nói.')
      return
    }
    const permission = await moduleGiongNoi.requestPermissionsAsync()
    if (!permission.granted) {
      setLoiGiongNoi(thongBaoLoi('not-allowed'))
      return
    }
    moduleGiongNoi.start({
      lang: 'vi-VN',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      recordingOptions: { persist: false },
      androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'web_search' },
    })
  }, [])

  const chuyenTrangThai = useCallback(() => {
    if (dangNghe) moduleGiongNoi?.stop()
    else batDau().catch(() => setLoiGiongNoi(thongBaoLoi()))
  }, [batDau, dangNghe])

  return { dangNghe, loiGiongNoi, chuyenTrangThai }
}
