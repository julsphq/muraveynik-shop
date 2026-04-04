import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useGetProfileQuery, usePatchProfileMutation, useCreateSavedAddressMutation, useDeleteSavedAddressMutation, getErrorMessage, } from "../store/api";
import { useAppSelector } from "../hooks";
import { useToast } from "../components/Toast";
export function ProfilePage() {
    const token = useAppSelector((s) => s.auth.token);
    const { data, isLoading, refetch } = useGetProfileQuery(undefined, {
        skip: !token,
    });
    const [patchProfile, { isLoading: saving }] = usePatchProfileMutation();
    const [createAddr, { isLoading: adding }] = useCreateSavedAddressMutation();
    const [delAddr] = useDeleteSavedAddressMutation();
    const toast = useToast();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [alabel, setAlabel] = useState("Дом");
    const [aaddr, setAaddr] = useState("");
    useEffect(() => {
        if (!data)
            return;
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
    }, [data]);
    if (!token)
        return <Navigate to="/login" replace/>;
    if (isLoading || !data)
        return <p>Загрузка…</p>;
    async function saveProfile(e: React.FormEvent) {
        e.preventDefault();
        try {
            await patchProfile({
                name: name.trim() || undefined,
                phone: phone.trim() || "",
            }).unwrap();
            toast("Профиль сохранён.");
            void refetch();
        }
        catch (err) {
            toast(getErrorMessage(err as never), false);
        }
    }
    async function addAddress(e: React.FormEvent) {
        e.preventDefault();
        try {
            await createAddr({
                label: alabel.trim(),
                address: aaddr.trim(),
                isDefault: (data?.savedAddresses.length ?? 0) === 0,
            }).unwrap();
            setAaddr("");
            toast("Адрес добавлен.");
            void refetch();
        }
        catch (err) {
            toast(getErrorMessage(err as never), false);
        }
    }
    return (<div style={{ maxWidth: "560px" }}>
      <h1>Личный кабинет</h1>
      <p style={{ color: "var(--muted)" }}>
        Данные профиля и сохранённые адреса для оформления заказов.
      </p>

      <form onSubmit={saveProfile} className="stack" style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Профиль</h2>
        <div className="field">
          <label htmlFor="pname">Имя</label>
          <input id="pname" value={name} onChange={(e) => setName(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="pphone">Телефон</label>
          <input id="pphone" value={phone} onChange={(e) => setPhone(e.target.value)}/>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
          E-mail: <strong>{data.email}</strong> (логин)
        </p>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </form>

      <h2 style={{ fontSize: "1.1rem" }}>Сохранённые адреса</h2>
      <ul style={{ paddingLeft: "1.2rem", color: "var(--muted)" }}>
        {data.savedAddresses.length === 0 && <li>Пока нет — добавьте ниже.</li>}
        {data.savedAddresses.map((a) => (<li key={a.id} style={{ marginBottom: "0.5rem" }}>
            <strong>{a.label}:</strong> {a.address}
            {a.isDefault && " · по умолчанию"}{" "}
            <button type="button" className="btn btn--ghost" style={{ padding: "0.15rem 0.4rem", fontSize: "0.75rem" }} onClick={() => void delAddr(a.id).then(() => refetch())}>
              Удалить
            </button>
          </li>))}
      </ul>

      <form onSubmit={addAddress} className="stack" style={{ marginTop: "1rem" }}>
        <div className="field">
          <label htmlFor="alab">Подпись</label>
          <input id="alab" value={alabel} onChange={(e) => setAlabel(e.target.value)} required/>
        </div>
        <div className="field">
          <label htmlFor="aadr">Адрес</label>
          <textarea id="aadr" rows={2} required minLength={5} value={aaddr} onChange={(e) => setAaddr(e.target.value)}/>
        </div>
        <button type="submit" className="btn btn--ghost" disabled={adding}>
          {adding ? "Добавление…" : "Добавить адрес"}
        </button>
      </form>

      <p style={{ marginTop: "2rem" }}>
        <Link to="/orders">История заказов →</Link>
      </p>
    </div>);
}
