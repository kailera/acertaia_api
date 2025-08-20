// middleware/auth.ts
import { JWTPayload, jwtVerify, SignJWT } from "jose";

const key = new TextEncoder().encode(process.env.JWT_SECRET);


// encriptador: 
export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(key);
}

//decriptador:
export async function decrypt(session: any) {
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (e) {
    return null;
  }
}


async function verifyJWT(req: { headers: { [x: string]: any; }; user: JWTPayload; }) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) throw new Error("No token provided");

    const token = authHeader.replace("Bearer ", "");
    const { payload } = await jwtVerify(token, key);

    // Você pode salvar o payload no request para usar depois no handler
    req.user = payload;
  } catch (err) {
    throw new Error("Unauthorized");
  }
}

export function withAuth(cHandler:any) {
  return async (c:any) => {
    try {
      await verifyJWT(c.req);
      return cHandler(c);
    } catch (error) {
      c.json({success:'false',  error:'unauthorized'}, 403)
    }
  };
}
