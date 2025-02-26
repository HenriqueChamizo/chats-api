import Anotation, { IAnotation } from "../models/Anotation";

class AnotationService {
  /**
   * Cria uma nova anotação no banco.
   * @param description Resumo da anotação
   * @param data Dados estruturados da anotação
   * @param keys Lista de chaves para facilitar a busca
   * @returns Anotação criada
   */
  async createAnotation(
    description: string,
    data: Record<string, any>,
    keys: string[]
  ): Promise<IAnotation> {
    return await Anotation.create({ description, data, keys });
  }

  /**
   * Busca anotações pelo ID
   * @param id ID da anotação
   * @returns Anotação encontrada ou null
   */
  async getAnotationById(id: string): Promise<IAnotation | null> {
    return await Anotation.findById(id);
  }

  /**
   * Atualiza uma anotação
   * @param id ID da anotação
   * @param updateData Novos dados para atualização
   * @returns Anotação atualizada
   */
  async updateAnotation(
    id: string,
    updateData: Partial<IAnotation>
  ): Promise<IAnotation | null> {
    return await Anotation.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Remove uma anotação do banco
   * @param id ID da anotação
   * @returns Resultado da exclusão
   */
  async deleteAnotation(id: string): Promise<boolean> {
    const result = await Anotation.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * 🔥 Consulta por `keys` e calcula a porcentagem de correspondência.
   * @param keys Lista de palavras-chave buscadas
   * @returns Lista de anotações e % de match com as chaves informadas
   */
  async searchAnotationsByKeys(
    keys: string[]
  ): Promise<{ anotation: IAnotation; matchPercentage: number }[]> {
    const anotations = await Anotation.find({ keys: { $in: keys } });

    return anotations.map((anotation) => {
      const matchedKeys = anotation.keys.filter((key) => keys.includes(key));
      const matchPercentage = (matchedKeys.length / keys.length) * 100;

      return { anotation, matchPercentage };
    });
  }
}

export default new AnotationService();
