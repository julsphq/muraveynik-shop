import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGetCartQuery, useUpdateCartItemMutation, useRemoveCartItemMutation, useCreateOrderMutation, useGetProfileQuery, useLazyGetProductsByIdsQuery, getErrorMessage, } from "../store/api";
import { useAppSelector } from "../hooks";
import { loadGuestCart, setGuestLineQty } from "../guestCart";
export function CartPage() {
    const token = useAppSelector((s) => s.auth.token);
    const { data, isLoading } = useGetCartQuery(undefined, { skip: !token });
    const { data: profile } = useGetProfileQuery(undefined, { skip: !token });
    const [updateItem] = useUpdateCartItemMutation();
    const [removeItem] = useRemoveCartItemMutation();
    const [createOrder, { isLoading: ordering }] = useCreateOrderMutation();
    const [fetchGuestProducts, { data: guestProductList }] = useLazyGetProductsByIdsQuery();
    const [address, setAddress] = useState("");
    const [comment, setComment] = useState("");
    const [deliveryType, setDeliveryType] = useState<"COURIER" | "PICKUP">("COURIER");
    const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "CASH_ON_DELIVERY">("ONLINE");
    const [deliveryZone, setDeliveryZone] = useState<"DEFAULT" | "CENTER" | "OUTSKIRTS">("DEFAULT");
    const [isReservation, setIsReservation] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [guestTick, setGuestTick] = useState(0);
    const guestLines = useMemo(() => loadGuestCart(), [guestTick]);
    const guestIdsKey = useMemo(() => guestLines
        .map((l) => `${l.productId}:${l.quantity}`)
        .sort()
        .join("|"), [guestLines]);
    useEffect(() => {
        if (!token && guestLines.length > 0) {
            void fetchGuestProducts(guestLines.map((l) => l.productId));
        }
    }, [token, guestIdsKey, fetchGuestProducts, guestLines]);
    const guestItems = useMemo(() => {
        if (!guestProductList || guestLines.length === 0)
            return [];
        const map = new Map(guestProductList.map((p) => [p.id, p]));
        return guestLines
            .map((l) => {
            const p = map.get(l.productId);
            if (!p)
                return null;
            return { product: p, quantity: l.quantity };
        })
            .filter(Boolean) as {
            product: (typeof guestProductList)[0];
            quantity: number;
        }[];
    }, [guestLines, guestProductList]);
    function bumpGuest() {
        setGuestTick((t) => t + 1);
    }
    if (!token) {
        const guestTotal = guestItems.reduce((s, row) => s + Number(row.product.price) * row.quantity, 0);
        return (<div>
        <h1>Корзина (гость)</h1>
        {guestItems.length === 0 ? (<p style={{ color: "var(--muted)" }}>
            Корзина пуста.{" "}
            <Link to="/catalog">Перейти в каталог</Link> или{" "}
            <Link to="/login">войдите</Link> для сохранения корзины в аккаунте.
          </p>) : (<>
            <table className="table">
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Цена</th>
                  <th>Кол-во</th>
                  <th>Сумма</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {guestItems.map((row) => {
                    const line = Number(row.product.price) * row.quantity;
                    return (<tr key={row.product.id}>
                      <td>
                        <Link to={`/product/${row.product.slug}`}>
                          {row.product.name}
                        </Link>
                      </td>
                      <td>
                        {Number(row.product.price).toLocaleString("ru-RU")} ₽
                      </td>
                      <td>
                        <input type="number" min={1} max={row.product.stock} value={row.quantity} style={{ width: "4rem" }} onChange={(e) => {
                            const q = Number(e.target.value);
                            if (q >= 1) {
                                setGuestLineQty(row.product.id, q);
                                bumpGuest();
                            }
                        }}/>
                      </td>
                      <td>{line.toLocaleString("ru-RU")} ₽</td>
                      <td>
                        <button type="button" className="btn btn--ghost" style={{
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.8rem",
                        }} onClick={() => {
                            setGuestLineQty(row.product.id, 0);
                            bumpGuest();
                        }}>
                          Удалить
                        </button>
                      </td>
                    </tr>);
                })}
              </tbody>
            </table>
            <p style={{ fontSize: "1.15rem", fontWeight: 600 }}>
              Итого: {guestTotal.toFixed(2)} ₽ (без доставки)
            </p>
            <p>
              <Link to="/guest-checkout" className="btn btn--primary">
                Оформить заказ
              </Link>
            </p>
          </>)}
      </div>);
    }
    async function submitOrder(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        try {
            await createOrder({
                address,
                comment: comment || undefined,
                deliveryType,
                paymentMethod: isReservation ? "CASH_ON_DELIVERY" : paymentMethod,
                deliveryZone,
                isReservation: isReservation || undefined,
            }).unwrap();
            setAddress("");
            setComment("");
            setMsg("Заказ создан. Оплатите его в разделе «Заказы» или при получении (если выбран наличный расчёт).");
        }
        catch (e) {
            setMsg(getErrorMessage(e as never));
        }
    }
    if (isLoading)
        return <p>Загрузка корзины…</p>;
    const items = data?.items ?? [];
    return (<div>
      <h1>Корзина</h1>
      {items.length === 0 ? (<p style={{ color: "var(--muted)" }}>
          Корзина пуста. <Link to="/catalog">В каталог</Link>
        </p>) : (<>
          <table className="table">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Цена</th>
                <th>Кол-во</th>
                <th>Сумма</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const line = Number(row.product.price) * row.quantity;
                return (<tr key={row.id}>
                    <td>
                      <Link to={`/product/${row.product.slug}`}>
                        {row.product.name}
                      </Link>
                    </td>
                    <td>
                      {Number(row.product.price).toLocaleString("ru-RU")} ₽
                    </td>
                    <td>
                      <input type="number" min={1} max={row.product.stock} value={row.quantity} style={{ width: "4rem" }} onChange={async (e) => {
                        const q = Number(e.target.value);
                        if (q >= 1) {
                            try {
                                await updateItem({
                                    id: row.id,
                                    quantity: q,
                                }).unwrap();
                            }
                            catch {
                            }
                        }
                    }}/>
                    </td>
                    <td>{line.toLocaleString("ru-RU")} ₽</td>
                    <td>
                      <button type="button" className="btn btn--ghost" style={{
                        padding: "0.25rem 0.5rem",
                        fontSize: "0.8rem",
                    }} onClick={() => removeItem(row.id)}>
                        Удалить
                      </button>
                    </td>
                  </tr>);
            })}
            </tbody>
          </table>
          <p style={{ fontSize: "1.05rem", color: "var(--muted)" }}>
            Товары: {data?.total} ₽ — доставка рассчитывается при оформлении
          </p>

          <h2 style={{ marginTop: "2rem", fontSize: "1.15rem" }}>
            Оформление заказа
          </h2>
          {msg && (<p style={{
                    color: msg.startsWith("Заказ") ? "var(--accent)" : "var(--danger)",
                }}>
              {msg}
            </p>)}
          <form onSubmit={submitOrder} style={{ maxWidth: "520px" }}>
            <div className="field">
              <label>Способ получения</label>
              <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as "COURIER" | "PICKUP")}>
                <option value="COURIER">Доставка по городу</option>
                <option value="PICKUP">Самовывоз со склада</option>
              </select>
            </div>
            <div className="field">
              <label>Зона доставки (ориентир по адресу)</label>
              <select value={deliveryZone} onChange={(e) => setDeliveryZone(e.target.value as "DEFAULT" | "CENTER" | "OUTSKIRTS")}>
                <option value="DEFAULT">Обычная</option>
                <option value="CENTER">Центр (дешевле)</option>
                <option value="OUTSKIRTS">Окраина / удалённый район</option>
              </select>
            </div>
            <div className="field">
              <label>Оплата</label>
              <select value={isReservation ? "CASH_ON_DELIVERY" : paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "ONLINE" | "CASH_ON_DELIVERY")} disabled={isReservation}>
                <option value="ONLINE">Онлайн (карта, СБП)</option>
                <option value="CASH_ON_DELIVERY">При получении (наличные)</option>
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
              Бронь без предоплаты (оплата при получении / самовывоз)
            </label>
            {profile && profile.savedAddresses.length > 0 && (<div className="field">
                <label htmlFor="saveda">Быстрый выбор адреса</label>
                <select id="saveda" defaultValue="" onChange={(e) => {
                    const id = e.target.value;
                    if (!id)
                        return;
                    const a = profile.savedAddresses.find((x) => x.id === id);
                    if (a)
                        setAddress(a.address);
                }}>
                  <option value="">— из профиля —</option>
                  {profile.savedAddresses.map((a) => (<option key={a.id} value={a.id}>
                      {a.label}: {a.address.slice(0, 48)}…
                    </option>))}
                </select>
              </div>)}
            <div className="field">
              <label htmlFor="addr">Адрес доставки / самовывоза</label>
              <textarea id="addr" rows={3} required minLength={5} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Город, улица, дом"/>
            </div>
            <div className="field">
              <label htmlFor="com">Комментарий</label>
              <input id="com" value={comment} onChange={(e) => setComment(e.target.value)}/>
            </div>
            <button type="submit" className="btn btn--primary" disabled={ordering}>
              {ordering ? "Создание…" : "Создать заказ"}
            </button>
          </form>
        </>)}
    </div>);
}
