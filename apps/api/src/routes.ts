import { Router } from "express";
import { authRouter } from "./modules/auth/auth.controller.js";
import { usersRouter } from "./modules/users/users.controller.js";
import { listingsRouter } from "./modules/listings/listings.controller.js";
import { akaziRouter } from "./modules/akazi/akazi.controller.js";
import { communityRouter } from "./modules/community/community.controller.js";
import { messagesRouter } from "./modules/messages/messages.controller.js";
import { notificationsRouter } from "./modules/notifications/notifications.controller.js";
import { ibiminaRouter } from "./modules/ibimina/ibimina.controller.js";
import { walletRouter } from "./modules/wallet/wallet.controller.js";
import { searchRouter } from "./modules/search/search.controller.js";
import { catalogRouter } from "./modules/catalog/catalog.controller.js";
import { uploadsRouter } from "./modules/uploads/uploads.controller.js";
import { favoritesRouter } from "./modules/favorites/favorites.controller.js";
import { adminRouter } from "./modules/admin/admin.controller.js";

/** API v1 surface. Versioned so future breaking changes can ship side by side. */
export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/listings", listingsRouter);
apiRouter.use("/akazi", akaziRouter);
apiRouter.use("/community", communityRouter);
apiRouter.use("/messages", messagesRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/ibimina", ibiminaRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/me", favoritesRouter);
apiRouter.use("/uploads", uploadsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/", catalogRouter);

apiRouter.get("/", (_req, res) => {
  res.json({ name: "Umuturanyi API", version: "1", status: "ok" });
});
