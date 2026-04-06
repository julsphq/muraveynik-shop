import { useState } from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import { useAppSelector } from "./hooks";
import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { GuestCheckoutPage } from "./pages/GuestCheckoutPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderPage } from "./pages/OrderPage";
import { AdminPage } from "./pages/AdminPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { BlogPage } from "./pages/BlogPage";
import { BlogPostPage } from "./pages/BlogPostPage";
import { logout } from "./store/authSlice";
import { useAppDispatch } from "./hooks";
export default function App() {
    const { user, token } = useAppSelector((s) => s.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [headQ, setHeadQ] = useState("");
    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        const v = headQ.trim();
        if (v)
            navigate(`/catalog?q=${encodeURIComponent(v)}`);
        else
            navigate("/catalog");
    }
    return (<div className="layout">
      <div className="top-bar">
        <div className="container top-bar__inner">
          <span>Титаренко Илона Степановна, директор</span>
          <a className="top-bar__link" href="tel:+79081705835">
            8-908-170-58-35
          </a>
          <a className="top-bar__link" href="mailto:info@muraveynik.ru">
            info@muraveynik.ru
          </a>
        </div>
      </div>

      <header className="header">
        <NavLink to="/" className="logo">
          <span className="logo__main">Муравейник</span>
          <span className="logo__sub">строительные материалы</span>
        </NavLink>

        <form className="header-search" onSubmit={submitSearch}>
          <input type="search" placeholder="Поиск по каталогу" value={headQ} onChange={(e) => setHeadQ(e.target.value)} aria-label="Поиск"/>
          <button type="submit" className="btn btn--primary btn--compact">
            Найти
          </button>
        </form>

        <nav className="nav">
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/" end>
            Главная
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/catalog">
            Каталог
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/blog">
            Блог
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/cart">
            Корзина
          </NavLink>
          {token && (<>
              <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/favorites">
                Избранное
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/orders">
                Заказы
              </NavLink>
              <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/profile">
                Профиль
              </NavLink>
            </>)}
          {(user?.role === "ADMIN" || user?.role === "MANAGER") && (<NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/admin">
              Админ
            </NavLink>)}
        </nav>
        <div className="header__auth">
          {token ? (<>
              <span className="header__user">{user?.email}</span>
              <button type="button" className="btn btn--ghost" onClick={() => dispatch(logout())}>
                Выйти
              </button>
            </>) : (<>
              <NavLink to="/login" className="btn btn--ghost">
                Вход
              </NavLink>
              <NavLink to="/register" className="btn btn--primary">
                Регистрация
              </NavLink>
            </>)}
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />}/>
          <Route path="/catalog" element={<CatalogPage />}/>
          <Route path="/product/:slug" element={<ProductPage />}/>
          <Route path="/cart" element={<CartPage />}/>
          <Route path="/guest-checkout" element={<GuestCheckoutPage />}/>
          <Route path="/login" element={<LoginPage />}/>
          <Route path="/register" element={<RegisterPage />}/>
          <Route path="/favorites" element={<FavoritesPage />}/>
          <Route path="/profile" element={<ProfilePage />}/>
          <Route path="/blog" element={<BlogPage />}/>
          <Route path="/blog/:slug" element={<BlogPostPage />}/>
          <Route path="/orders" element={<OrdersPage />}/>
          <Route path="/orders/:id" element={<OrderPage />}/>
          <Route path="/admin" element={<AdminPage />}/>
        </Routes>
      </main>

      <footer className="footer">
        <div className="footer__grid">
          <div>
            <strong>ИП «Муравейник»</strong>
            <p className="footer__muted">
              Розничная торговля строительными материалами, инструментом,
              лакокрасочными изделиями и напольными покрытиями.
            </p>
          </div>
          <div>
            <p>8-908-170-58-35</p>
            <p>
              <a href="mailto:info@muraveynik.ru">info@muraveynik.ru</a>
            </p>
          </div>
        </div>
        <p className="footer__note">
          Дипломный проект: интернет-магазин · React · Node.js · PostgreSQL ·
          демо ЮKassa · заготовка обмена с 1С
        </p>
      </footer>
    </div>);
}
