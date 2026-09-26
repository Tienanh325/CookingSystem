import { useCallback, useState } from 'react'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'

const thongBaoLoi = (code?: string) => {
  if (code === 'not-allowed') return 'Bạn chưa cấp quyền micro hoặc nhận dạng giọng nói.'
  if (code === 'no-speech') return 'Cookmate chưa nghe rõ. Bạn hãy thử nói lại.'
  if (code === 'language-not-supported') return 'Thiết bị chưa hỗ trợ nhận dạng tiếng Việt.'
  if (code === 'network') return 'Nhận dạng giọng nói cần kết nối mạng trên thiết bị này.'
  return 'Không thể nhận dạng giọng nói. Bạn vẫn có thể nhập tên món.'
}

export default function useTimKiemGiongNoi(onResult: (text: string) => void) {
  const [dangNghe, setDangNghe] = useState(false)
  const [loiGiongNoi, setLoiGiongNoi] = useState('')

  useSpeechRecognitionEvent('start', () => {
    setDangNghe(true)
    setLoiGiongNoi('')
  })
  useSpeechRecognitionEvent('end', () => setDangNghe(false))
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim()
    if (transcript) onResult(transcript)
    if (event.isFinal) ExpoSpeechRecognitionModule.stop()
  })
  useSpeechRecognitionEvent('nomatch', () => setLoiGiongNoi(thongBaoLoi('no-speech')))
  useSpeechRecognitionEvent('error', (event) => {
    setDangNghe(false)
    if (event.error !== 'aborted') setLoiGiongNoi(thongBaoLoi(event.error))
  })

  const batDau = useCallback(async () => {
    setLoiGiongNoi('')
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setLoiGiongNoi('Thiết bị chưa bật dịch vụ nhận dạng giọng nói.')
      return
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permission.granted) {
      setLoiGiongNoi(thongBaoLoi('not-allowed'))
      return
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'vi-VN',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      recordingOptions: { persist: false },
      androidIntentOptions: { EXTRA_LANGUAGE_MODEL: 'web_search' },
    })
  }, [])

  const chuyenTrangThai = useCallback(() => {
    if (dangNghe) ExpoSpeechRecognitionModule.stop()
    else batDau().catch(() => setLoiGiongNoi(thongBaoLoi()))
  }, [batDau, dangNghe])

  return { dangNghe, loiGiongNoi, chuyenTrangThai }
}
