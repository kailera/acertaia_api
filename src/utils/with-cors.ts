import type { Context } from "hono";

export default function withCORS(handler: (c: Context) => Promise<Response>) {
	return async (c: Context): Promise<Response> => {
		c.res.headers.set(
			"Access-Control-Allow-Origin",
			"acertaia-frontend.vercel.app",
		);
		c.res.headers.set("Access-Control-Allow-Credentials", "true");
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
