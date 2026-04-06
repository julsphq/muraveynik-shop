export function redisUrlConfigured(): boolean {
    return Boolean(process.env.REDIS_URL?.trim());
}
