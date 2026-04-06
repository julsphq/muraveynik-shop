import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useGetProductQuery, useGetRelatedProductsQuery, useGetQuestionsForProductQuery, usePostProductQuestionMutation, useAddToCartMutation, useAddFavoriteMutation, useRemoveFavoriteMutation, useGetFavoritesQuery, useGetReviewsForProductQuery, useCreateReviewMutation, useDeleteReviewMutation, getErrorMessage, } from "../store/api";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { useAppSelector } from "../hooks";
import { addGuestLine } from "../guestCart";
import { MaterialCalculator } from "../components/MaterialCalculator";
function formatAuthor(name: string | null, email: string) {
    if (name?.trim())
        return name.trim();
    const at = email.indexOf("@");
    return at > 0 ? email.slice(0, at) : email;
}
function Stars({ value }: {
    value: number;
}) {
    const full = "★".repeat(Math.round(value));
    const empty = "☆".repeat(5 - Math.round(value));
    return (<span className="stars" aria-label={`Оценка ${value} из 5`}>
      {full}
      {empty}
    </span>);
}
export function ProductPage() {
    const { slug } = useParams<{
        slug: string;
    }>();
    const token = useAppSelector((s) => s.auth.token);
    const currentUser = useAppSelector((s) => s.auth.user);
    const { data, isLoading, error } = useGetProductQuery(slug!, {
        skip: !slug,
    });
    const { data: favorites } = useGetFavoritesQuery(undefined, {
        skip: !token,
    });
    const { data: reviewsData, isLoading: revLoading, isError: revError, isFetching: revFetching, error: reviewsQueryError, refetch: refetchReviews, } = useGetReviewsForProductQuery(data?.id ?? "", {
        skip: !data,
    });
    const reviewsOffline = revError &&
        reviewsQueryError &&
        typeof reviewsQueryError === "object" &&
        "status" in reviewsQueryError &&
        (reviewsQueryError as FetchBaseQueryError).status === "FETCH_ERROR";
    const [addToCart, { isLoading: adding }] = useAddToCartMutation();
    const [addFavorite] = useAddFavoriteMutation();
    const [removeFavorite] = useRemoveFavoriteMutation();
    const [createReview, { isLoading: creatingRev }] = useCreateReviewMutation();
    const [deleteReview] = useDeleteReviewMutation();
    const [qty, setQty] = useState(1);
    const [msg, setMsg] = useState<string | null>(null);
    const [revRating, setRevRating] = useState(5);
    const [revText, setRevText] = useState("");
    const [revMsg, setRevMsg] = useState<string | null>(null);
    const { data: relatedData } = useGetRelatedProductsQuery(slug!, {
        skip: !slug || !data,
    });
    const { data: qData, refetch: refetchQuestions } = useGetQuestionsForProductQuery(data?.id ?? "", { skip: !data });
    const [postQuestion, { isLoading: qSending }] = usePostProductQuestionMutation();
    const [qText, setQText] = useState("");
    const [qMsg, setQMsg] = useState<string | null>(null);
    useEffect(() => {
        if (!data?.name)
            return;
        const prev = document.title;
        document.title = `${data.name} — Муравейник`;
        return () => {
            document.title = prev;
        };
    }, [data?.name]);
    if (!slug)
        return <Navigate to="/catalog" replace/>;
    const isFav = token && data && favorites?.some((p) => p.id === data.id);
    const myReview = reviewsData?.items.find((r) => r.userId === currentUser?.id);
    async function handleAdd() {
        if (!data)
            return;
        setMsg(null);
        if (token) {
            try {
                await addToCart({ productId: data.id, quantity: qty }).unwrap();
                setMsg("Добавлено в корзину");
            }
            catch (e) {
                setMsg(getErrorMessage(e as never));
            }
        }
        else {
            addGuestLine(data.id, qty);
            setMsg("Добавлено в корзину (гость). Оформите заказ в корзине.");
        }
    }
    async function toggleFavorite() {
        if (!data || !token)
            return;
        try {
            if (isFav)
                await removeFavorite(data.id).unwrap();
            else
                await addFavorite(data.id).unwrap();
        }
        catch {
        }
    }
    async function submitQuestion(e: React.FormEvent) {
        e.preventDefault();
        if (!data || !token)
            return;
        setQMsg(null);
        try {
            await postQuestion({
                productId: data.id,
                text: qText.trim(),
            }).unwrap();
            setQText("");
            setQMsg("Вопрос отправлен продавцу.");
            void refetchQuestions();
        }
        catch (err) {
            setQMsg(getErrorMessage(err as never));
        }
    }
    async function submitReview(e: React.FormEvent) {
        e.preventDefault();
        if (!data || !token)
            return;
        setRevMsg(null);
        try {
            await createReview({
                productId: data.id,
                rating: revRating,
                text: revText.trim() || undefined,
            }).unwrap();
            setRevText("");
            setRevRating(5);
            setRevMsg("Спасибо, отзыв опубликован.");
            void refetchReviews();
        }
        catch (e) {
            setRevMsg(getErrorMessage(e as never));
        }
    }
    if (isLoading)
        return <p>Загрузка…</p>;
    if (error || !data)
        return <div className="alert">Товар не найден</div>;
    return (<div style={{ maxWidth: "640px" }}>
      <p className="card__meta">
        <Link to="/catalog">← Каталог</Link> · {data.category?.name}
      </p>
      <h1 style={{ marginTop: "0.5rem" }}>{data.name}</h1>
      <p className="pill" style={{ marginBottom: "1rem" }}>
        Артикул {data.sku}
        {data.isNew && (<span style={{ marginLeft: "0.5rem" }}>· новинка</span>)}
      </p>
      <p style={{ color: "var(--muted)" }}>{data.description}</p>
      <ul style={{ color: "var(--muted)", paddingLeft: "1.2rem" }}>
        {data.brand && (<li>
            <strong>Производитель:</strong> {data.brand}
          </li>)}
        {data.material && (<li>
            <strong>Материал:</strong> {data.material}
          </li>)}
        {data.sizeLabel && (<li>
            <strong>Размер / фасовка:</strong> {data.sizeLabel}
          </li>)}
        {data.weightKg && (<li>
            <strong>Вес (для расчёта доставки):</strong>{" "}
            {Number(data.weightKg)} кг
          </li>)}
        {data.countryOrigin && (<li>
            <strong>Страна:</strong> {data.countryOrigin}
          </li>)}
        {data.applicationGuide && (<li>
            <strong>Инструкция по применению:</strong> {data.applicationGuide}
          </li>)}
      </ul>
      {data.imageUrl && (<p>
          <a href={data.imageUrl} target="_blank" rel="noreferrer" className="btn btn--ghost" style={{ display: "inline-block" }}>
            Открыть фото (полный размер)
          </a>
        </p>)}
      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent)" }}>
        {Number(data.price).toLocaleString("ru-RU")} ₽
      </p>
      <p style={{ color: "var(--muted)" }}>
        Остаток на складе: {data.stock} шт. (актуально при оформлении заказа)
      </p>

      <div style={{
            marginTop: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
        }}>
        <label className="field" style={{ margin: 0, width: "100px" }}>
          <span>Кол-во</span>
          <input type="number" min={1} max={data.stock} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(data.stock, Number(e.target.value))))}/>
        </label>
        <button type="button" className="btn btn--primary" disabled={adding || data.stock < 1} onClick={handleAdd}>
          В корзину
        </button>
        {token && (<button type="button" className="btn btn--ghost" onClick={toggleFavorite}>
            {isFav ? "Убрать из избранного" : "В избранное"}
          </button>)}
      </div>
      {!token && (<p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "var(--muted)" }}>
          Заказ без регистрации доступен: товары сохраняются в корзине на этом
          устройстве.
        </p>)}
      {msg && (<p style={{
                marginTop: "1rem",
                color: msg.startsWith("Добав") ? "var(--accent)" : "var(--danger)",
            }}>
          {msg}
        </p>)}

      <MaterialCalculator categorySlug={data.category?.slug} productName={data.name}/>

      {relatedData && relatedData.items.length > 0 && (<section style={{ marginTop: "2rem" }} aria-labelledby="related-heading">
          <h2 id="related-heading" style={{ fontSize: "1.15rem" }}>
            С этим часто покупают
          </h2>
          <ul style={{ paddingLeft: "1.2rem", color: "var(--muted)" }}>
            {relatedData.items.map((p) => (<li key={p.id}>
                <Link to={`/product/${p.slug}`}>{p.name}</Link> —{" "}
                {Number(p.price).toLocaleString("ru-RU")} ₽
              </li>))}
          </ul>
        </section>)}

      <section style={{ marginTop: "2rem" }} aria-labelledby="qa-heading">
        <h2 id="qa-heading" style={{ fontSize: "1.15rem" }}>
          Вопросы продавцу
        </h2>
        {token ? (<form className="stack" onSubmit={submitQuestion} style={{ maxWidth: "100%" }}>
            <div className="field">
              <label htmlFor="product-question-text">Ваш вопрос</label>
              <textarea id="product-question-text" rows={3} minLength={3} required value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Например: совместима ли с грунтовкой X?"/>
            </div>
            <button type="submit" className="btn btn--primary" disabled={qSending}>
              {qSending ? "Отправка…" : "Отправить вопрос"}
            </button>
            {qMsg && (<p style={{ color: "var(--accent)", margin: 0 }}>{qMsg}</p>)}
          </form>) : (<p style={{ color: "var(--muted)" }}>
            <Link to="/login">Войдите</Link>, чтобы задать вопрос по товару.
          </p>)}
        {qData?.items.map((q) => (<article key={q.id} style={{
                marginTop: "1rem",
                padding: "0.75rem 0",
                borderTop: "1px solid rgba(0,0,0,0.08)",
            }}>
            <p style={{ margin: "0 0 0.35rem" }}>
              <strong>{formatAuthor(q.user.name, q.user.email)}</strong> ·{" "}
              {new Date(q.createdAt).toLocaleString("ru-RU")}
            </p>
            <p style={{ margin: 0 }}>{q.text}</p>
            {q.answer ? (<p style={{
                    margin: "0.5rem 0 0",
                    padding: "0.5rem 0.75rem",
                    background: "rgba(46, 125, 50, 0.08)",
                    borderRadius: 6,
                }}>
                <strong>Ответ магазина:</strong> {q.answer}
              </p>) : (<p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
                Ожидает ответа менеджера.
              </p>)}
          </article>))}
      </section>

      <section className="product-reviews" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">Отзывы покупателей</h2>

        {(revLoading || revFetching) && !reviewsData && !revError && (<p>Загрузка отзывов…</p>)}

        {revError && (<div className="alert" style={{ marginBottom: "1rem" }}>
            {reviewsOffline ? (<>
                <strong>Сервер API не отвечает.</strong> Откройте отдельный
                терминал и запустите backend:
                <pre style={{
                    margin: "0.75rem 0",
                    padding: "0.5rem",
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    overflow: "auto",
                }}>
                  cd muraveynik-diploma\backend{"\n"}
                  npm run dev
                </pre>
                Должна появиться строка{" "}
                <code style={{ color: "inherit" }}>API: http://localhost:4000</code>
                . Убедитесь, что Docker с PostgreSQL запущен (
                <code style={{ color: "inherit" }}>docker compose up -d</code> в
                папке <code style={{ color: "inherit" }}>muraveynik-diploma</code>
                ).
              </>) : (<>
                <strong>Не удалось загрузить отзывы.</strong> Чаще всего в базе
                ещё нет таблицы отзывов. Остановите backend (Ctrl+C), затем в
                папке <code style={{ color: "inherit" }}>backend</code>:
                <pre style={{
                    margin: "0.75rem 0",
                    padding: "0.5rem",
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: 6,
                    fontSize: "0.85rem",
                    overflow: "auto",
                }}>
                  npx prisma db push{"\n"}
                  npx prisma generate{"\n"}
                  npm run dev
                </pre>
                Если после <code style={{ color: "inherit" }}>db push</code>{" "}
                была ошибка доступа к файлам — закройте все окна с{" "}
                <code style={{ color: "inherit" }}>npm run dev</code> и повторите{" "}
                <code style={{ color: "inherit" }}>npx prisma generate</code>.
              </>)}
            <div style={{ marginTop: "0.75rem" }}>
              <button type="button" className="btn btn--ghost" onClick={() => void refetchReviews()}>
                Повторить загрузку
              </button>
            </div>
          </div>)}

        {reviewsData && (<p className="reviews-summary">
            {reviewsData.count === 0 ? ("Пока нет отзывов — станьте первым.") : (<>
                Средняя оценка:{" "}
                <strong>{reviewsData.averageRating ?? "—"}</strong> из 5 ·{" "}
                {reviewsData.count}{" "}
                {reviewsData.count === 1 ? "отзыв" : "отзывов"}
              </>)}
          </p>)}

        {token && !myReview && (<form className="review-form" onSubmit={submitReview}>
            <p style={{ margin: "0 0 0.75rem", fontWeight: 600 }}>
              Оставить отзыв
            </p>
            <div className="field" style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="product-review-rating">Оценка</label>
              <select id="product-review-rating" value={revRating} onChange={(e) => setRevRating(Number(e.target.value))}>
                {[
                [5, "5 — отлично"],
                [4, "4 — хорошо"],
                [3, "3 — удовлетворительно"],
                [2, "2 — слабо"],
                [1, "1 — плохо"],
            ].map(([n, label]) => (<option key={n} value={n}>
                    {label}
                  </option>))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: "0.75rem" }}>
              <label htmlFor="product-review-text">Текст (необязательно)</label>
              <textarea id="product-review-text" rows={3} maxLength={2000} value={revText} onChange={(e) => setRevText(e.target.value)} placeholder="Качество, доставка, соответствие описанию…"/>
            </div>
            <button type="submit" className="btn btn--primary" disabled={creatingRev}>
              {creatingRev ? "Отправка…" : "Опубликовать отзыв"}
            </button>
            {revMsg && (<p style={{
                    marginTop: "0.75rem",
                    color: revMsg.startsWith("Спасибо")
                        ? "var(--accent-dim)"
                        : "var(--danger)",
                }}>
                {revMsg}
              </p>)}
          </form>)}

        {token && myReview && (<p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            Вы уже оставили отзыв на этот товар.
            <button type="button" className="btn btn--ghost" style={{ marginLeft: "0.75rem", padding: "0.25rem 0.5rem" }} onClick={async () => {
                if (!data || !window.confirm("Удалить ваш отзыв?"))
                    return;
                try {
                    await deleteReview({
                        id: myReview.id,
                        productId: data.id,
                    }).unwrap();
                    void refetchReviews();
                }
                catch {
                }
            }}>
              Удалить мой отзыв
            </button>
          </p>)}

        {!token && (<p style={{ color: "var(--muted)", marginBottom: "1rem" }}>
            <Link to="/login">Войдите</Link>, чтобы оставить отзыв с оценкой.
          </p>)}

        {reviewsData?.items.map((r) => (<article key={r.id} className="review-card">
            <div className="review-card__meta">
              <Stars value={r.rating}/>
              <span>{formatAuthor(r.user.name, r.user.email)}</span>
              <span>{new Date(r.createdAt).toLocaleDateString("ru-RU")}</span>
            </div>
            {r.text ? (<p className="review-card__text">{r.text}</p>) : (<p className="review-card__text" style={{ color: "var(--muted)" }}>
                (без текста)
              </p>)}
          </article>))}
      </section>
    </div>);
}
