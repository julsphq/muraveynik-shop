import { Link, Navigate, useNavigate } from "react-router-dom";
import { useGetFavoritesQuery } from "../store/api";
import { useAppSelector } from "../hooks";
import { getProductImageUrl } from "../productImage";
export function FavoritesPage() {
    const navigate = useNavigate();
    const token = useAppSelector((s) => s.auth.token);
    const { data, isLoading } = useGetFavoritesQuery(undefined, {
        skip: !token,
    });
    if (!token)
        return <Navigate to="/login" replace/>;
    if (isLoading)
        return <p>Загрузка…</p>;
    const items = data ?? [];
    return (<div>
      <h1>Избранное</h1>
      {items.length === 0 ? (<p style={{ color: "var(--muted)" }}>
          Пока пусто. Добавляйте товары с карточки товара.
        </p>) : (<div className="card-grid">
          {items.map((p) => (<article key={p.id} className="card card--clickable" role="link" tabIndex={0} onClick={() => navigate(`/product/${p.slug}`)} onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/product/${p.slug}`);
                }
            }}>
              <img className="card__image" src={getProductImageUrl(p)} alt={p.name} loading="lazy"/>
              <h2 style={{ fontSize: "1.05rem", margin: 0 }}>
                <Link to={`/product/${p.slug}`}>{p.name}</Link>
              </h2>
              <div className="card__price">
                {Number(p.price).toLocaleString("ru-RU")} ₽
              </div>
              <Link className="btn btn--primary" to={`/product/${p.slug}`}>
                Открыть
              </Link>
            </article>))}
        </div>)}
    </div>);
}
