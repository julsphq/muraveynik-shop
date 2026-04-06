import { Link, Navigate, useParams } from "react-router-dom";
import { useGetBlogPostQuery } from "../store/api";
import { useEffect } from "react";
export function BlogPostPage() {
    const { slug } = useParams<{
        slug: string;
    }>();
    const { data, isLoading, isError } = useGetBlogPostQuery(slug!, {
        skip: !slug,
    });
    useEffect(() => {
        if (!data?.title)
            return;
        const prev = document.title;
        document.title = `${data.title} — Блог Муравейник`;
        return () => {
            document.title = prev;
        };
    }, [data?.title]);
    if (!slug)
        return <Navigate to="/blog" replace/>;
    if (isLoading)
        return <p>Загрузка…</p>;
    if (isError || !data)
        return <div className="alert">Статья не найдена</div>;
    return (<article style={{ maxWidth: "640px" }}>
      <p className="card__meta">
        <Link to="/blog">← Все статьи</Link>
      </p>
      <h1>{data.title}</h1>
      <p style={{ color: "var(--muted)" }}>
        {new Date(data.publishedAt).toLocaleDateString("ru-RU")}
      </p>
      <p style={{ fontWeight: 500 }}>{data.excerpt}</p>
      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{data.body}</div>
    </article>);
}
