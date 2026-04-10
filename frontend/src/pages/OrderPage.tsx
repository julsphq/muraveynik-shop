import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetOrderQuery, useDemoPayMutation, useRepeatOrderToCartMutation, getErrorMessage, } from "../store/api";
import { useAppSelector } from "../hooks";
const statusRu: Record<string, string> = {
    NEW: "Новый",
    PAID: "Оплачен",
    PROCESSING: "Собирается",
    SHIPPED: "Передан в доставку",
    DELIVERED: "Доставлен",
    CANCELLED: "Отменён",
};
export function OrderPage() {
    const { id } = useParams<{
        id: string;
    }>();
    const navigate = useNavigate();
    const token = useAppSelector((s) => s.auth.token);
    const { data, isLoading, error } = useGetOrderQuery(id!, {
        skip: !token || !id,
    });
    const [pay, { isLoading: paying }] = useDemoPayMutation();
    const [repeatToCart, { isLoading: repeating }] = useRepeatOrderToCartMutation();
    const [msg, setMsg] = useState<string | null>(null);
    const [repeatMsg, setRepeatMsg] = useState<string | null>(null);
    if (!token)
        return <Navigate to="/login" replace/>;
    if (!id)
        return <Navigate to="/orders" replace/>;
    if (isLoading)
        return <p>Загрузка…</p>;
    if (error || !data)
        return <div className="alert">Заказ не найден</div>;
    async function handlePay() {
        if (!data)
            return;
        setMsg(null);
        try {
            const r = await pay({
                orderId: data.id,
                guestEmail: data.guestEmail ?? undefined,
            }).unwrap();
            setMsg(r.message);
        }
        catch (e) {
            setMsg(getErrorMessage(e as never));
        }
    }
    return (<div style={{ maxWidth: "640px" }}>
      <p className="card__meta">
        <Link to="/orders">← Все заказы</Link>
      </p>
      <h1>Заказ</h1>
      <p>
        <span className="pill">{statusRu[data.status] ?? data.status}</span> ·{" "}
        {new Date(data.createdAt).toLocaleString("ru-RU")}
      </p>
      <p>
        <strong>Товары:</strong>{" "}
        {Number(data.itemsSubtotal).toLocaleString("ru-RU")} ₽
      </p>
      <p>
        <strong>Доставка ({data.deliveryType === "COURIER" ? "курьер" : "самовывоз"}):</strong>{" "}
        {Number(data.deliveryCost).toLocaleString("ru-RU")} ₽
      </p>
      <p>
        <strong>Итого:</strong> {Number(data.total).toLocaleString("ru-RU")} ₽
      </p>
      <p>
        <strong>Оплата:</strong>{" "}
        {data.paymentMethod === "ONLINE"
            ? "онлайн (карта/СБП)"
            : "при получении"}
      </p>
      <p>
        <strong>Адрес:</strong> {data.address}
      </p>
      {data.isReservation && (<p className="pill" style={{ display: "inline-block" }}>
          Бронь без предоплаты
        </p>)}
      {data.deliveryZone && data.deliveryZone !== "DEFAULT" && (<p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Зона доставки:{" "}
          {data.deliveryZone === "CENTER"
                ? "центр"
                : data.deliveryZone === "OUTSKIRTS"
                    ? "окраина"
                    : data.deliveryZone}
        </p>)}
      {data.comment && (<p>
          <strong>Комментарий:</strong> {data.comment}
        </p>)}

      <h2 style={{ fontSize: "1.1rem", marginTop: "1.5rem" }}>Состав</h2>
      <ul style={{ paddingLeft: "1.25rem", color: "var(--muted)" }}>
        {data.items.map((i) => (<li key={i.id}>
            {i.product.name} × {i.quantity} —{" "}
            {(Number(i.price) * i.quantity).toLocaleString("ru-RU")} ₽
          </li>))}
      </ul>

      <div style={{ marginTop: "1.25rem" }}>
        <button type="button" className="btn btn--ghost" disabled={repeating} onClick={async () => {
            if (!data)
                return;
            setRepeatMsg(null);
            try {
                const r = await repeatToCart(data.id).unwrap();
                setRepeatMsg(r.message);
                navigate("/cart");
            }
            catch (e) {
                setRepeatMsg(getErrorMessage(e as never));
            }
        }}>
          {repeating ? "Добавление…" : "Повторить заказ (в корзину)"}
        </button>
        {repeatMsg && (<p style={{ marginTop: "0.5rem", color: "var(--muted)" }}>
            {repeatMsg}
          </p>)}
      </div>

      {data.status === "NEW" && data.paymentMethod === "ONLINE" && (<div style={{ marginTop: "1.5rem" }}>
          <button type="button" className="btn btn--primary" disabled={paying} onClick={handlePay}>
            {paying ? "Оплата…" : "Оплатить онлайн"}
          </button>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.5rem" }}>
            Имитация успешной оплаты (без реального списания).
          </p>
        </div>)}

      {msg && (<p style={{ marginTop: "1rem", color: "var(--accent)" }}>{msg}</p>)}
    </div>);
}
