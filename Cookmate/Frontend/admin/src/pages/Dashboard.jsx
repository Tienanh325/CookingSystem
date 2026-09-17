import { Link } from 'react-router-dom'
import { ArrowUpRight, BookOpen, Users, Flame, Layers3, Plus, ChefHat } from 'lucide-react'
import { useAuth } from '../context/auth'
import useResource from '../lib/useResource'
import { PageTitle, ResourceState, Status } from '../components/ui'
import { date, imageUrl } from '../lib/api'
export default function Dashboard() {
  const { user } = useAuth(),
    r = useResource('/admin/dashboard'),
    data = r.data
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
      <ResourceState {...r} reload={r.reload} />
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
              <div className="panel-heading">
                <div>
                  <h2>Công thức mới nhất</h2>
                  <p className="muted">Những hương vị vừa được thêm vào bếp</p>
                </div>
                <Link to="/recipes" className="text-link">
                  Xem tất cả <ArrowUpRight size={16} />
                </Link>
              </div>
              {data.recent.length ? (
                <div className="recipe-mini-list">
                  {data.recent.map((item) => (
                    <Link
                      key={item.idMonAn}
                      to={`/recipes/${item.idMonAn}/edit`}
                      className="recipe-mini"
                    >
                      <div className="recipe-thumb">
                        {item.anhDaiDien ? (
                          <img src={imageUrl(item.anhDaiDien)} alt="" />
                        ) : (
                          <ChefHat />
                        )}
                      </div>
                      <div>
                        <strong>{item.tenMonAn}</strong>
                        <small>
                          {item.danhMuc?.tenDanhMuc} · {date(item.ngayTao)}
                        </small>
                      </div>
                      <Status active={item.trangThai === 1} />
                    </Link>
                  ))}
                </div>
              ) : (
                <ResourceState empty />
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Nhịp bếp mỗi ngày</h2>
                  <p className="muted">Phiên nấu trong 30 ngày gần nhất</p>
                </div>
              </div>
              {data.activity.length ? (
                <div className="activity-chart">
                  {data.activity.map((item) => (
                    <div key={item.date} title={`${item.date}: ${item.count} lượt nấu`}>
                      <span>{item.count}</span>
                      <i
                        style={{
                          height: `${Math.max(8, (Number(item.count) / Math.max(...data.activity.map((x) => Number(x.count)))) * 150)}px`,
                        }}
                      />
                      <small>{String(item.date).slice(5)}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <Flame size={34} />
                  <p>Chưa có phiên nấu trong 30 ngày qua.</p>
                </div>
              )}
              <div className="chart-note">{data.hidden} công thức đang ở chế độ ẩn</div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
