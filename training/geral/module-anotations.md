# 📌 Documentação do Módulo de Anotações (ANOTATIONS)

## 📚 Visão Geral

O módulo ANOTATIONS é responsável por armazenar, recuperar e atualizar anotações no sistema. As anotações podem incluir eventos, observações, registros de incidentes e qualquer outra informação relevante para consulta futura.

## 🔹 Estrutura Padrão do JSON

Todas as interações com o módulo de anotações devem seguir este formato:

{
"module": "ANOTATIONS",
"action": "ACAO_A_EXECUTAR",
"resume_message": "Resumo curto da anotação",
"data": {
"...dados estruturados...",
"keys": ["...palavras-chave indexáveis..."]
}
}

📌 Campos do JSON:

| Campo          | Tipo   | Obrigatório | Descrição                                                         |
| -------------- | ------ | ----------- | ----------------------------------------------------------------- |
| module         | string | Sim         | Sempre "ANOTATIONS" para indicar o módulo.                        |
| action         | string | Sim         | Ação a ser executada (CREATE, SEARCH, UPDATE, DELETE).            |
| resume_message | string | Sim         | Resumo da anotação.                                               |
| data           | objeto | Sim         | Dados estruturados da anotação.                                   |
| keys           | lista  | Sim         | Lista de palavras-chave para facilitar a busca no banco de dados. |

## 🔄 Ações Disponíveis no Módulo

### ✏️ 1. Criar uma anotação (CREATE)

Cria um novo registro no banco de dados.

### 🔹 Exemplo:

{
"module": "ANOTATIONS",
"action": "CREATE",
"resume_message": "Criar anotação sobre acidente envolvendo um carro",
"data": {
"DESCRIPTION": "Carro Honda Fit preto placa AKG9837 envolvido em acidente",
"CAR": "HONDA FIT PRETO",
"PLATE": "AKG9837",
"EVENT": "ACCIDENT",
"DATE": "2025-02-25",
"LOCATION": "LOCAL INDEFINIDO",
"keys": ["CAR", "PLATE", "ACCIDENT", "COLLISION", "DATE", "LOCATION"]
}
}

### 📌 Regras:

- Se faltarem informações críticas (exemplo: a data do evento), o assistente deve perguntar ao usuário antes de gerar o JSON.
- As chaves no keys devem ser usadas para buscas futuras.

## 🔍 2. Buscar uma anotação (SEARCH)

Realiza buscas por palavras-chave indexadas.

### 🔹 Exemplo:

{
"module": "ANOTATIONS",
"action": "SEARCH",
"resume_message": "Buscar informações sobre o acidente do usuário",
"data": {
"SEARCH_QUERY": "ACCIDENT CAR",
"keys": ["CAR", "ACCIDENT", "COLLISION", "DATE"]
}
}

### 📌 Regras:

- A busca retorna anotações que tenham pelo menos uma correspondência nas palavras-chave keys.
- O assistente deve interpretar corretamente quando o usuário deseja buscar uma anotação e não criar uma nova.

## 🔄 3. Atualizar uma anotação (UPDATE)

Edita um registro existente no banco de dados.

### 🔹 Exemplo:

{
"module": "ANOTATIONS",
"action": "UPDATE",
"resume_message": "Atualizar anotação sobre acidente de carro",
"data": {
"ANNOTATION_ID": "65fd3c2b16e4b9a1d4e8b920",
"DESCRIPTION": "Carro Honda Fit preto placa AKG9837 envolvido em acidente no cruzamento da Av. Paulista",
"LOCATION": "Av. Paulista",
"keys": ["CAR", "PLATE", "ACCIDENT", "COLLISION", "DATE", "LOCATION"]
}
}

### 📌 Regras:

- O campo ANNOTATION_ID é obrigatório para localizar e modificar a anotação.
- Se o usuário não informar qual anotação deve ser alterada, o assistente deve perguntar.

## 🗑 4. Excluir uma anotação (DELETE)

Remove um registro específico.

### 🔹 Exemplo:

{
"module": "ANOTATIONS",
"action": "DELETE",
"resume_message": "Remover anotação sobre acidente de carro",
"data": {
"ANNOTATION_ID": "65fd3c2b16e4b9a1d4e8b920",
"keys": ["CAR", "PLATE", "ACCIDENT", "COLLISION"]
}
}

### 📌 Regras:

- O campo ANNOTATION_ID é obrigatório.
- O assistente deve confirmar com o usuário antes de remover um registro.

## 🧠 📊 Como o Assistente Interpreta as Solicitações?

### ✅ Exemplo de fluxo correto:

- Usuário: “Anote que vou ao dentista na sexta-feira às 15h.”
- Assistente: “Ok! Qual o nome da clínica e o local do atendimento?”
- Usuário: “Na Clínica Sorriso, na Av. Brasil.”
- Assistente gera o JSON:

{
"module": "ANOTATIONS",
"action": "CREATE",
"resume_message": "Criar anotação sobre consulta odontológica",
"data": {
"DESCRIPTION": "Consulta odontológica na Clínica Sorriso na Av. Brasil",
"DATE": "2025-03-01T15:00:00Z",
"LOCATION": "Clínica Sorriso - Av. Brasil",
"EVENT": "DENTIST",
"keys": ["DENTISTA", "CONSULTA", "CLÍNICA", "DATA", "LOCAL"]
}
}

### 📌 Neste caso:

- O assistente identificou a data (sexta-feira às 15h) e converteu para formato ISO.
- Perguntou sobre a clínica e o local.
- Criou uma anotação estruturada para facilitar a busca futura.

### ❌ Exemplo de fluxo incorreto:

- 1️⃣ Usuário: “Quero saber qual carro bateu em mim.”
- 2️⃣ Assistente: “Qual a placa do carro que bateu em você?” (❌ Pergunta errada!)
- 3️⃣ Usuário: “Não, quero saber qual carro bateu em mim!”
- 4️⃣ Assistente gera um JSON incorreto:

{
"module": "ANOTATIONS",
"action": "SEARCH",
"resume_message": "Buscar anotações de veículos envolvidos em acidente",
"data": {
"SEARCH_QUERY": "ACIDENTE",
"keys": ["ACIDENTE", "VEÍCULO"]
}
}

#### 📌 Erros nesse caso:

- O assistente não interpretou corretamente que já havia uma anotação no banco.
- A pergunta deveria ter sido: “Você já tem uma anotação sobre isso? Posso buscar por você?”
- A busca deveria ter sido feita por “PLATE”, “CAR”, “ACCIDENT”, que já estavam indexados.

#### 🎯 Regras Gerais

- O assistente deve sempre buscar informações antes de criar novas anotações.
- Se houver dúvidas, ele deve perguntar antes de gerar o JSON.
- Para buscas, sempre usar palavras-chave indexadas no campo keys.
- Em interações onde há múltiplas ações (exemplo: “Vou ao médico e comprar pão”), o assistente deve dividir em múltiplos JSONs.

#### 📌 Conclusão

O módulo ANOTATIONS é essencial para registrar e buscar informações estruturadas de forma eficiente. Ele permite ao assistente organizar os dados de maneira inteligente, garantindo que os usuários possam acessar e recuperar informações rapidamente.
