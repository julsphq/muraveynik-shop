export async function publishIntegrationEvent(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    console.info("[queue]", routingKey, JSON.stringify(payload));
}
