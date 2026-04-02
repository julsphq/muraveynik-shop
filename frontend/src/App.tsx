import { useState, useEffect, useRef } from "react";
import { Routes, Route, NavLink, useNavigate, useLocation } from "react-router-dom";
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
import { PrivacyPage } from "./pages/PrivacyPage";
import { PaymentReturnPage } from "./pages/PaymentReturnPage";
import { logout } from "./store/authSlice";
import { useAppDispatch } from "./hooks";
import { useGetCartQuery } from "./store/api";
import { loadGuestCart } from "./guestCart";
import logo from "./assets/muraveynik-logo.png";
export default function App() {
    const { user, token } = useAppSelector((s) => s.auth);
    const dispatch = useAppDispatch();
    const { data: cartData } = useGetCartQuery(undefined, { skip: !token });
    const cartCount = token
        ? (cartData?.items.reduce((s, i) => s + i.quantity, 0) ?? 0)
        : loadGuestCart().reduce((s, l) => s + l.quantity, 0);
    const navigate = useNavigate();
    const location = useLocation();
    const [headQ, setHeadQ] = useState("");
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [headerHidden, setHeaderHidden] = useState(false);
    const lastScrollY = useRef(0);
    const headerWrapperRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

useEffect(() => {
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY > lastScrollY.current && currentScrollY > 80 && !headerMenuOpen) {
      setHeaderHidden(true);
    } else if (currentScrollY < lastScrollY.current) {
      setHeaderHidden(false);
    }
    lastScrollY.current = currentScrollY;
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, [headerMenuOpen]);

useEffect(() => {
  const el = headerWrapperRef.current;
  if (!el) return;
  const obs = new ResizeObserver(() => setHeaderHeight(el.offsetHeight));
  obs.observe(el);
  setHeaderHeight(el.offsetHeight);
  return () => obs.disconnect();
}, []);
    useEffect(() => {
        setHeaderMenuOpen(false);
    }, [location.pathname]);
    const [cookieAccepted, setCookieAccepted] = useState(() => localStorage.getItem("cookie-consent") === "accepted");
    function submitSearch(e: React.FormEvent) {
        e.preventDefault();
        const v = headQ.trim();
        if (v)
            navigate(`/catalog?q=${encodeURIComponent(v)}`);
        else
            navigate("/catalog");
    }
    function acceptCookies() {
        localStorage.setItem("cookie-consent", "accepted");
        setCookieAccepted(true);
    }
    return (
  <div className="layout">
    <div
      ref={headerWrapperRef}
      className={`header-wrapper ${headerHidden ? 'header-wrapper--hidden' : ''}`}
    >
      <div className="top-bar">
        <div className="container top-bar__inner">
          <span>Ключко Геннадий Васильевич, владелец</span>
          <a className="top-bar__link" href="tel:+79081705835">
            8-908-170-58-35
          </a>
          <a className="top-bar__link" href="mailto:info@muraveynik.shop">
            info@muraveynik.shop
          </a>
        </div>
      </div>

      <header className={`header${headerMenuOpen ? " header--nav-open" : ""}`}>
        <NavLink to="/" className="logo">
          <img className="logo__img" src={logo} alt="Муравейник" />
        </NavLink>

        <button
          type="button"
          className="header__menu-btn"
          aria-expanded={headerMenuOpen}
          aria-controls="header-drawer"
          onClick={() => setHeaderMenuOpen((o) => !o)}
        >
          <span className="header__menu-icon" aria-hidden="true" />
          <span className="visually-hidden">
            {headerMenuOpen ? "Закрыть меню" : "Открыть меню"}
          </span>
        </button>

        <form className="header-search" onSubmit={submitSearch}>
          <input
            type="search"
            placeholder="Поиск по каталогу"
            value={headQ}
            onChange={(e) => setHeadQ(e.target.value)}
            aria-label="Поиск"
          />
          <button type="submit" className="btn btn--primary btn--compact">
            Найти
          </button>
        </form>

        <div id="header-drawer" className="header__drawer">
          <nav className="nav" aria-label="Основное меню">
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
              Корзина{cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </NavLink>
            {token && (
              <>
                <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/favorites">
                  Избранное
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/orders">
                  Заказы
                </NavLink>
                <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/profile">
                  Профиль
                </NavLink>
              </>
            )}
            {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
              <NavLink className={({ isActive }) => (isActive ? "active" : "")} to="/admin">
                Админ
              </NavLink>
            )}
          </nav>
          <div className="header__auth">
            {token ? (
              <>
                <span className="header__user">{user?.email}</span>
                <button type="button" className="btn btn--ghost" onClick={() => dispatch(logout())}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn--ghost">
                  Вход
                </NavLink>
                <NavLink to="/register" className="btn btn--primary">
                  Регистрация
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
    <div style={{ height: headerHeight }} aria-hidden="true" />

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
          <Route path="/privacy" element={<PrivacyPage />}/>
          <Route path="/orders" element={<OrdersPage />}/>
          <Route path="/orders/:id" element={<OrderPage />}/>
          <Route path="/admin" element={<AdminPage />}/>
          <Route path="/payment/return" element={<PaymentReturnPage />}/>
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
            <strong>Покупателям</strong>
            <ul className="footer__links">
              <li><NavLink to="/catalog">Каталог товаров</NavLink></li>
              <li><NavLink to="/cart">Корзина</NavLink></li>
              <li><NavLink to="/blog">Статьи и советы</NavLink></li>
              <li><NavLink to="/privacy">Политика конфиденциальности</NavLink></li>
            </ul>
          </div>
          <div>
            <strong>Контакты</strong>
            <ul className="footer__links">
              <li><a href="tel:+79081705835">8-908-170-58-35</a></li>
              <li><a href="mailto:info@muraveynik.shop">info@muraveynik.shop</a></li>
            </ul>
          </div>
        </div>
        <p className="footer__note">
          © {new Date().getFullYear()} ИП «Муравейник». Все права защищены.
          {" · "}
          <NavLink to="/privacy">Политика конфиденциальности</NavLink>
        </p>
      </footer>
      {!cookieAccepted && (<div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Уведомление о cookie">
          <p className="cookie-banner__text">
            Мы используем cookie для работы сайта, корзины и аналитики. Продолжая пользоваться сайтом, вы соглашаетесь с политикой конфиденциальности.
          </p>
          <div className="cookie-banner__actions">
            <NavLink to="/privacy" className="btn btn--ghost btn--compact">
              Подробнее
            </NavLink>
            <button type="button" className="btn btn--primary btn--compact" onClick={acceptCookies}>
              Понятно
            </button>
          </div>
        </div>)}
    </div>);
}
