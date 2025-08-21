export default function withCORS(handler: any) {
  return async (c: any) => {
    c.res.headers.set(
      "Access-Control-Allow-Origin",
      "acertaia-frontend.vercel.app"
    );
    c.res.headers.set("Access-Control-Allow-Credentials", "true");
    c.res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    c.res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );

    if (c.req.method === "OPTIONS") {
      return c.json({}, 204);
    }

    return handler(c);
  };
}
