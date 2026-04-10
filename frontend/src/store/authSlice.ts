import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
export type User = {
    id: string;
    email: string;
    name?: string | null;
    role: string;
};
function load(): {
    token: string | null;
    user: User | null;
} {
    try {
        const raw = localStorage.getItem("mur_auth");
        if (!raw)
            return { token: null, user: null };
        return JSON.parse(raw) as {
            token: string;
            user: User;
        };
    }
    catch {
        return { token: null, user: null };
    }
}
const initial = load();
const authSlice = createSlice({
    name: "auth",
    initialState: {
        token: initial.token as string | null,
        user: initial.user as User | null,
    },
    reducers: {
        setCredentials(state, action: PayloadAction<{
            token: string;
            user: User;
        }>) {
            state.token = action.payload.token;
            state.user = action.payload.user;
            localStorage.setItem("mur_auth", JSON.stringify({ token: state.token, user: state.user }));
        },
        logout(state) {
            state.token = null;
            state.user = null;
            localStorage.removeItem("mur_auth");
        },
    },
});
export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
