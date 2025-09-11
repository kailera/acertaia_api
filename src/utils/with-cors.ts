import type { Context } from "hono";

export default function withCORS(
	handler: (c: Context) => Response | Promise<Response>,
) {
	const allowedOrigin = process.env.ALLOWED_ORIGIN;

	return async (c: Context): Promise<Response> => {
		const origin = c.req.header("Origin");

		if (allowedOrigin && origin === allowedOrigin) {
			c.res.headers.set("Access-Control-Allow-Origin", allowedOrigin);
			c.res.headers.set("Access-Control-Allow-Credentials", "true");
		}

		c.res.headers.set(
			"Access-Control-Allow-Headers",
			"Content-Type, Authorization",
		);
		c.res.headers.set(
			"Access-Control-Allow-Methods",
			"GET, POST, PUT, DELETE, OPTIONS",
		);

		if (c.req.method === "OPTIONS") {
			return new Response(null, { status: 204 });
		}

		return handler(c);
	};
}
