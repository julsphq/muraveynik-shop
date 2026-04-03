import { Link, useNavigate } from "react-router-dom";
import { useGetProductsQuery, useGetCategoryTreeQuery, useGetBannersQuery, } from "../store/api";
import { useState } from "react";
import { getProductImageUrl } from "../productImage";
export function HomePage() {
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const { data: tree } = useGetCategoryTreeQuery();
    const { data: popular } = useGetProductsQuery({
        sort: "popular",
        page: 1,
        limit: 4,
    });
    const { data: novelties } = useGetProductsQuery({
        isNew: true,
        page: 1,
        limit: 4,
    });
    const { data: bannersData } = useGetBannersQuery();
    function onSearch(e: React.FormEvent) {
        e.preventDefault();
        const v = q.trim();
        if (v)
            navigate(`/catalog?q=${encodeURIComponent(v)}`);
        else
            navigate("/catalog");
    }
    return (<div>
      <section className="hero hero--home">
        <div className="hero-home__banner">
          <p className="hero-home__kicker">ИП «Муравейник» · строительные материалы</p>
          <h1>Стройка и ремонт — с доставкой по городу</h1>
          <p className="hero-home__lead">
            Розничная торговля материалами, инструментом, ЛКМ и напольными
            покрытиями. Актуальные остатки, быстрая доставка и удобное оформление заказа.
          </p>
          <form className="hero-search" onSubmit={onSearch}>
            <input type="search" placeholder="Поиск по названию или артикулу" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Поиск по каталогу"/>
            <button type="submit" className="btn btn--primary">
              Найти
            </button>
          </form>
        </div>
      </section>

      {bannersData && bannersData.items.length > 0 && (<section className="section-block">
          <h2 className="section-block__title">Акции и предложения</h2>
          <div style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            }}>
            {bannersData.items.map((b) => (<Link key={b.id} to={b.linkHref || "/catalog"} className="card card--flat" style={{
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid rgba(46,125,50,0.25)",
                }}>
                <h3 style={{ marginTop: 0 }}>{b.title}</h3>
                {b.subtitle && (<p style={{ color: "var(--muted)", margin: 0 }}>{b.subtitle}</p>)}
              </Link>))}
          </div>
        </section>)}

      {tree && tree.length > 0 && (<section className="section-block">
          <h2 className="section-block__title">Категории</h2>
          <div className="category-chips">
            {tree.map((c) => (<Link key={c.id} className="category-chip" to={`/catalog?category=${c.slug}`}>
                {c.name}
              </Link>))}
            {tree.flatMap((c) => c.children ?? []).map((c) => (<Link key={c.id} className="category-chip category-chip--sub" to={`/catalog?category=${c.slug}`}>
                {c.name}
              </Link>))}
          </div>
        </section>)}

      <section className="section-block">
        <h2 className="section-block__title">Популярные товары</h2>
        <div className="card-grid">
          {popular?.items.map((p) => (<article key={p.id} className="card card--clickable" role="link" tabIndex={0} onClick={() => navigate(`/product/${p.slug}`)} onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/product/${p.slug}`);
                }
            }}>
              <img className="card__image" src={getProductImageUrl(p)} alt={p.name} loading="lazy"/>
              <span className="pill">{p.category?.name}</span>
              <h3 className="card__h3">
                <Link to={`/product/${p.slug}`}>{p.name}</Link>
              </h3>
              <div className="card__price">
                {Number(p.price).toLocaleString("ru-RU")} ₽
              </div>
            </article>))}
        </div>
        <p>
          <Link to="/catalog?sort=popular">Все хиты →</Link>
        </p>
      </section>

      <section className="section-block">
        <h2 className="section-block__title">Новинки</h2>
        <div className="card-grid">
          {novelties?.items.map((p) => (<article key={p.id} className="card card--clickable" role="link" tabIndex={0} onClick={() => navigate(`/product/${p.slug}`)} onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/product/${p.slug}`);
                }
            }}>
              <img className="card__image" src={getProductImageUrl(p)} alt={p.name} loading="lazy"/>
              <span className="pill">новинка</span>
              <h3 className="card__h3">
                <Link to={`/product/${p.slug}`}>{p.name}</Link>
              </h3>
              <div className="card__price">
                {Number(p.price).toLocaleString("ru-RU")} ₽
              </div>
            </article>))}
        </div>
      </section>

      <section className="section-block advantages">
        <h2 className="section-block__title">Почему мы</h2>
        <div className="card-grid">
          <div className="card card--flat">
            <h3>Широкий ассортимент</h3>
            <p>От цемента и ГКЛ до линолеума и красок — иерархический каталог.</p>
          </div>
          <div className="card card--flat">
            <h3>Доставка по городу</h3>
            <p>Расчёт стоимости от веса заказа; самовывоз без доплаты.</p>
          </div>
          <div className="card card--flat">
            <h3>Безопасная оплата</h3>
            <p>Оплата онлайн и при получении, прозрачные условия и поддержка.</p>
          </div>
        </div>
      </section>
    </div>);
}
