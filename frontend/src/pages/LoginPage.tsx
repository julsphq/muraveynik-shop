import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLoginMutation, getErrorMessage } from "../store/api";
import { setCredentials } from "../store/authSlice";
import { useAppDispatch } from "../hooks";
import { useToast } from "../components/Toast";
export function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [login, { isLoading }] = useLoginMutation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const toast = useToast();
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            const r = await login({ email, password }).unwrap();
            dispatch(setCredentials({ token: r.token, user: r.user }));
            navigate("/catalog");
        }
        catch (e) {
            toast(getErrorMessage(e as never), false);
        }
    }
    return (<div style={{ maxWidth: "400px" }}>
      <h1>Вход</h1>
      <form onSubmit={onSubmit} className="stack">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required/>
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required/>
        </div>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>
          {isLoading ? "Вход…" : "Войти"}
        </button>
      </form>
      <p style={{ color: "var(--muted)" }}>
        Нет аккаунта? <Link to="/register">Регистрация</Link>
      </p>
    </div>);
}
