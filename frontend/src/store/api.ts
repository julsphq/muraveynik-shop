import { createApi, fetchBaseQuery, type FetchBaseQueryError, } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./index";
const baseUrl = import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api";
export type Category = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    parentId: string | null;
    children?: Category[];
    _count?: {
        products: number;
    };
};
export type Product = {
    id: string;
    slug: string;
    sku: string;
    name: string;
    description: string;
    price: string;
    stock: number;
    imageUrl: string | null;
    brand: string | null;
    material: string | null;
    sizeLabel: string | null;
    weightKg: string | null;
    popularity: number;
    isNew: boolean;
    categoryId: string;
    countryOrigin?: string | null;
    applicationGuide?: string | null;
    category?: Category;
    createdAt?: string;
};
export type Banner = {
    id: string;
    title: string;
    subtitle: string | null;
    imageUrl: string | null;
    linkHref: string | null;
    sortOrder: number;
    active: boolean;
};
export type BlogPostListItem = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: string;
};
export type BlogPost = BlogPostListItem & {
    body: string;
};
export type SavedAddress = {
    id: string;
    label: string;
    address: string;
    isDefault: boolean;
};
export type ProfileUser = {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
    savedAddresses: SavedAddress[];
};
export type ProductQuestion = {
    id: string;
    productId: string;
    userId: string;
    text: string;
    answer: string | null;
    createdAt: string;
    answeredAt: string | null;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
};
export type Review = {
    id: string;
    productId: string;
    userId: string;
    rating: number;
    text: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        email: string;
    };
};
export type ReviewsResponse = {
    items: Review[];
    count: number;
    averageRating: number | null;
};
export type CartItem = {
    id: string;
    quantity: number;
    product: Product & {
        category: Category;
    };
};
export type Order = {
    id: string;
    status: string;
    total: string;
    itemsSubtotal: string;
    deliveryCost: string;
    deliveryType: string;
    paymentMethod: string;
    address: string | null;
    comment: string | null;
    isReservation?: boolean;
    deliveryZone?: string | null;
    guestEmail?: string | null;
    guestPhone?: string | null;
    guestName?: string | null;
    createdAt: string;
    user?: {
        email: string;
        name?: string | null;
    } | null;
    items: {
        id: string;
        quantity: number;
        price: string;
        product: Product;
    }[];
    payments: {
        id: string;
        status: string;
        provider: string;
    }[];
};
export type GuestOrderPayload = {
    items: {
        productId: string;
        quantity: number;
    }[];
    guestEmail: string;
    guestPhone: string;
    guestName: string;
    address: string;
    comment?: string;
    deliveryType: "COURIER" | "PICKUP";
    paymentMethod: "ONLINE" | "CASH_ON_DELIVERY";
    deliveryZone?: "DEFAULT" | "CENTER" | "OUTSKIRTS";
    isReservation?: boolean;
};
export const api = createApi({
    reducerPath: "api",
    baseQuery: fetchBaseQuery({
        baseUrl,
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token;
            if (token)
                headers.set("authorization", `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: [
        "Cart",
        "Orders",
        "Products",
        "Favorites",
        "Reviews",
        "Profile",
        "Banners",
        "Blog",
        "Admin",
    ],
    endpoints: (builder) => ({
        getCategories: builder.query<Category[], void>({
            query: () => "/categories",
        }),
        getCategoryTree: builder.query<Category[], void>({
            query: () => "/categories/tree",
        }),
        getProducts: builder.query<{
            items: Product[];
            page: number;
            total: number;
            pages: number;
        }, {
            category?: string;
            search?: string;
            page?: number;
            brand?: string;
            material?: string;
            sizeLabel?: string;
            priceMin?: number;
            priceMax?: number;
            inStock?: boolean;
            isNew?: boolean;
            sort?: string;
            limit?: number;
        }>({
            query: (params) => ({
                url: "/products",
                params: {
                    ...params,
                    inStock: params.inStock === true ? "true" : undefined,
                    isNew: params.isNew === true ? "true" : undefined,
                },
            }),
            providesTags: ["Products"],
        }),
        getProduct: builder.query<Product, string>({
            query: (slug) => `/products/${encodeURIComponent(slug)}`,
        }),
        getRelatedProducts: builder.query<{
            items: Product[];
        }, string>({
            query: (slug) => `/products/${encodeURIComponent(slug)}/related`,
        }),
        getBanners: builder.query<{
            items: Banner[];
        }, void>({
            query: () => "/banners",
            providesTags: ["Banners"],
        }),
        getBlogPosts: builder.query<{
            items: BlogPostListItem[];
        }, void>({
            query: () => "/blog/posts",
            providesTags: ["Blog"],
        }),
        getBlogPost: builder.query<BlogPost, string>({
            query: (slug) => `/blog/posts/${encodeURIComponent(slug)}`,
            providesTags: ["Blog"],
        }),
        getQuestionsForProduct: builder.query<{
            items: ProductQuestion[];
        }, string>({
            query: (productId) => `/questions/product/${productId}`,
        }),
        postProductQuestion: builder.mutation<ProductQuestion, {
            productId: string;
            text: string;
        }>({
            query: (body) => ({ url: "/questions", method: "POST", body }),
        }),
        getProfile: builder.query<ProfileUser, void>({
            query: () => "/profile/me",
            providesTags: ["Profile"],
        }),
        patchProfile: builder.mutation<ProfileUser, {
            name?: string;
            phone?: string;
        }>({
            query: (body) => ({
                url: "/profile/me",
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["Profile"],
        }),
        createSavedAddress: builder.mutation<SavedAddress, {
            label: string;
            address: string;
            isDefault?: boolean;
        }>({
            query: (body) => ({
                url: "/profile/addresses",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Profile"],
        }),
        deleteSavedAddress: builder.mutation<void, string>({
            query: (id) => ({
                url: `/profile/addresses/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Profile"],
        }),
        getReviewsForProduct: builder.query<ReviewsResponse, string>({
            query: (productId) => `/reviews/product/${productId}`,
            providesTags: (_r, _e, productId) => [
                { type: "Reviews", id: productId },
            ],
        }),
        createReview: builder.mutation<Review, {
            productId: string;
            rating: number;
            text?: string;
        }>({
            query: (body) => ({
                url: "/reviews",
                method: "POST",
                body,
            }),
            invalidatesTags: (_r, _e, arg) => [
                { type: "Reviews", id: arg.productId },
            ],
        }),
        deleteReview: builder.mutation<void, {
            id: string;
            productId: string;
        }>({
            query: ({ id }) => ({
                url: `/reviews/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (_r, _e, arg) => [
                { type: "Reviews", id: arg.productId },
            ],
        }),
        getProductsByIds: builder.query<Product[], string[]>({
            query: (ids) => ({
                url: "/products/by-ids/list",
                method: "POST",
                body: { ids },
            }),
        }),
        getDeliveryQuote: builder.query<{
            deliveryType: string;
            weightKg: number;
            cost: number;
            currency: string;
            note: string;
        }, {
            type: "COURIER" | "PICKUP";
            weightKg: number;
            zone?: "DEFAULT" | "CENTER" | "OUTSKIRTS";
        }>({
            query: ({ type, weightKg, zone }) => ({
                url: "/delivery/quote",
                params: { type, weightKg, zone },
            }),
        }),
        register: builder.mutation<{
            token: string;
            user: {
                id: string;
                email: string;
                name?: string | null;
                role: string;
            };
        }, {
            email: string;
            password: string;
            name?: string;
        }>({
            query: (body) => ({
                url: "/auth/register",
                method: "POST",
                body,
            }),
        }),
        login: builder.mutation<{
            token: string;
            user: {
                id: string;
                email: string;
                name?: string | null;
                role: string;
            };
        }, {
            email: string;
            password: string;
        }>({
            query: (body) => ({
                url: "/auth/login",
                method: "POST",
                body,
            }),
        }),
        getCart: builder.query<{
            items: CartItem[];
            total: string;
        }, void>({
            query: () => "/cart",
            providesTags: ["Cart"],
        }),
        addToCart: builder.mutation<CartItem, {
            productId: string;
            quantity?: number;
        }>({
            query: (body) => ({
                url: "/cart",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Cart"],
        }),
        updateCartItem: builder.mutation<CartItem, {
            id: string;
            quantity: number;
        }>({
            query: ({ id, quantity }) => ({
                url: `/cart/${id}`,
                method: "PATCH",
                body: { quantity },
            }),
            invalidatesTags: ["Cart"],
        }),
        removeCartItem: builder.mutation<void, string>({
            query: (id) => ({
                url: `/cart/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Cart"],
        }),
        getFavorites: builder.query<Product[], void>({
            query: () => "/favorites",
            providesTags: ["Favorites"],
        }),
        addFavorite: builder.mutation<{
            ok: boolean;
        }, string>({
            query: (productId) => ({
                url: `/favorites/${productId}`,
                method: "POST",
            }),
            invalidatesTags: ["Favorites"],
        }),
        removeFavorite: builder.mutation<void, string>({
            query: (productId) => ({
                url: `/favorites/${productId}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Favorites"],
        }),
        createOrder: builder.mutation<Order, {
            address: string;
            comment?: string;
            deliveryType: "COURIER" | "PICKUP";
            paymentMethod: "ONLINE" | "CASH_ON_DELIVERY";
            deliveryZone?: "DEFAULT" | "CENTER" | "OUTSKIRTS";
            isReservation?: boolean;
        }>({
            query: (body) => ({
                url: "/orders",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Cart", "Orders"],
        }),
        repeatOrderToCart: builder.mutation<{
            ok: boolean;
            message: string;
        }, string>({
            query: (orderId) => ({
                url: `/orders/${orderId}/repeat`,
                method: "POST",
            }),
            invalidatesTags: ["Cart"],
        }),
        createGuestOrder: builder.mutation<Order, GuestOrderPayload>({
            query: (body) => ({
                url: "/orders/guest",
                method: "POST",
                body,
            }),
        }),
        getOrders: builder.query<Order[], void>({
            query: () => "/orders",
            providesTags: ["Orders"],
        }),
        getOrder: builder.query<Order, string>({
            query: (id) => `/orders/${id}`,
            providesTags: (_r, _e, id) => [{ type: "Orders", id }],
        }),
        demoPay: builder.mutation<{
            ok: boolean;
            message: string;
            paymentId: string;
        }, {
            orderId: string;
            guestEmail?: string;
        }>({
            query: (body) => ({
                url: "/payments/yookassa/demo",
                method: "POST",
                body,
            }),
            invalidatesTags: (_r, _e, arg) => [
                "Orders",
                { type: "Orders", id: arg.orderId },
            ],
        }),
        getAdminStats: builder.query<{
            users: number;
            products: number;
            orders: number;
            revenue: string;
        }, void>({
            query: () => "/admin/stats",
        }),
        getAdminOrders: builder.query<Order[], void>({
            query: () => "/admin/orders",
            providesTags: ["Orders"],
        }),
        patchAdminOrderStatus: builder.mutation<Order, {
            id: string;
            status: string;
        }>({
            query: ({ id, status }) => ({
                url: `/admin/orders/${id}/status`,
                method: "PATCH",
                body: { status },
            }),
            invalidatesTags: ["Orders"],
        }),
        getAdminProducts: builder.query<{
            items: Product[];
        }, void>({
            query: () => "/admin/products",
            providesTags: ["Admin"],
        }),
        deleteAdminProduct: builder.mutation<void, string>({
            query: (id) => ({ url: `/admin/products/${id}`, method: "DELETE" }),
            invalidatesTags: ["Admin", "Products"],
        }),
        patchAdminProduct: builder.mutation<Product, {
            id: string;
            imageUrl?: string;
        }>({
            query: ({ id, ...body }) => ({
                url: `/admin/products/${id}`,
                method: "PATCH",
                body,
            }),
            invalidatesTags: ["Admin", "Products"],
        }),
        uploadAdminProductImage: builder.mutation<{
            imageUrl: string;
            filename: string;
        }, FormData>({
            query: (body) => ({
                url: "/admin/uploads/product-image",
                method: "POST",
                body,
            }),
        }),
        getAdminQuestions: builder.query<{
            items: (ProductQuestion & {
                product: {
                    id: string;
                    name: string;
                    slug: string;
                };
            })[];
        }, void>({
            query: () => "/admin/questions",
            providesTags: ["Admin"],
        }),
        patchAdminQuestion: builder.mutation<ProductQuestion & {
            product: {
                id: string;
                name: string;
                slug: string;
            };
        }, {
            id: string;
            answer: string;
        }>({
            query: ({ id, answer }) => ({
                url: `/admin/questions/${id}`,
                method: "PATCH",
                body: { answer },
            }),
            invalidatesTags: ["Admin"],
        }),
    }),
});
export const { useGetCategoriesQuery, useGetCategoryTreeQuery, useGetProductsQuery, useGetProductQuery, useGetRelatedProductsQuery, useGetBannersQuery, useGetBlogPostsQuery, useGetBlogPostQuery, useGetQuestionsForProductQuery, usePostProductQuestionMutation, useGetProfileQuery, usePatchProfileMutation, useCreateSavedAddressMutation, useDeleteSavedAddressMutation, useGetReviewsForProductQuery, useCreateReviewMutation, useDeleteReviewMutation, useGetProductsByIdsQuery, useLazyGetProductsByIdsQuery, useGetDeliveryQuoteQuery, useRegisterMutation, useLoginMutation, useGetCartQuery, useAddToCartMutation, useUpdateCartItemMutation, useRemoveCartItemMutation, useGetFavoritesQuery, useAddFavoriteMutation, useRemoveFavoriteMutation, useCreateOrderMutation, useCreateGuestOrderMutation, useRepeatOrderToCartMutation, useGetOrdersQuery, useGetOrderQuery, useDemoPayMutation, useGetAdminStatsQuery, useGetAdminOrdersQuery, usePatchAdminOrderStatusMutation, useGetAdminProductsQuery, useDeleteAdminProductMutation, usePatchAdminProductMutation, useUploadAdminProductImageMutation, useGetAdminQuestionsQuery, usePatchAdminQuestionMutation, } = api;
export function getErrorMessage(err: FetchBaseQueryError | undefined): string {
    if (!err)
        return "Ошибка";
    if ("status" in err &&
        err.data &&
        typeof err.data === "object" &&
        err.data !== null &&
        "error" in err.data) {
        const e = (err.data as {
            error?: unknown;
        }).error;
        if (typeof e === "string")
            return e;
    }
    return "Запрос не выполнен";
}
