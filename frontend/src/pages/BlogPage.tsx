import {Link} from "react-router-dom";
import {useGetBlogPostsQuery} from "../store/api";

export function BlogPage() {
    const {data, isLoading, isError} = useGetBlogPostsQuery();
    return (<div className="blog-page">
        <section className="blog-hero">
            <p className="blog-hero__kicker">Блог Муравейник</p>
            <h1>Полезные статьи о строительстве и ремонте</h1>
            <p>
                Практичные советы по выбору материалов, инструментов и уходу за
                покрытиями. Коротко, понятно и по делу.
            </p>
        </section>
        {isLoading && <p>Загрузка…</p>}
        {isError && <div className="alert">Не удалось загрузить статьи</div>}
        <section className="blog-list" aria-label="Список статей">
            {data?.items.map((p) => (<article key={p.id} className="blog-card">
                <p className="blog-card__meta">
                    {new Date(p.publishedAt).toLocaleDateString("ru-RU")}
                </p>
                <h2 className="blog-card__title">
                    <Link to={`/blog/${p.slug}`}>{p.title}</Link>
                </h2>
                <p className="blog-card__excerpt">
                    {p.excerpt.slice(0, 180)}
                    {p.excerpt.length > 180 ? "…" : ""}
                </p>
                <Link className="btn btn--ghost" to={`/blog/${p.slug}`}>
                    Читать статью
                </Link>
            </article>))}
        </section>
    </div>);
}
