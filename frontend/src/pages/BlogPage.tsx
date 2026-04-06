import { Link } from "react-router-dom";
import { useGetBlogPostsQuery } from "../store/api";
export function BlogPage() {
    const { data, isLoading, isError } = useGetBlogPostsQuery();
    return (<div style={{ maxWidth: "640px" }}>
      <h1>Полезные статьи</h1>
      <p style={{ color: "var(--muted)" }}>
        Советы по выбору материалов и ремонту (раздел блога по ТЗ).
      </p>
      {isLoading && <p>Загрузка…</p>}
      {isError && <div className="alert">Не удалось загрузить статьи</div>}
      <ul style={{ paddingLeft: "1.2rem" }}>
        {data?.items.map((p) => (<li key={p.id} style={{ marginBottom: "0.75rem" }}>
            <Link to={`/blog/${p.slug}`}>
              <strong>{p.title}</strong>
            </Link>
            <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
              {new Date(p.publishedAt).toLocaleDateString("ru-RU")} ·{" "}
              {p.excerpt.slice(0, 120)}
              {p.excerpt.length > 120 ? "…" : ""}
            </div>
          </li>))}
      </ul>
    </div>);
}
