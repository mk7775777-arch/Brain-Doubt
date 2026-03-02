import express from "express";
import { createServer as createViteServer } from "vite";
import { OAuth2Client } from "google-auth-library";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: "braindoubt-secret",
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: true,
        sameSite: "none",
        httpOnly: true,
      },
    })
  );

  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);

  // API Routes
  app.get("/api/auth/google/url", (req, res) => {
    if (!CLIENT_ID) {
      return res.status(500).json({ error: "GOOGLE_CLIENT_ID not configured" });
    }

    const redirectUri = `${req.protocol}://${req.get("host")}/auth/google/callback`;
    const url = client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      redirect_uri: redirectUri,
    });

    res.json({ url });
  });

  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send("No code provided");

    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/auth/google/callback`;
      const { tokens } = await client.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      client.setCredentials(tokens);

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (payload) {
        const userData = {
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          isLoggedIn: true,
        };

        // Send success message to parent window and close popup
        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: ${JSON.stringify(userData)} }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Authentication successful. This window should close automatically.</p>
            </body>
          </html>
        `);
      } else {
        res.status(500).send("Failed to get user payload");
      }
    } catch (error) {
      console.error("OAuth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
