import { Link, Navigate } from "react-router-dom";
import { useGetFavoritesQuery } from "../store/api";
import { useAppSelector } from "../hooks";
export function FavoritesPage() {
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
          {items.map((p) => (<article key={p.id} className="card">
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
