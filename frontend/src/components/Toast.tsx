import {createContext, useCallback, useContext, useState} from "react";

type ToastItem = { id: number; text: string; ok: boolean; exiting: boolean };
type ShowToast = (text: string, ok?: boolean) => void;

const ToastCtx = createContext<ShowToast>(() => {
});

export function useToast(): ShowToast {
    return useContext(ToastCtx);
}

let _nextId = 0;
const VISIBLE_MS = 2700;
const EXIT_MS = 280;

export function ToastProvider({children}: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const show = useCallback<ShowToast>((text, ok = true) => {
        const id = ++_nextId;
        setToasts((prev) => [...prev, {id, text, ok, exiting: false}]);

        setTimeout(() => {
            setToasts((prev) =>
                prev.map((t) => (t.id === id ? {...t, exiting: true} : t))
            );
        }, VISIBLE_MS);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, VISIBLE_MS + EXIT_MS);
    }, []);

    return (
        <ToastCtx.Provider value={show}>
            {children}
            <div className="toast-stack" aria-live="polite" aria-atomic="false">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`toast${t.exiting ? " toast--out" : ""}`}
                        data-ok={t.ok}
                    >
                        {t.text}
                    </div>
                ))}
            </div>
        </ToastCtx.Provider>
    );
}
