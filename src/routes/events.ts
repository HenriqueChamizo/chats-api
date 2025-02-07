import { google, calendar_v3 } from "googleapis";
import { Application } from "express";
import User from "../models/User";
import authenticateJWT from "../middlewares/auth";

export default (app: Application) => {
  app.get("/events", authenticateJWT, async (req: any, res): Promise<any> => {
    try {
      const user = await User.findById(req.user.id);

      if (!user || !user.googleAccessToken) {
        return res
          .status(401)
          .json({ message: "Usuário não autenticado no Google Calendar" });
      }

      // Criar o cliente da API do Google Calendar
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: user.googleAccessToken });

      const calendar = google.calendar({ version: "v3", auth });

      // Buscar os eventos do Google Calendar
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      });

      res.json(response.data.items);
    } catch (error) {
      console.error("Erro ao buscar eventos do Google Calendar:", error);
      res.status(500).json({ message: "Erro ao buscar eventos da agenda" });
    }
  });

  app.post(
    "/create-event",
    authenticateJWT,
    async (req: any, res): Promise<any> => {
      try {
        const { summary, description, startDateTime, endDateTime } = req.body;

        if (!summary || !startDateTime || !endDateTime) {
          return res.status(400).json({
            message: "Campos obrigatórios: summary, startDateTime, endDateTime",
          });
        }

        const user = await User.findById(req.user.id);

        if (!user || !user.googleAccessToken) {
          return res
            .status(401)
            .json({ message: "Usuário não autenticado no Google Calendar" });
        }

        // Criar o cliente da API do Google Calendar
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: user.googleAccessToken });

        const calendar = google.calendar({ version: "v3", auth });

        // Criar o evento
        const event = {
          summary: summary,
          description: description || "",
          start: {
            dateTime: new Date(startDateTime).toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          end: {
            dateTime: new Date(endDateTime).toISOString(),
            timeZone: "America/Sao_Paulo",
          },
        };

        const response = await calendar.events.insert({
          calendarId: "primary",
          requestBody: event,
        } as calendar_v3.Params$Resource$Events$Insert);

        res.json({
          message: "Evento criado com sucesso!",
          event: response.data,
        });
      } catch (error) {
        console.error("Erro ao criar evento no Google Calendar:", error);
        res.status(500).json({ message: "Erro ao criar evento na agenda" });
      }
    }
  );
};
