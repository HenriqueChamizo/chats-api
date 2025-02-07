import mongoose from "mongoose";

export default () => {
  console.log("Conectando a base: ", process.env.MONGO_URI);
  mongoose
    .connect(process.env.MONGO_URI || "", {})
    .then(() => console.log("Conectado ao MongoDB"))
    .catch((err) => console.error("Erro ao conectar ao MongoDB:", err));
};
