import { Application } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import User from "../../models/User";

export default (app: Application) => {
  // Inicializa o Passport e a sessão
  app.use(passport.initialize());
  app.use(passport.session());
  console.log(">>>>>>> aqui: ", process.env);
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL: process.env.GOOGLE_REDIRECT_URI || "",
        scope: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.settings.readonly",
        ],
      } as any,
      async (accessToken, refreshToken, profile: any, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            user = new User({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              profilePic: profile.photos[0].value,
            });
          }

          user.googleAccessToken = accessToken;
          user.googleRefreshToken = refreshToken;
          const newAccessToken = jwt.sign(
            { id: user._id, name: user.name, email: user.email },
            process.env.JWT_SECRET || "",
            { expiresIn: "1h" }
          );

          const newRefreshToken = jwt.sign(
            { id: user._id },
            process.env.JWT_REFRESH_SECRET || "",
            { expiresIn: "14d" }
          );

          // Substituir refresh token antigo no banco
          user.refreshToken = newRefreshToken;
          await user.save();

          return done(null, {
            user,
            token: newAccessToken,
            refreshToken: newRefreshToken,
          });
        } catch (err) {
          return done(err, undefined);
        }
      }
    )
  );

  // Serialização do usuário
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Desserialização do usuário
  passport.deserializeUser((user, done) => {
    done(null, user as any);
  });
};
