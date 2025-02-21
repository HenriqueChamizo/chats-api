import twilio from "twilio";
import CallSession from "../models/CallSession";

class TwilioService {
  private client: twilio.Twilio;
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_SECRET_KEY!
    );
    this.debug = debug;
  }

  async makeCall(number: string, url: string, sessionId: string) {
    if (this.debug) {
      console.log("Fazendo chamada para", number, "com URL", url);
      return { sid: "debug-call-sid" };
    }

    const call = await this.client.calls.create({
      url,
      to: number,
      from: process.env.TWILIO_PHONE_NUMBER!,
    });

    await CallSession.create({
      phoneNumber: number,
      sessionId,
      callSid: call.sid,
    });

    return call;
  }

  async updateCallStatus(callSid: string, status: string) {
    const callSession = await CallSession.findOne({ callSid });

    if (!callSession) {
      console.warn(`🚨 Nenhuma sessão encontrada para CallSid: ${callSid}`);
      return null;
    }

    callSession.status = status as "in-progress" | "completed" | "failed";
    if (status === "completed") {
      callSession.endTime = new Date();
      callSession.duration =
        (callSession.endTime.getTime() - callSession.startTime.getTime()) /
        1000;
    }

    await callSession.save();
    return callSession;
  }

  generateTwimlResponse(
    text: string,
    actionUrl: string,
    {
      endCall = false,
      sayType = "gather",
    }: { endCall?: boolean; sayType: "gather" | "twiml" }
  ) {
    const twiml = new twilio.twiml.VoiceResponse();

    if (endCall) {
      twiml.say({ voice: "alice", language: "pt-BR" }, text);
      twiml.hangup();
    } else {
      const says = {
        gather: () =>
          twiml.gather({
            input: ["speech"],
            action: actionUrl,
            method: "POST",
            speechTimeout: "3s",
            speechModel: "default",
            language: "pt-BR",
          }),
        twiml: () => twiml,
      };

      const actionSay = says[sayType]();
      actionSay.say({ voice: "alice", language: "pt-BR" }, text);

      twiml.pause({ length: 1 });
      twiml.redirect({ method: "POST" }, actionUrl);
    }

    return twiml.toString();
  }
}

export default TwilioService;
