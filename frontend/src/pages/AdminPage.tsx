import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useGetAdminStatsQuery, useGetAdminOrdersQuery, usePatchAdminOrderStatusMutation, useGetAdminProductsQuery, useDeleteAdminProductMutation, usePatchAdminProductMutation, useUploadAdminProductImageMutation, useGetAdminQuestionsQuery, usePatchAdminQuestionMutation, } from "../store/api";
import { useAppSelector } from "../hooks";
import { useToast } from "../components/Toast";
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
    const [patchProduct] = usePatchAdminProductMutation();
    const [uploadProductImage] = useUploadAdminProductImageMutation();
    const [patchQuestion] = usePatchAdminQuestionMutation();
    const toast = useToast();
    const [exporting, setExporting] = useState(false);
    const [qaDraft, setQaDraft] = useState<Record<string, string>>({});
    const [uploadingById, setUploadingById] = useState<Record<string, boolean>>({});
    const [patchingOrderId, setPatchingOrderId] = useState<string | null>(null);
    const [answeringById, setAnsweringById] = useState<Record<string, boolean>>({});
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [editProductDraft, setEditProductDraft] = useState<{ stock: string; price: string; imageUrl: string }>({ stock: "", price: "", imageUrl: "" });
    const [savingProductId, setSavingProductId] = useState<string | null>(null);
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
        if (!token) return;
        setExporting(true);
        try {
            const r = await fetch("/api/admin/stats/export.csv", {
                headers: { authorization: `Bearer ${token}` },
            });
            if (!r.ok) throw new Error();
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "orders-export.csv";
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast("Файл скачан");
        } catch {
            toast("Не удалось экспортировать", false);
        } finally {
            setExporting(false);
        }
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

      <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Заказы</h2>
        {user?.role === "ADMIN" && (
          <button type="button" className="btn btn--ghost" disabled={exporting} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.88rem" }} onClick={downloadExport}>
            {exporting && <span className="spinner" />}
            {exporting ? "Экспорт…" : "Скачать CSV"}
          </button>
        )}
      </div>
      <div style={{ overflowX: "auto", marginTop: "0.75rem" }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <select className="input" disabled={patchingOrderId === o.id} value={o.status} onChange={async (e) => {
                        setPatchingOrderId(o.id);
                        try {
                            await patchStatus({ id: o.id, status: e.target.value }).unwrap();
                            toast("Статус обновлён");
                        }
                        catch {
                            toast("Не удалось обновить", false);
                        }
                        finally {
                            setPatchingOrderId(null);
                        }
                    }}>
                      {statuses.map((s) => (<option key={s} value={s}>{statusRu[s]}</option>))}
                    </select>
                    {patchingOrderId === o.id && <span className="spinner" />}
                  </div>
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
                <th>Цена</th>
                <th>Изображение</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {adminProducts?.items.map((p) => (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>
                    <Link to={`/product/${p.slug}`}>{p.name}</Link>
                  </td>
                  <td>
                    {editingProductId === p.id ? (
                      <input
                        type="number"
                        min={0}
                        className="input"
                        style={{ width: "80px", padding: "0.25rem 0.4rem", fontSize: "0.88rem" }}
                        value={editProductDraft.stock}
                        onChange={(e) => setEditProductDraft((d) => ({ ...d, stock: e.target.value }))}
                      />
                    ) : (
                      <span style={{ fontWeight: p.stock === 0 ? 600 : undefined, color: p.stock === 0 ? "var(--danger)" : undefined }}>
                        {p.stock}
                      </span>
                    )}
                  </td>
                  <td>
                    {editingProductId === p.id ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input"
                        style={{ width: "100px", padding: "0.25rem 0.4rem", fontSize: "0.88rem" }}
                        value={editProductDraft.price}
                        onChange={(e) => setEditProductDraft((d) => ({ ...d, price: e.target.value }))}
                      />
                    ) : (
                      <span>{Number(p.price).toLocaleString("ru-RU")} ₽</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      {editingProductId === p.id && (
                        <input
                          type="url"
                          className="input"
                          placeholder="https://… или /uploads/…"
                          value={editProductDraft.imageUrl}
                          onChange={(e) => setEditProductDraft((d) => ({ ...d, imageUrl: e.target.value }))}
                          style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", width: "200px" }}
                        />
                      )}
                      <label className="btn btn--ghost" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", cursor: uploadingById[p.id] ? "not-allowed" : "pointer", opacity: uploadingById[p.id] ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-start" }}>
                        {uploadingById[p.id] && <span className="spinner" />}
                        {uploadingById[p.id] ? "Загрузка…" : "Загрузить файл"}
                        <input type="file" accept="image/*" style={{ display: "none" }} disabled={Boolean(uploadingById[p.id])} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (!file)
                        return;
                    setUploadingById((s) => ({ ...s, [p.id]: true }));
                    try {
                        const form = new FormData();
                        form.append("image", file);
                        const uploaded = await uploadProductImage(form).unwrap();
                        await patchProduct({ id: p.id, imageUrl: uploaded.imageUrl }).unwrap();
                        if (editingProductId === p.id) {
                            setEditProductDraft((d) => ({ ...d, imageUrl: uploaded.imageUrl }));
                        }
                        toast("Изображение загружено и сохранено");
                    }
                    catch {
                        toast("Не удалось загрузить файл", false);
                    }
                    finally {
                        setUploadingById((s) => ({ ...s, [p.id]: false }));
                    }
                }}/>
                      </label>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                      {editingProductId === p.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--primary"
                            disabled={savingProductId === p.id}
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                            onClick={async () => {
                              setSavingProductId(p.id);
                              try {
                                await patchProduct({
                                  id: p.id,
                                  stock: Number(editProductDraft.stock),
                                  price: Number(editProductDraft.price),
                                  imageUrl: editProductDraft.imageUrl.trim() || undefined,
                                }).unwrap();
                                toast("Сохранено");
                                setEditingProductId(null);
                              } catch {
                                toast("Не удалось сохранить", false);
                              } finally {
                                setSavingProductId(null);
                              }
                            }}
                          >
                            {savingProductId === p.id && <span className="spinner spinner--light" />}
                            {savingProductId === p.id ? "Сохр…" : "Сохранить"}
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                            onClick={() => setEditingProductId(null)}
                          >
                            Отмена
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                            onClick={() => {
                              setEditingProductId(p.id);
                              setEditProductDraft({ stock: String(p.stock), price: String(p.price), imageUrl: p.imageUrl ?? "" });
                            }}
                          >
                            Ред.
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderColor: "var(--danger)", color: "var(--danger)" }}
                            onClick={async () => {
                              if (!window.confirm(`Удалить «${p.name}»?`)) return;
                              try {
                                await deleteProduct(p.id).unwrap();
                                toast("Товар удалён");
                              } catch {
                                toast("Не удалось удалить", false);
                              }
                            }}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/*<p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>*/}
          {/*  Можно загрузить файл изображения или обновить `imageUrl` вручную прямо здесь. Полное создание/правка — через API{" "}*/}
          {/*  <code>POST/PATCH /api/admin/products</code>. Массовая загрузка:{" "}*/}
          {/*  <code>POST /api/admin/products/import-csv</code>.*/}
          {/*</p>*/}
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
                  <button type="button" className="btn btn--primary" disabled={answeringById[q.id]} style={{ marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }} onClick={async () => {
                        const a = qaDraft[q.id]?.trim();
                        if (!a) return;
                        setAnsweringById((s) => ({ ...s, [q.id]: true }));
                        try {
                            await patchQuestion({ id: q.id, answer: a }).unwrap();
                            setQaDraft((d) => ({ ...d, [q.id]: "" }));
                            void refetchQa();
                            toast("Ответ сохранён");
                        }
                        catch {
                            toast("Ошибка при отправке", false);
                        }
                        finally {
                            setAnsweringById((s) => ({ ...s, [q.id]: false }));
                        }
                    }}>
                    {answeringById[q.id] && <span className="spinner spinner--light" />}
                    {answeringById[q.id] ? "Отправка…" : "Отправить ответ"}
                  </button>
                </div>)}
            </div>))}
        </div>)}
    </div>);
}
