export function ok<T>(data: T, meta?: Record<string, unknown>) {
	return {
		data,
		meta: meta ?? {
			nextCursor: null,
			count: Array.isArray(data) ? data.length : 1,
		},
	};
}
