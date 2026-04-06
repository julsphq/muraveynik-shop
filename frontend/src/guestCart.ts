const KEY = "mur_guest_cart";
export type GuestLine = {
    productId: string;
    quantity: number;
};
export function loadGuestCart(): GuestLine[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw)
            return [];
        const p = JSON.parse(raw) as GuestLine[];
        return Array.isArray(p) ? p : [];
    }
    catch {
        return [];
    }
}
export function saveGuestCart(lines: GuestLine[]) {
    localStorage.setItem(KEY, JSON.stringify(lines));
}
export function addGuestLine(productId: string, quantity: number) {
    const lines = loadGuestCart();
    const i = lines.findIndex((l) => l.productId === productId);
    if (i >= 0)
        lines[i] = { productId, quantity: lines[i].quantity + quantity };
    else
        lines.push({ productId, quantity });
    saveGuestCart(lines);
}
export function setGuestLineQty(productId: string, quantity: number) {
    let lines = loadGuestCart();
    if (quantity < 1)
        lines = lines.filter((l) => l.productId !== productId);
    else {
        const i = lines.findIndex((l) => l.productId === productId);
        if (i >= 0)
            lines[i] = { productId, quantity };
        else
            lines.push({ productId, quantity });
    }
    saveGuestCart(lines);
}
export function clearGuestCart() {
    localStorage.removeItem(KEY);
}
