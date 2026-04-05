import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAppSelector } from "../hooks";

type Status = "pending" | "succeeded" | "canceled" | "error" | "timeout";

export function PaymentReturnPage() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId");
    const token = useAppSelector((s) => s.auth.token);

    const [status, setStatus] = useState<Status>("pending");
    const [total, setTotal] = useState<string | null>(null);
    const pollCount = useRef(0);

    useEffect(() => {
        if (!orderId) { setStatus("error"); return; }

        const check = async () => {
            try {
                const headers: Record<string, string> = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;
                const r = await fetch(`/api/payments/yookassa/status/${orderId}`, { headers });
                if (!r.ok) { setStatus("error"); return; }
                const data = await r.json() as {
                    orderStatus: string;
                    paymentStatus: string | null;
                    total: string;
                    demo?: boolean;
                };

                setTotal(data.total);

                if (data.orderStatus === "PAID" || data.paymentStatus === "succeeded") {
                    setStatus("succeeded");
                    return;
                }
                if (data.paymentStatus === "canceled") {
                    setStatus("canceled");
                    return;
                }

                // продолжаем polling
                pollCount.current += 1;
                if (pollCount.current >= 15) {
                    setStatus("timeout");
                    return;
                }
                setTimeout(check, 2000);
            } catch {
                setStatus("error");
            }
        };

        setTimeout(check, 1500);
    }, [orderId, token]);

    if (!orderId) {
        return (
            <div>
                <div className="alert">Не указан номер заказа.</div>
                <Link to="/orders" className="btn btn--ghost" style={{ marginTop: "1rem" }}>Мои заказы</Link>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: "480px" }}>
            {status === "pending" && (
                <>
                    <h1>Проверяем оплату…</h1>
                    <p style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span className="spinner" />
                        Ожидаем подтверждения от ЮКассы
                    </p>
                </>
            )}

            {status === "succeeded" && (
                <>
                    <h1>Оплата прошла успешно</h1>
                    {total && (
                        <p>
                            Сумма:{" "}
                            <strong>{Number(total).toLocaleString("ru-RU")} ₽</strong>
                        </p>
                    )}
                    <p style={{ color: "var(--muted)" }}>
                        Заказ принят в работу. Мы пришлём уведомление, когда он будет собран.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                        {token && (
                            <Link to={`/orders/${orderId}`} className="btn btn--primary">
                                Детали заказа
                            </Link>
                        )}
                        <Link to="/catalog" className="btn btn--ghost">В каталог</Link>
                    </div>
                </>
            )}

            {status === "canceled" && (
                <>
                    <h1>Оплата отменена</h1>
                    <p style={{ color: "var(--muted)" }}>
                        Платёж был отменён или истекло время ожидания.
                        Вы можете попробовать снова.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                        {token && (
                            <Link to={`/orders/${orderId}`} className="btn btn--primary">
                                Повторить оплату
                            </Link>
                        )}
                        <Link to="/catalog" className="btn btn--ghost">В каталог</Link>
                    </div>
                </>
            )}

            {status === "timeout" && (
                <>
                    <h1>Статус уточняется</h1>
                    <p style={{ color: "var(--muted)" }}>
                        Не удалось получить подтверждение в течение ожидания.
                        Проверьте статус заказа — обычно он обновляется в течение нескольких минут.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                        {token && (
                            <Link to={`/orders/${orderId}`} className="btn btn--primary">
                                Открыть заказ
                            </Link>
                        )}
                        <Link to="/catalog" className="btn btn--ghost">В каталог</Link>
                    </div>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="alert">Не удалось проверить статус оплаты.</div>
                    {token && (
                        <Link to={`/orders/${orderId}`} className="btn btn--ghost" style={{ marginTop: "1rem" }}>
                            Открыть заказ
                        </Link>
                    )}
                </>
            )}
        </div>
    );
}
