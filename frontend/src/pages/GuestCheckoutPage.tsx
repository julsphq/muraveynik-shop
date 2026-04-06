import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useCreateGuestOrderMutation, useDemoPayMutation, getErrorMessage, type Order, } from "../store/api";
import { loadGuestCart, clearGuestCart } from "../guestCart";
export function GuestCheckoutPage() {
    const lines = loadGuestCart();
    const [createOrder, { isLoading }] = useCreateGuestOrderMutation();
    const [pay, { isLoading: paying }] = useDemoPayMutation();
    const [done, setDone] = useState<Order | null>(null);
    const [guestEmail, setGuestEmail] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestName, setGuestName] = useState("");
    const [address, setAddress] = useState("");
    const [comment, setComment] = useState("");
    const [deliveryType, setDeliveryType] = useState<"COURIER" | "PICKUP">("COURIER");
    const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH_ON_DELIVERY">("ONLINE");
    const [deliveryZone, setDeliveryZone] = useState<"DEFAULT" | "CENTER" | "OUTSKIRTS">("DEFAULT");
    const [isReservation, setIsReservation] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [payMsg, setPayMsg] = useState<string | null>(null);
    if (lines.length === 0 && !done) {
        return <Navigate to="/cart" replace/>;
    }
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        try {
            const order = await createOrder({
                items: lines.map((l) => ({
                    productId: l.productId,
                    quantity: l.quantity,
                })),
                guestEmail,
                guestPhone,
                guestName,
                address,
                comment: comment || undefined,
                deliveryType,
                paymentMethod: isReservation ? "CASH_ON_DELIVERY" : paymentMethod,
                deliveryZone,
                isReservation: isReservation || undefined,
            }).unwrap();
            clearGuestCart();
            setDone(order);
        }
        catch (e) {
            setErr(getErrorMessage(e as never));
        }
    }
    async function onPay() {
        if (!done)
            return;
        setPayMsg(null);
        try {
            const r = await pay({
                orderId: done.id,
                guestEmail: done.guestEmail ?? guestEmail,
            }).unwrap();
            setPayMsg(r.message);
        }
        catch (e) {
            setPayMsg(getErrorMessage(e as never));
        }
    }
    if (done) {
        return (<div style={{ maxWidth: "560px" }}>
        <h1>Заказ оформлен</h1>
        <p>
          Номер заказа: <strong>{done.id}</strong>
        </p>
        <p>
          Сумма:{" "}
          <strong>
            {Number(done.total).toLocaleString("ru-RU")} ₽
          </strong>{" "}
          (включая доставку {Number(done.deliveryCost).toLocaleString("ru-RU")}{" "}
          ₽)
        </p>
        <p style={{ color: "var(--muted)" }}>
          Сохраните номер заказа и e-mail для отслеживания статуса.
        </p>
        {done.paymentMethod === "ONLINE" && (<div style={{ marginTop: "1.5rem" }}>
            <button type="button" className="btn btn--primary" disabled={paying} onClick={onPay}>
              {paying ? "Оплата…" : "Демо-оплата ЮKassa"}
            </button>
            {payMsg && (<p style={{ marginTop: "0.75rem", color: "var(--accent)" }}>
                {payMsg}
              </p>)}
          </div>)}
        <p style={{ marginTop: "1.5rem" }}>
          <Link to="/catalog">В каталог</Link>
        </p>
      </div>);
    }
    return (<div style={{ maxWidth: "520px" }}>
      <h1>Оформление без регистрации</h1>
      <p style={{ color: "var(--muted)" }}>
        ИП «Муравейник» — доставка по городу, оплата онлайн или при получении (
        ТЗ).
      </p>
      {err && <div className="alert">{err}</div>}
      <form onSubmit={onSubmit} className="stack">
        <div className="field">
          <label htmlFor="gname">ФИО</label>
          <input id="gname" required value={guestName} onChange={(e) => setGuestName(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="gemail">E-mail</label>
          <input id="gemail" type="email" required value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="gphone">Телефон</label>
          <input id="gphone" required minLength={10} value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}/>
        </div>
        <div className="field">
          <label>Способ получения</label>
          <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as "COURIER" | "PICKUP")}>
            <option value="COURIER">Доставка курьером по городу</option>
            <option value="PICKUP">Самовывоз</option>
          </select>
        </div>
        <div className="field">
          <label>Зона доставки</label>
          <select value={deliveryZone} onChange={(e) => setDeliveryZone(e.target.value as "DEFAULT" | "CENTER" | "OUTSKIRTS")}>
            <option value="DEFAULT">Обычная</option>
            <option value="CENTER">Центр</option>
            <option value="OUTSKIRTS">Окраина</option>
          </select>
        </div>
        <div className="field">
          <label>Оплата</label>
          <select value={isReservation ? "CASH_ON_DELIVERY" : paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "ONLINE" | "CASH_ON_DELIVERY")} disabled={isReservation}>
            <option value="ONLINE">Банковская карта / СБП (демо ЮKassa)</option>
            <option value="CASH_ON_DELIVERY">Наличные при получении</option>
          </select>
        </div>
        <label style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: "0.9rem",
        }}>
          <input type="checkbox" checked={isReservation} onChange={(e) => {
            setIsReservation(e.target.checked);
            if (e.target.checked)
                setPaymentMethod("CASH_ON_DELIVERY");
        }}/>
          Бронь без предоплаты
        </label>
        <div className="field">
          <label htmlFor="addr">Адрес</label>
          <textarea id="addr" required minLength={5} rows={3} value={address} onChange={(e) => setAddress(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="com">Комментарий</label>
          <input id="com" value={comment} onChange={(e) => setComment(e.target.value)}/>
        </div>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>
          {isLoading ? "Отправка…" : "Подтвердить заказ"}
        </button>
      </form>
      <p style={{ marginTop: "1rem" }}>
        <Link to="/cart">← Назад в корзину</Link>
      </p>
    </div>);
}
