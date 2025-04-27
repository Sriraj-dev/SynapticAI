
import { Hono } from "hono";
import { CallbackController } from "../controllers/callback.controller";

const callbackRouter = new Hono();

callbackRouter.post("/user/signup",CallbackController.userSignUp);

export default callbackRouter;
