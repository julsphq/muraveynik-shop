import { Link, useSearchParams } from "react-router-dom";
import { useGetCategoriesQuery, useGetProductsQuery } from "../store/api";
export function CatalogPage() {
    const [params, setParams] = useSearchParams();
    const category = params.get("category") || undefined;
    const search = params.get("q") || undefined;
    const page = Number(params.get("page")) || 1;
    const sort = params.get("sort") || "name";
    const brand = params.get("brand") || undefined;
    const material = params.get("material") || undefined;
    const sizeLabel = params.get("size") || undefined;
    const priceMin = params.get("priceMin")
        ? Number(params.get("priceMin"))
        : undefined;
    const priceMax = params.get("priceMax")
        ? Number(params.get("priceMax"))
        : undefined;
    const inStock = params.get("inStock") === "1";
    const { data: categories } = useGetCategoriesQuery();
    const { data, isLoading, isError } = useGetProductsQuery({
        category,
        search,
        page,
        sort,
        brand: brand || undefined,
        material: material || undefined,
        sizeLabel: sizeLabel || undefined,
        priceMin: Number.isFinite(priceMin) ? priceMin : undefined,
        priceMax: Number.isFinite(priceMax) ? priceMax : undefined,
        inStock: inStock || undefined,
    });
    function setParam(key: string, value: string | null) {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        next.delete("page");
        setParams(next);
    }
    return (<div>
      <div className="hero" style={{ marginBottom: "1.5rem" }}>
        <h1>Каталог</h1>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Поиск по названию и артикулу; фильтры: цена, бренд, материал, размер,
          наличие.
        </p>
      </div>

      <div className="filters" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <div className="field" style={{ marginBottom: 0, minWidth: "200px" }}>
            <label htmlFor="q">Поиск</label>
            <input id="q" type="search" placeholder="Название или артикул" defaultValue={search ?? ""} onKeyDown={(e) => {
            if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                setParam("q", v || null);
            }
        }}/>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: "200px" }}>
            <label htmlFor="cat">Категория</label>
            <select id="cat" value={category ?? ""} onChange={(e) => setParam("category", e.target.value || null)}>
              <option value="">Все</option>
              {categories?.map((c) => (<option key={c.id} value={c.slug}>
                  {c.name}
                </option>))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0, minWidth: "160px" }}>
            <label htmlFor="sort">Сортировка</label>
            <select id="sort" value={sort} onChange={(e) => setParam("sort", e.target.value)}>
              <option value="name">По названию</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
              <option value="popular">По популярности</option>
              <option value="new">Новинки</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, width: "140px" }}>
            <label htmlFor="mat">Материал</label>
            <input id="mat" placeholder="часть названия" defaultValue={material ?? ""} onKeyDown={(e) => {
            if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                setParam("material", v || null);
            }
        }}/>
          </div>
          <div className="field" style={{ marginBottom: 0, width: "140px" }}>
            <label htmlFor="sz">Размер / фасовка</label>
            <input id="sz" placeholder="часть строки" defaultValue={sizeLabel ?? ""} onKeyDown={(e) => {
            if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                setParam("size", v || null);
            }
        }}/>
          </div>
          <div className="field" style={{ marginBottom: 0, width: "140px" }}>
            <label htmlFor="brand">Бренд</label>
            <input id="brand" placeholder="точное совпадение" defaultValue={brand ?? ""} onKeyDown={(e) => {
            if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                setParam("brand", v || null);
            }
        }}/>
          </div>
          <div className="field" style={{ marginBottom: 0, width: "100px" }}>
            <label htmlFor="pmin">Цена от</label>
            <input id="pmin" type="number" min={0} placeholder="0" defaultValue={priceMin ?? ""} onKeyDown={(e) => {
            if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value;
                setParam("priceMin", v || null);
            }
        }}/>
          </div>
          <div className="field" style={{ marginBottom: 0, width: "100px" }}>
            <label htmlFor="pmax">Цена до</label>
            <input id="pmax" type="number" min={0} placeholder="∞" defaultValue={priceMax ?? ""} onKeyDown={(e) => {
            if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value;
                setParam("priceMax", v || null);
            }
        }}/>
          </div>
          <label style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: "0.9rem",
        }}>
            <input type="checkbox" checked={inStock} onChange={(e) => setParam("inStock", e.target.checked ? "1" : null)}/>
            Только в наличии
          </label>
        </div>
      </div>

      {isLoading && <p>Загрузка…</p>}
      {isError && <div className="alert">Не удалось загрузить каталог</div>}

      <div className="card-grid">
        {data?.items.map((p) => (<article key={p.id} className="card">
            <span className="pill">{p.category?.name ?? "—"}</span>
            <h2>
              <Link to={`/product/${p.slug}`}>{p.name}</Link>
            </h2>
            <p style={{
                margin: 0,
                fontSize: "0.9rem",
                color: "var(--muted)",
                flex: 1,
            }}>
              {p.description.slice(0, 120)}
              {p.description.length > 120 ? "…" : ""}
            </p>
            <div className="card__meta">
              {p.brand && `${p.brand} · `}SKU: {p.sku} · Остаток: {p.stock}
            </div>
            <div className="card__price">
              {Number(p.price).toLocaleString("ru-RU")} ₽
            </div>
            <Link to={`/product/${p.slug}`} className="btn btn--primary" style={{ alignSelf: "flex-start" }}>
              Подробнее
            </Link>
          </article>))}
      </div>

      {data && data.pages > 1 && (<div style={{ marginTop: "2rem", display: "flex", gap: "0.5rem" }}>
          {page > 1 && (<button type="button" className="btn btn--ghost" onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", String(page - 1));
                    setParams(next);
                }}>
              Назад
            </button>)}
          <span style={{ alignSelf: "center", color: "var(--muted)" }}>
            Стр. {page} из {data.pages}
          </span>
          {page < data.pages && (<button type="button" className="btn btn--ghost" onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("page", String(page + 1));
                    setParams(next);
                }}>
              Вперёд
            </button>)}
        </div>)}
    </div>);
}
