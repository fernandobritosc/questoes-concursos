# Questões Pendentes de Revisão — TI - Redes de Computadores
**Total de pendentes:** 3 questões

Estes são os seus erros pendentes nesta matéria. Quando resolver uma questão no TEC Concursos e acertá-la, ela sairá desta lista automaticamente.

---

### Q1225 — Arquitetura TCP/IP

- **Banca:** CEBRASPE (CESPE) | **Órgão:** MPE TO | **Ano:** 2024
- **Primeiro Erro:** 2026-05-30 | **Última Tentativa:** 2026-05-30
- **Tentativas de Erro:** 1
- **Sua última resposta:** `A` | **Gabarito oficial:** `B`
- **Link no TEC Concursos:** [Questão TEC 2848036](https://www.tecconcursos.com.br/questoes/2848036)

**Enunciado:**

A respeito do TCP/IP, julgue o item subsequente.

 

A camada de aplicação é responsável pelo roteamento de pacotes entre redes.

**Alternativas:**
- A) Certo <- ❌ Sua resposta
- B) Errado <- ✅ Gabarito

**Resolução do Professor:**

Olá, futuro(a) servidor(a)! Vamos analisar juntos esta questão clássica da banca CEBRASPE (CESPE) sobre a arquitetura TCP/IP. Prepare seu material de anotação e vamos direto ao ponto.

**Gabarito: Alternativa B (Errado)**

---

### 1. Por que o gabarito é "Errado" (B)?

A afirmação da questão está incorreta porque confunde as atribuições das camadas do modelo TCP/IP. 

A **camada de aplicação** é a camada mais alta do modelo, ou seja, aquela que fica em contato direto com os programas e usuários. A sua função é fornecer a interface de comunicação para os softwares que utilizamos no dia a dia (como navegadores web utilizando o protocolo HTTP, clientes de e-mail com o SMTP, ou transferência de arquivos com o FTP). Ela **não** lida com a infraestrutura de transporte e entrega física dos dados, muito menos com o caminho que esses dados devem seguir.

---

### 2. Por que a alternativa "Certo" (A) está incorreta?

**Pegadinha:** O CEBRASPE adora fazer "associações cruzadas", que consiste em pegar o nome de um conceito correto (Camada de Aplicação) e associá-lo à definição de outro conceito também correto (Roteamento de Pacotes), mas que pertencem a esferas diferentes. 

Quem realiza o roteamento de pacotes de dados (datagramas) entre redes distintas, determinando o melhor caminho físico e lógico para a informação trafegar da origem ao destino, é a **Camada de Rede** (também chamada de **Camada de Internet** no modelo TCP/IP clássico). É nesta camada que operam os roteadores e o protocolo IP (Internet Protocol). Portanto, marcar "Certo" seria cair nessa armadilha de leitura rápida.

---

### 3. Pontos teóricos de alta relevância

**Importante:** Para gabaritar qualquer questão sobre o modelo TCP/IP, você precisa memorizar as funções principais e os principais protocolos de cada camada. Veja este mapeamento rápido:

*   **Camada de Aplicação:** Interface com o usuário/software. Protocolos: HTTP, HTTPS, DNS, DHCP, FTP, SMTP, SSH.
*   **Camada de Transporte:** Comunicação fim-a-fim, controle de fluxo e de erro, multiplexação. Protocolos: TCP (confiável) e UDP (rápido/não confiável).
*   **Camada de Rede (ou Internet):** Endereçamento lógico (IP) e **roteamento** de pacotes. Protocolos: IP, ICMP, ARP.
*   **Camada de Enlace / Física (ou Acesso à Rede):** Transmissão física dos bits no meio físico e endereçamento físico (MAC Address). Protocolos/Tecnologias: Ethernet, Wi-Fi.

---

### 4. Dica de Prova

**Dica de Prova:** Na hora da prova, faça associações mentais rápidas e diretas para economizar tempo:
*   Falou em **Roteamento, Roteador ou Endereço IP** $\rightarrow$ Pense imediatamente em **Camada de Rede (ou Internet)**.
*   Falou em **Portas, Conexão Confiável (TCP) ou Fluxo** $\rightarrow$ Pense em **Camada de Transporte**.
*   Falou em **Interação com Usuário, Navegador ou E-mail** $\rightarrow$ Pense em **Camada de Aplicação**.

Se a banca misturar essas palavras-chave, o item estará errado!

---

### 5. Fechamento

**Resumo:** O item está **Errado** (Gabarito B) porque a responsabilidade pelo roteamento de pacotes entre redes pertence à **Camada de Rede (Internet)**, e não à camada de aplicação. A camada de aplicação serve apenas como porta de entrada dos dados gerados pelos programas do usuário no sistema de rede. 

Continue firme nos estudos, domine as funções de cada camada e você estará muito mais perto da sua vaga. Bons estudos!

---

### Q1230 — Arquitetura TCP/IP

- **Banca:** CEBRASPE (CESPE) | **Órgão:** PGDF | **Ano:** 2021
- **Primeiro Erro:** 2026-05-30 | **Última Tentativa:** 2026-05-30
- **Tentativas de Erro:** 1
- **Sua última resposta:** `A` | **Gabarito oficial:** `B`
- **Link no TEC Concursos:** [Questão TEC 1708398](https://www.tecconcursos.com.br/questoes/1708398)

**Enunciado:**

A respeito de NetBIOS, TCP/IP, configuração de redes IP e princípios básicos de roteamento, julgue o item que se segue.

 

Na pilha TCP/IP, a camada de rede realiza a entrega de dados entre sistemas adjacentes e a camada de enlace de dados entrega dados a sistemas que não estão diretamente conectados à origem.

**Alternativas:**
- A) Certo <- ❌ Sua resposta
- B) Errado <- ✅ Gabarito

**Resolução do Professor:**

Olá, futuro servidor! É um prazer estar aqui para analisar com você mais uma questão clássica da banca CEBRASPE. Vamos desmistificar o assunto e garantir que você não caia nas armadilhas da banca.

O gabarito oficial desta questão é **B) Errado**.

Abaixo, apresento a resolução detalhada para você dominar este conceito de uma vez por todas.

---

### 1. Por que o gabarito é "Errado" (Alternativa B)?

A banca CEBRASPE cometeu uma **inversão completa** de conceitos sobre as funções das camadas do modelo TCP/IP. 

Para que a afirmação ficasse correta, os papéis deveriam ser trocados. Entenda o porquê:

*   **Camada de Enlace de Dados:** Ela é a responsável pela entrega de dados entre **sistemas adjacentes** (vizinhos físicos diretos, conectados pelo mesmo meio físico, conhecido como entrega *hop-to-hop* ou nó a nó). Ela não sabe como rotear dados além do próximo dispositivo diretamente conectado.
*   **Camada de Rede (ou Internet):** Esta sim é a camada responsável por entregar dados a sistemas que **não estão diretamente conectados** à origem. Ela realiza a entrega fim-a-fim (*host-to-host*), utilizando o endereçamento IP e o roteamento para guiar os pacotes por múltiplos nós até o destino final.

Portanto, ao afirmar que a Rede entrega para adjacentes e o Enlace entrega para não adjacentes, o item tornou-se incorreto.

---

### 2. Por que a alternativa "Certo" (Alternativa A) está errada?

Como a afirmação do enunciado inverteu as funções das camadas de Rede e Enlace, marcar "Certo" seria validar um erro conceitual grave de arquitetura de redes. 

Pegadinha: O CEBRASPE adora a técnica da "Inversão de Conceitos". A banca pega dois termos corretos (Camada de Rede e Camada de Enlace) e duas definições corretas, mas troca as definições entre eles. O candidato que faz uma leitura rápida ou desatenta acaba associando as palavras-chave de forma errada e cai na armadilha.

---

### 3. Pontos teóricos de alta relevância

Importante: Memorize o escopo de entrega de cada camada para nunca mais errar em provas de TI:

1.  **Camada de Enlace (e Física):** Entrega **Nó a Nó** (*Hop-to-Hop*). Comunicação entre dispositivos diretamente conectados (adjacentes).
2.  **Camada de Rede (Internet):** Entrega **Host a Host** (*End-to-End* / Fim a Fim). Comunicação entre a origem e o destino final, que podem estar em redes totalmente diferentes (não adjacentes).
3.  **Camada de Transporte:** Entrega **Processo a Processo** (*Port-to-Port*). Garante que a aplicação de origem fale com a aplicação correspondente no destino, utilizando números de portas (ex: porta 80 para HTTP).

---

### 4. Dica de Prova para acelerar a resolução

Dica de Prova: Faça uma associação mental rápida no dia da prova:
*   **Enlace = Vizinho de parede** (só fala com quem está encostado nele - adjacente).
*   **Rede = Correios** (leva a carta de uma cidade para outra, passando por vários postos até chegar ao destino - não adjacente).
*   **Transporte = Destinatário dentro da casa** (entrega para a pessoa certa dentro do destino - processo).

Ao ler a questão, separe os sujeitos e seus verbos. Viu "Rede" ligado a "adjacentes" ou "Enlace" ligado a "não adjacentes"? Pode marcar Errado sem medo de ser feliz!

---

### Resumo

Resumo: O item está **Errado** porque inverteu as atribuições. A camada de enlace realiza a entrega entre sistemas adjacentes (diretamente conectados), enquanto a camada de rede é a responsável por rotear e entregar os dados entre sistemas que não estão diretamente conectados (fim-a-fim).

Continue firme nos estudos. Mapear as pegadinhas da banca é o segredo para a sua aprovação! Bons estudos!

---

### Q1232 — Arquitetura TCP/IP

- **Banca:** FCC | **Órgão:** TRE PR | **Ano:** 2017
- **Primeiro Erro:** 2026-05-30 | **Última Tentativa:** 2026-05-30
- **Tentativas de Erro:** 1
- **Sua última resposta:** `A` | **Gabarito oficial:** `D`
- **Link no TEC Concursos:** [Questão TEC 527385](https://www.tecconcursos.com.br/questoes/527385)

**Enunciado:**

Na arquitetura TCP/IP, a Camada de

**Alternativas:**
- A) Aplicação, que fica imediatamente acima da camada de Rede/Internet, trabalha com os protocolos de nível mais baixo como o terminal virtual ou TELNET, de transferência de arquivos ou FTP e de correio eletrônico ou SNMP. <- ❌ Sua resposta
- B) Rede/Internet utiliza o UDP (User Datagram Protocol), protocolo não orientado à conexão, não confiável e utilizado por aplicações que não necessitam nem de controle de fluxo, nem da manutenção da sequência das mensagens enviadas. O UDP é amplamente utilizado para a transmissão de dados de voz ou de vídeo.
- C) Interface de Rede define um formato de pacote oficial e um protocolo, o IP. A sua tarefa é entregar pacotes IP onde eles são necessários. O roteamento de pacotes é de grande importância nesta camada, bem como a necessidade de evitar o congestionamento.
- D) Transporte visa permitir que os hosts de origem e de destino mantenham uma comunicação. Utiliza o TCP, um protocolo orientado à conexão, confiável e que permite a entrega de pacotes originários da máquina remetente para o computador destino da rede. <- ✅ Gabarito
- E) Rede/Internet reúne outros protocolos como o DNS (Domain Name Service.), que mapeia os nomes de hosts para seus respectivos endereços de rede, o HTTP (Hypertext Transfer Protocol), usado para buscar páginas na World Wide Web e o SMTP para gerenciamento de redes.

**Resolução do Professor:**

Olá, futuro funcionário público! Se você está se preparando para concursos de TI, a arquitetura TCP/IP é um dos temas mais cobrados, especialmente pela banca FCC (Fundação Carlos Chagas). Vamos analisar detalhadamente esta questão para que você não tenha dúvidas na hora da prova.

### Resolução Detalhada da Questão

**Gabarito: Alternativa D**

**Por que a alternativa D está correta?**
A camada de **Transporte** tem justamente a função de permitir que os hosts (origem e destino) realizem a comunicação fim a fim (end-to-end). O principal protocolo dessa camada é o **TCP** (Transmission Control Protocol), que é caracterizado por ser:
1. **Orientado à conexão:** estabelece uma sessão lógica (através do *three-way handshake*) antes de enviar os dados.
2. **Confiável:** garante que todos os dados enviados cheguem ao destino sem erros, duplicatas e na ordem correta, utilizando mecanismos de confirmação (ACK) e retransmissão.

---

### Análise das Alternativas Incorretas

**Alternativa A: INCORRETA**
* **Pegadinha:** A banca tentou confundir o candidato ao dizer que a camada de Aplicação fica "imediatamente acima" da camada de Rede/Internet. Na verdade, ela fica acima da camada de **Transporte**. Além disso, classificou protocolos de alto nível (como Telnet e FTP) como "nível mais baixo". Por fim, trocou a função do SNMP, que é um protocolo de gerência de rede, e não de correio eletrônico (o de correio eletrônico é o SMTP).

**Alternativa B: INCORRETA**
* **Pegadinha:** O texto descreve perfeitamente as características do protocolo UDP (não orientado à conexão, não confiável, ideal para voz e vídeo). No entanto, o erro crucial está em afirmar que a camada de **Rede/Internet** utiliza o UDP. O UDP é um protocolo da camada de **Transporte**.

**Alternativa C: INCORRETA**
* A alternativa descreve as funções da camada de **Rede/Internet** (definição do protocolo IP, roteamento de pacotes e controle de congestionamento), mas atribui erroneamente essas funções à camada de **Interface de Rede** (que lida com o meio físico e enlace de dados, como Ethernet ou Wi-Fi).

**Alternativa E: INCORRETA**
* **Pegadinha:** Novamente, a banca misturou os protocolos e suas camadas. DNS, HTTP e SMTP pertencem à camada de **Aplicação**, e não à camada de Rede/Internet. Para completar o erro, afirmou que o SMTP serve para "gerenciamento de redes", quando na verdade o SMTP é para envio de correio eletrônico (e-mails), enquanto o SNMP é utilizado para gerência.

---

### Pontos Teóricos Relevantes

**Importante:** A arquitetura TCP/IP clássica é dividida em 4 camadas (embora a literatura moderna frequentemente adote o modelo de 5 camadas para fins didáticos). Para a FCC, decore a seguinte estrutura de 4 camadas (de baixo para cima):
1. **Interface de Rede (ou Acesso à Rede):** Camada física e enlace (ex: Ethernet, Wi-Fi).
2. **Rede ou Internet:** Roteamento e endereçamento lógico (ex: IP, ICMP, ARP).
3. **Transporte:** Comunicação fim a fim e controle de fluxo (ex: TCP, UDP).
4. **Aplicação:** Interface com o usuário e serviços de rede (ex: HTTP, DNS, SMTP, FTP).

**Atenção:** A banca FCC adora trocar as siglas **SMTP** (Simple Mail Transfer Protocol - Correio Eletrônico) e **SNMP** (Simple Network Management Protocol - Gerência de Rede). Guarde isso no seu mapa mental!

---

### Dica de Prova para Acelerar a Resolução

**Dica de Prova:** Em questões sobre o modelo TCP/IP, faça um mapeamento rápido de "Protocolo x Camada" antes de ler o texto longo das alternativas. 
* Falou em **IP**? Pense em **Internet**.
* Falou em **TCP ou UDP**? Pense em **Transporte**.
* Falou em **HTTP, FTP, SMTP, DNS, DHCP, SNMP**? Pense em **Aplicação**.
Isso elimina mais da metade das alternativas incorretas em segundos!

---

**Resumo:** O gabarito é a **Alternativa D** porque descreve perfeitamente as atribuições da camada de Transporte e as propriedades de confiabilidade e conexão do protocolo TCP. As demais alternativas pecaram ao misturar protocolos com camadas incorretas ou trocar as funções clássicas do SMTP e SNMP. 

Bons estudos, mantenha o foco e a vaga é sua!

---
