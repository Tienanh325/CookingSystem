import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Users, Flame, Layers3, Plus, ChefHat } from 'lucide-react'
import { useAuth } from '../context/auth'
import useResource from '../lib/useResource'
import { PageTitle, ResourceState } from '../components/ui'
import { imageUrl } from '../lib/api'

const PERIODS = [
  ['all', 'Tất cả'],
  ['month', 'Tháng này'],
  ['day', 'Hôm nay'],
]

function formatChartDate(value, withYear = false) {
  const [year, month, day] = String(value).split('-')
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('all')
  const r = useResource(`/admin/dashboard?period=${period}`)
  const data = r.data
  const maxActivity = Math.max(1, ...(data?.activity || []).map((item) => Number(item.count)))

  return (
    <>
      <PageTitle
        title={`Xin chào, ${user.hoTen.split(' ').at(-1)}!`}
        description="Một ngày mới, thêm nhiều cảm hứng cho căn bếp."
      />
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">GÓC BẾP COOKMATE</span>
          <h2>
            Món ngon bắt đầu từ
            <br />
            một công thức được chăm chút.
          </h2>
          <p>Thêm hương vị mới vào bộ sưu tập hôm nay.</p>
          <Link className="button" to="/recipes/new">
            <Plus size={18} />
            Thêm công thức
          </Link>
        </div>
        <div className="banner-art">
          <ChefHat size={104} strokeWidth={1.1} />
          <span>cooking with love</span>
        </div>
      </section>
      <ResourceState loading={r.loading} error={r.error} reload={r.reload} />
      {data && (
        <>
          <div className="stats-grid">
            {[
              [BookOpen, 'Công thức công khai', data.recipes, 'orange'],
              [Users, 'Người dùng', data.users, 'blue'],
              [Flame, 'Lượt nấu hoàn thành', data.cooks, 'green'],
              [Layers3, 'Danh mục hoạt động', data.categories, 'purple'],
            ].map(([Icon, label, value, color]) => (
              <article className="stat-card" key={label}>
                <span className={`stat-icon ${color}`}>
                  <Icon size={22} />
                </span>
                <span className="muted">{label}</span>
                <strong>{value.toLocaleString('vi-VN')}</strong>
                <small>Dữ liệu toàn hệ thống</small>
              </article>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading ranking-heading">
                <div>
                  <h2>Xếp hạng món được nấu nhiều</h2>
                  <p className="muted">Dựa trên số phiên nấu đã hoàn thành</p>
                </div>
                <div className="ranking-actions">
                  <div className="period-filter" role="group" aria-label="Lọc thời gian xếp hạng">
                    {PERIODS.map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        className={period === value ? 'active' : ''}
                        aria-pressed={period === value}
                        onClick={() => setPeriod(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Link to={`/rankings?type=cooked_most&period=${period}`} className="text-link">
                    Xem tất cả <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
              {data.ranking.length ? (
                <div className="recipe-mini-list ranking-list">
                  {data.ranking.map((item) => (
                    <Link
                      key={item.idMonAn}
                      to={`/recipes/${item.idMonAn}/edit`}
                      className="recipe-mini"
                    >
                      <strong className={`rank-number rank-${item.xepHang}`}>#{item.xepHang}</strong>
                      <div className="recipe-thumb">
                        {item.anhDaiDien ? (
                          <img src={imageUrl(item.anhDaiDien)} alt="" />
                        ) : (
                          <ChefHat />
                        )}
                      </div>
                      <div>
                        <strong>{item.tenMonAn}</strong>
                        <small>{item.danhMuc?.tenDanhMuc || 'Chưa có danh mục'}</small>
                      </div>
                      <span className="cook-count">
                        <Flame size={13} />
                        {Number(item.soLuotNau).toLocaleString('vi-VN')} lượt
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty ranking-empty">
                  <ChefHat size={34} />
                  <p>Chưa có món nào được nấu hoàn thành trong khoảng thời gian này.</p>
                </div>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Nhịp bếp mỗi ngày</h2>
                  <p className="muted">Phiên nấu trong 30 ngày gần nhất</p>
                </div>
              </div>
              <div className="activity-chart-scroll">
                <div className="activity-chart">
                  {data.activity.map((item) => {
                    const count = Number(item.count)
                    const height = count ? Math.max(7, (count / maxActivity) * 100) : 0
                    return (
                      <div
                        className="activity-column"
                        key={item.date}
                        title={`${formatChartDate(item.date, true)}: ${count} lượt nấu`}
                      >
                        <span>{count}</span>
                        <div className="activity-bar-track">
                          <i style={{ height: `${height}%` }} />
                        </div>
                        <small>{formatChartDate(item.date)}</small>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="chart-note">{data.hidden} công thức đang ở chế độ ẩn</div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
