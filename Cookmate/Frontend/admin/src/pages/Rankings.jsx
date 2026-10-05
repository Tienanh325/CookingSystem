import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChefHat,
  Flame,
  Heart,
  MessageCircle,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import useResource from '../lib/useResource'
import { imageUrl } from '../lib/api'
import { PageTitle, Pagination, ResourceState } from '../components/ui'

const RANKING_TYPES = [
  { key: 'cooked_most', label: 'Nấu nhiều nhất', description: 'Món có nhiều phiên nấu hoàn thành nhất', icon: Flame },
  { key: 'cooked_least', label: 'Nấu ít nhất', description: 'Món có ít phiên nấu hoàn thành nhất', icon: TrendingDown },
  { key: 'rating_high', label: 'Đánh giá cao', description: 'Điểm sao trung bình cao nhất', icon: Star },
  { key: 'rating_low', label: 'Đánh giá thấp', description: 'Điểm sao trung bình thấp nhất', icon: TrendingDown },
  { key: 'favorite_most', label: 'Yêu thích nhất', description: 'Được nhiều người lưu nhất', icon: Heart },
  { key: 'comments_most', label: 'Nhiều bình luận', description: 'Nhận được nhiều bình luận nhất', icon: MessageCircle },
  { key: 'comments_least', label: 'Ít bình luận', description: 'Nhận được ít bình luận nhất', icon: TrendingUp },
]
const PERIODS = [
  ['all', 'Tất cả'],
  ['month', 'Tháng này'],
  ['day', 'Hôm nay'],
]

function positiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10)
  return Number.isInteger(number) && number > 0 ? number : fallback
}

export default function Rankings() {
  const [params, setParams] = useSearchParams()
  const requestedType = params.get('type') || 'cooked_most'
  const type = RANKING_TYPES.some((item) => item.key === requestedType)
    ? requestedType
    : 'cooked_most'
  const requestedPeriod = params.get('period') || 'all'
  const period = PERIODS.some(([value]) => value === requestedPeriod) ? requestedPeriod : 'all'
  const page = positiveInteger(params.get('page'), 1)
  const limit = Math.min(50, positiveInteger(params.get('limit'), 10))
  const selected = RANKING_TYPES.find((item) => item.key === type)
  const r = useResource(
    `/admin/xep-hang?type=${type}&period=${period}&page=${page}&limit=${limit}`,
  )
  const items = r.data?.items || []

  function update(values) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) next.set(key, String(value))
    setParams(next)
  }

  function metric(item) {
    if (type.startsWith('rating_'))
      return `${Number(item.giaTri).toFixed(1)} sao · ${item.soDanhGia} đánh giá`
    return `${Number(item.giaTri).toLocaleString('vi-VN')} ${r.data?.donVi || ''}`
  }

  return (
    <>
      <PageTitle
        eyebrow="THỐNG KÊ CÔNG THỨC"
        title="Bảng xếp hạng công thức"
        description="Theo dõi món ăn nổi bật hoặc cần được cải thiện dựa trên dữ liệu sử dụng thực tế."
      >
        <Link className="button secondary" to="/">
          <ArrowLeft size={17} />
          Bảng điều khiển
        </Link>
      </PageTitle>

      <nav className="ranking-type-grid" aria-label="Loại bảng xếp hạng">
        {RANKING_TYPES.map(({ key, label, description, icon: Icon }) => (
          <Link
            key={key}
            to={`/rankings?type=${key}&period=${period}&page=1&limit=${limit}`}
            className={`ranking-type-card ${type === key ? 'active' : ''}`}
            aria-current={type === key ? 'page' : undefined}
          >
            <span><Icon size={19} /></span>
            <strong>{label}</strong>
            <small>{description}</small>
          </Link>
        ))}
      </nav>

      <section className="panel ranking-page-panel">
        <div className="panel-heading ranking-page-heading">
          <div>
            <h2>{selected.label}</h2>
            <p className="muted">{selected.description}</p>
          </div>
          <div className="period-filter" role="group" aria-label="Lọc thời gian xếp hạng">
            {PERIODS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={period === value ? 'active' : ''}
                aria-pressed={period === value}
                onClick={() => update({ period: value, page: 1 })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ResourceState
          loading={r.loading}
          error={r.error}
          empty={!r.loading && !r.error && !items.length}
          reload={r.reload}
        />
        {!!items.length && (
          <div className="ranking-page-list">
            {items.map((item) => (
              <Link
                className="ranking-page-row"
                key={item.idMonAn}
                to={`/recipes/${item.idMonAn}/edit`}
              >
                <strong className={`rank-number rank-${item.xepHang}`}>#{item.xepHang}</strong>
                <div className="recipe-thumb">
                  {item.anhDaiDien ? (
                    <img src={imageUrl(item.anhDaiDien)} alt="" />
                  ) : (
                    <ChefHat />
                  )}
                </div>
                <div className="ranking-recipe-name">
                  <strong>{item.tenMonAn}</strong>
                  <small>{item.danhMuc?.tenDanhMuc || 'Chưa có danh mục'}</small>
                </div>
                <span className="ranking-metric">{metric(item)}</span>
              </Link>
            ))}
          </div>
        )}
        <Pagination
          meta={r.meta}
          page={page}
          onChange={(value) => update({ page: value })}
          limit={limit}
          onLimitChange={(value) => update({ limit: value, page: 1 })}
        />
      </section>
    </>
  )
}
