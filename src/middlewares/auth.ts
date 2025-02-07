import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import User from "../models/User";

const authenticateJWT = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const token = req.header("Authorization");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acesso negado, token não fornecido" });
  }

  try {
    const decoded = jwt.verify(
      token.replace("Bearer ", ""),
      process.env.JWT_SECRET as string
    );

    // Buscar o usuário no banco para verificar se ainda tem um refresh token válido
    const user = await User.findById((decoded as JwtPayload).id);
    if (!user || !user.refreshToken) {
      return res
        .status(403)
        .json({ message: "Sessão inválida, faça login novamente" });
    }

    req.user = decoded; // Armazena os dados do usuário na requisição
    return next();
  } catch (err) {
    return res.status(403).json({ message: "Token inválido ou expirado" });
  }
};

export default authenticateJWT;
