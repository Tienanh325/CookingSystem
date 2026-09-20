import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as Crypto from 'expo-crypto'
import Constants from 'expo-constants'
import { goiApi } from './KetNoiApi'
WebBrowser.maybeCompleteAuthSession()
export async function xacThucMangXa(provider) {
  if (Platform.OS !== 'web' && Constants.executionEnvironment === 'storeClient') {
    throw new Error(
      'Đăng nhập mạng xã hội cần bản development build của ứng dụng, không dùng Expo Go.',
    )
  }
  const verifier = Array.from(await Crypto.getRandomBytesAsync(32), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('')
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier)
  const redirectUri = Platform.OS === 'web' ? window.location.origin + '/' : 'cookmate://auth'
  const start = await goiApi('/auth/oauth/start', {
    method: 'POST',
    body: { provider, redirectUri, challenge },
  })
  const result = await WebBrowser.openAuthSessionAsync(start.data.url, redirectUri)
  if (result.type !== 'success') throw new Error('Bạn đã hủy đăng nhập.')
  const url = new URL(result.url)
  if (url.searchParams.get('state') !== start.data.state)
    throw new Error('Phiên đăng nhập không hợp lệ.')
  if (url.searchParams.get('error')) throw new Error(url.searchParams.get('error'))
  const r = await goiApi('/auth/oauth/exchange', {
    method: 'POST',
    body: { ticket: url.searchParams.get('ticket'), verifier },
  })
  return r.data
}
