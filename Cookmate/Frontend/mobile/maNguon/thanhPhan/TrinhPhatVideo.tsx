import React from 'react'
import { Platform, Text, View, useWindowDimensions } from 'react-native'
import { WebView } from 'react-native-webview'
import { kieuDang as s, mauSac } from '../ChuDe'

function layMaYoutube(url: string) {
  const match = String(url || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/))([\w-]{11})/i)
  return match?.[1] || null
}

export default function TrinhPhatVideo({ url, title = 'Video hướng dẫn' }: { url: string, title?: string }) {
  const videoId = layMaYoutube(url)
  const { width } = useWindowDimensions()
  const playerWidth = Math.min(Math.max(width - 44, 280), 720)
  const height = Math.round(playerWidth * 9 / 16)
  if (!videoId) {
    return <View style={[s.card, { backgroundColor: mauSac.soft }]}>
      <Text style={s.muted}>Liên kết video không hợp lệ.</Text>
    </View>
  }
  const source = `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`
  return <View accessibilityLabel={title} style={{ width: '100%', maxWidth: 720, height, borderRadius: 14, overflow: 'hidden', backgroundColor: '#111' }}>
    {Platform.OS === 'web'
      ? React.createElement('iframe' as any, {
          src: source,
          title,
          width: '100%',
          height: '100%',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
          allowFullScreen: true,
          style: { border: 0 },
        })
      : <WebView
          source={{ uri: source, headers: { Referer: 'https://cookmate.app/' } }}
          originWhitelist={['https://*']}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          style={{ width: playerWidth, height, backgroundColor: '#111' }}
        />}
  </View>
}

export { layMaYoutube }
