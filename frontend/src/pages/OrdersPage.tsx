import { Link, Navigate } from "react-router-dom";
import { useGetOrdersQuery } from "../store/api";
import { useAppSelector } from "../hooks";
const statusRu: Record<string, string> = {
    NEW: "Новый",
    PAID: "Оплачен",
    PROCESSING: "Собирается",
    SHIPPED: "В доставке",
    DELIVERED: "Доставлен",
    CANCELLED: "Отменён",
};
export function OrdersPage() {
    const token = useAppSelector((s) => s.auth.token);
    const { data, isLoading } = useGetOrdersQuery(undefined, { skip: !token });
    if (!token)
        return <Navigate to="/login" replace/>;
    if (isLoading)
        return <p>Загрузка…</p>;
    const orders = data ?? [];
    return (<div>
      <h1>Мои заказы</h1>
      {orders.length === 0 ? (<p style={{ color: "var(--muted)" }}>Заказов пока нет.</p>) : (<table className="table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Статус</th>
              <th>Сумма</th>
              <th>Доставка</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (<tr key={o.id}>
                <td>{new Date(o.createdAt).toLocaleString("ru-RU")}</td>
                <td>{statusRu[o.status] ?? o.status}</td>
                <td>{Number(o.total).toLocaleString("ru-RU")} ₽</td>
                <td>
                  {o.deliveryType === "COURIER" ? "курьер" : "самовывоз"} ·{" "}
                  {Number(o.deliveryCost).toLocaleString("ru-RU")} ₽
                </td>
                <td>
                  <Link to={`/orders/${o.id}`}>Подробнее</Link>
                </td>
              </tr>))}
          </tbody>
        </table>)}
    </div>);
}
