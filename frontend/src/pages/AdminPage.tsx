import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useGetAdminStatsQuery, useGetAdminOrdersQuery, usePatchAdminOrderStatusMutation, useGetAdminProductsQuery, useDeleteAdminProductMutation, useGetAdminQuestionsQuery, usePatchAdminQuestionMutation, } from "../store/api";
import { useAppSelector } from "../hooks";
const statuses = [
    "NEW",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
] as const;
const statusRu: Record<string, string> = {
    NEW: "Новый",
    PAID: "Оплачен",
    PROCESSING: "Собирается",
    SHIPPED: "В доставке",
    DELIVERED: "Доставлен",
    CANCELLED: "Отменён",
};
export function AdminPage() {
    const user = useAppSelector((s) => s.auth.user);
    const token = useAppSelector((s) => s.auth.token);
    const [tab, setTab] = useState<"orders" | "stock" | "qa">("orders");
    const { data: stats, isLoading: s1 } = useGetAdminStatsQuery(undefined, {
        skip: !token ||
            (user?.role !== "ADMIN" && user?.role !== "MANAGER"),
    });
    const { data: orders, isLoading: s2 } = useGetAdminOrdersQuery(undefined, {
        skip: !token ||
            (user?.role !== "ADMIN" && user?.role !== "MANAGER"),
    });
    const { data: adminProducts } = useGetAdminProductsQuery(undefined, {
        skip: !token ||
            user?.role !== "ADMIN" ||
            tab !== "stock",
    });
    const { data: qaData, refetch: refetchQa } = useGetAdminQuestionsQuery(undefined, {
        skip: !token ||
            (user?.role !== "ADMIN" && user?.role !== "MANAGER") ||
            tab !== "qa",
    });
    const [patchStatus] = usePatchAdminOrderStatusMutation();
    const [deleteProduct] = useDeleteAdminProductMutation();
    const [patchQuestion] = usePatchAdminQuestionMutation();
    const [msg, setMsg] = useState<string | null>(null);
    const [qaDraft, setQaDraft] = useState<Record<string, string>>({});
    if (!token)
        return <Navigate to="/login" replace/>;
    if (user?.role !== "ADMIN" && user?.role !== "MANAGER") {
        return <div className="alert">Доступ только для администратора или менеджера</div>;
    }
    if (s1 || s2)
        return <p>Загрузка…</p>;
    if (!stats)
        return <div className="alert">Не удалось загрузить данные</div>;
    async function downloadExport() {
        if (!token)
            return;
        const r = await fetch("/api/admin/stats/export.csv", {
            headers: { authorization: `Bearer ${token}` },
        });
        if (!r.ok)
            return;
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "orders-export.csv";
        a.click();
        URL.revokeObjectURL(url);
    }
    return (<div>
      <h1>Админ-панель</h1>
      <p style={{ color: "var(--muted)" }}>
        Заказы, каталог (только администратор), вопросы покупателей, экспорт
        отчёта.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "1rem" }}>
        <button type="button" className={tab === "orders" ? "btn btn--primary" : "btn btn--ghost"} onClick={() => setTab("orders")}>
          Заказы
        </button>
        {user?.role === "ADMIN" && (<button type="button" className={tab === "stock" ? "btn btn--primary" : "btn btn--ghost"} onClick={() => setTab("stock")}>
            Товары
          </button>)}
        <button type="button" className={tab === "qa" ? "btn btn--primary" : "btn btn--ghost"} onClick={() => setTab("qa")}>
          Вопросы
        </button>
        {user?.role === "ADMIN" && (<button type="button" className="btn btn--ghost" onClick={downloadExport}>
            Экспорт CSV заказов
          </button>)}
      </div>

      {tab === "orders" && (<>
      <div className="card-grid" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <span className="pill">Пользователи</span>
          <p className="card__price">{stats.users}</p>
        </div>
        <div className="card">
          <span className="pill">Товары</span>
          <p className="card__price">{stats.products}</p>
        </div>
        <div className="card">
          <span className="pill">Заказы</span>
          <p className="card__price">{stats.orders}</p>
        </div>
        <div className="card">
          <span className="pill">Выручка (оплач.)</span>
          <p className="card__price">
            {Number(stats.revenue).toLocaleString("ru-RU")} ₽
          </p>
        </div>
      </div>

      <h2 style={{ marginTop: "2rem", fontSize: "1.2rem" }}>Заказы</h2>
      {msg && <p style={{ color: "var(--accent)" }}>{msg}</p>}
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Клиент</th>
              <th>Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (<tr key={o.id}>
                <td>{new Date(o.createdAt).toLocaleString("ru-RU")}</td>
                <td>
                  {o.user?.email ?? o.guestEmail ?? "—"}
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    {o.guestPhone}
                  </div>
                </td>
                <td>{Number(o.total).toLocaleString("ru-RU")} ₽</td>
                <td>
                  <select value={o.status} onChange={async (e) => {
                    setMsg(null);
                    try {
                        await patchStatus({
                            id: o.id,
                            status: e.target.value,
                        }).unwrap();
                        setMsg("Статус обновлён");
                    }
                    catch {
                        setMsg("Не удалось обновить");
                    }
                }}>
                    {statuses.map((s) => (<option key={s} value={s}>
                        {statusRu[s]}
                      </option>))}
                  </select>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
      </>)}

      {tab === "stock" && user?.role === "ADMIN" && (<div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Товары в базе</h2>
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Название</th>
                <th>Остаток</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {adminProducts?.items.map((p) => (<tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>
                    <Link to={`/product/${p.slug}`}>{p.name}</Link>
                  </td>
                  <td>{p.stock}</td>
                  <td>
                    <button type="button" className="btn btn--ghost" style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem" }} onClick={async () => {
                    if (!window.confirm(`Удалить «${p.name}»?`))
                        return;
                    try {
                        await deleteProduct(p.id).unwrap();
                        setMsg("Товар удалён");
                    }
                    catch {
                        setMsg("Не удалось удалить");
                    }
                }}>
                      Удалить
                    </button>
                  </td>
                </tr>))}
            </tbody>
          </table>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
            Создание и правка — через API{" "}
            <code>POST/PATCH /api/admin/products</code>. Массовая загрузка:{" "}
            <code>POST /api/admin/products/import-csv</code>.
          </p>
        </div>)}

      {tab === "qa" && (<div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Вопросы по товарам</h2>
          {qaData?.items.map((q) => (<div key={q.id} className="card card--flat" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                <Link to={`/product/${q.product.slug}`}>{q.product.name}</Link> ·{" "}
                {q.user.email}
              </p>
              <p>{q.text}</p>
              {q.answer ? (<p style={{ background: "rgba(46,125,50,0.08)", padding: "0.5rem" }}>
                  <strong>Ответ:</strong> {q.answer}
                </p>) : (<div className="field" style={{ marginBottom: 0 }}>
                  <textarea rows={2} placeholder="Ответ покупателю" value={qaDraft[q.id] ?? ""} onChange={(e) => setQaDraft((d) => ({ ...d, [q.id]: e.target.value }))}/>
                  <button type="button" className="btn btn--primary" style={{ marginTop: "0.5rem" }} onClick={async () => {
                        const a = qaDraft[q.id]?.trim();
                        if (!a)
                            return;
                        try {
                            await patchQuestion({ id: q.id, answer: a }).unwrap();
                            setQaDraft((d) => ({ ...d, [q.id]: "" }));
                            void refetchQa();
                            setMsg("Ответ сохранён");
                        }
                        catch {
                            setMsg("Ошибка ответа");
                        }
                    }}>
                    Отправить ответ
                  </button>
                </div>)}
            </div>))}
        </div>)}
    </div>);
}
