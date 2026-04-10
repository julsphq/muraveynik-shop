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
    return (<article className="blog-post">
      <p className="card__meta blog-post__back">
        <Link to="/blog">← Все статьи</Link>
      </p>
      <header className="blog-post__header">
        <h1>{data.title}</h1>
        <p className="blog-post__date">
        {new Date(data.publishedAt).toLocaleDateString("ru-RU")}
        </p>
      </header>
      <p className="blog-post__excerpt">{data.excerpt}</p>
      <div className="blog-post__body">{data.body}</div>
    </article>);
}
