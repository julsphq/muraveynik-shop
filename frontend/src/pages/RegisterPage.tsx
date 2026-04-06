import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterMutation, getErrorMessage } from "../store/api";
import { setCredentials } from "../store/authSlice";
import { useAppDispatch } from "../hooks";
export function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [register, { isLoading }] = useRegisterMutation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [err, setErr] = useState<string | null>(null);
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);
        try {
            const r = await register({ email, password, name: name || undefined }).unwrap();
            dispatch(setCredentials({ token: r.token, user: r.user }));
            navigate("/catalog");
        }
        catch (e) {
            setErr(getErrorMessage(e as never));
        }
    }
    return (<div style={{ maxWidth: "400px" }}>
      <h1>Регистрация</h1>
      {err && <div className="alert">{err}</div>}
      <form onSubmit={onSubmit} className="stack">
        <div className="field">
          <label htmlFor="name">Имя (необязательно)</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)}/>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
        </div>
        <div className="field">
          <label htmlFor="password">Пароль (мин. 6 символов)</label>
          <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}/>
        </div>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>
          {isLoading ? "Создание…" : "Создать аккаунт"}
        </button>
      </form>
      <p style={{ color: "var(--muted)" }}>
        Уже есть аккаунт? <Link to="/login">Вход</Link>
      </p>
    </div>);
}
