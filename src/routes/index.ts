import { Application } from "express";
import auth from "./auth";
import profile from "./profile";
import events from "./events";
import chat from "./chat";
import call from "./call";
import whats from "./whats";

export default (app: Application) => {
  // Rota de autenticação no Google
  app.get("/", (req, res, next) => {
    res.send("Tela Inicial");
    return next();
  });

  auth(app);
  profile(app);
  events(app);
  chat(app);
  call(app);
  whats(app);
};
