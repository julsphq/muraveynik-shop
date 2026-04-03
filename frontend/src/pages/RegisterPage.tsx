import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegisterMutation, getErrorMessage } from "../store/api";
import { setCredentials } from "../store/authSlice";
import { useAppDispatch } from "../hooks";
import { useToast } from "../components/Toast";
export function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [consent, setConsent] = useState(false);
    const [register, { isLoading }] = useRegisterMutation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const toast = useToast();
    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!consent) {
            toast("Подтвердите согласие на обработку персональных данных.", false);
            return;
        }
        try {
            const r = await register({ email, password, name: name || undefined }).unwrap();
            dispatch(setCredentials({ token: r.token, user: r.user }));
            navigate("/catalog");
        }
        catch (e) {
            toast(getErrorMessage(e as never), false);
        }
    }
    return (<div style={{ maxWidth: "400px" }}>
      <h1>Регистрация</h1>
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
        <label className="consent-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required/>
          <span>
            Я соглашаюсь с{" "}
            <Link to="/privacy" target="_blank" rel="noreferrer">
              политикой конфиденциальности
            </Link>{" "}
            и обработкой персональных данных.
          </span>
        </label>
        <button type="submit" className="btn btn--primary" disabled={isLoading}>
          {isLoading ? "Создание…" : "Создать аккаунт"}
        </button>
      </form>
      <p style={{ color: "var(--muted)" }}>
        Уже есть аккаунт? <Link to="/login">Вход</Link>
      </p>
    </div>);
}
