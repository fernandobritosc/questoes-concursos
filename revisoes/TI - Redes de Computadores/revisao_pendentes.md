# Questões Pendentes de Revisão — TI - Redes de Computadores
**Total de pendentes:** 4 questões

Estes são os seus erros pendentes nesta matéria. Quando resolver uma questão no TEC Concursos e acertá-la, ela sairá desta lista automaticamente.

---

### Q1230 — Arquitetura TCP/IP

- **Banca:** CEBRASPE (CESPE) | **Órgão:** PGDF | **Ano:** 2021
- **Primeiro Erro:** 2026-05-30 | **Última Tentativa:** 2026-06-08
- **Tentativas de Erro:** 2
- **Sua última resposta:** `C` | **Gabarito oficial:** `B`
- **Link no TEC Concursos:** [Questão TEC 1708398](https://www.tecconcursos.com.br/questoes/1708398)

**Enunciado:**

A respeito de NetBIOS, TCP/IP, configuração de redes IP e princípios básicos de roteamento, julgue o item que se segue.

 

Na pilha TCP/IP, a camada de rede realiza a entrega de dados entre sistemas adjacentes e a camada de enlace de dados entrega dados a sistemas que não estão diretamente conectados à origem.

**Alternativas:**
- A) Certo
- B) Errado <- ✅ Gabarito

**Resolução do Professor:**

**Gabarito: ERRADO. **

**Vejamos:**

**Camada de rede - **A terceira camada da pilha do padrão OSI é a camada de rede, que está diretamente ligada ao envio dos pacotes do dispositivo de origem até o destino. Para um pacote sair da origem até chegar no destino através da rede e da internet pode ser necessária a travessia por muitos caminhos intermediários, controlados por roteadores intermediadores através de hops (ou saltos), ou seja, realiza a entrega de dados a sistemas que não estão diretamente conectados à origem. Essa função toda cabe a Camada de Rede e aos roteadores, que ficam encarregados de conectar diferentes LANs e WANs, e prestar suporte para o roteamento de pacotes. A fim de cumprir os seus objetivos, a camada de rede deve ter conhecimento do conjunto de roteadores e enlaces da rede, ou seja, deve conhecer a topologia de rede a fim de escolher os caminhos mais apropriados para o fluxo de dados. Esta camada deve ter ainda o cuidado de tomar as melhores rotas de envios dos pacotes, evitando sobrecarregar a comunicação de certos roteadores. Por fim, a camada de rede recebe serviços oferecidos pela camada de enlace, e por sua vez oferece serviços à camada de transporte do modelo OSI.

**Camada de enlace -** A camada de enlace é a segunda camada do modelo OSI, e primeira camada para alguns autores do modelo TCP que denominam a camada de **Interface de rede**, também chamada **camada de acesso à rede**, formada por duas camadas em conjunto, a camada Física e a cada de Enlace como apenas uma camada. Sua principal atribuição é permitir a conexão entre dois nós em uma mesma rede, auxiliando na troca de informações através do envio de quadros (frames), ou seja, realiza a entrega de dados entre sistemas adjacentes. Oferece ainda, serviços a camada de rede, auxilia no controle do fluxo de envio de dados e detecção e correção de erros.

**Análise da afirmativa:**

Na pilha TCP/IP, a camada de rede realiza ~~a entrega de dados entre sistemas adjacentes~~ a entrega de dados a sistemas que não estão diretamente conectados à origem e a camada de enlace de dados ~~entrega dados a sistemas que não estão diretamente conectados à origem~~ realiza a entrega de dados entre sistemas adjacentes.

**A afirmativa está INCORRETA, pois troca os conceitos e características das camadas de rede e de enlace.**

---

### Q1950 — Cloud Computing (Computação em Nuvem)

- **Banca:** CEBRASPE (CESPE) | **Órgão:** Ministério Público do Estado do Tocantins | **Ano:** ?
- **Primeiro Erro:** 2026-06-08 | **Última Tentativa:** 2026-06-08
- **Tentativas de Erro:** 1
- **Sua última resposta:** `C` | **Gabarito oficial:** `E`
- **Link no TEC Concursos:** [Questão TEC 2848024](https://www.tecconcursos.com.br/questoes/2848024)

**Enunciado:**

Julgue o próximo item, relativo a segurança e componentes de uma arquitetura em nuvem.

 

Os usuários são responsáveis pela privacidade dos seus dados quando operam serviços em nuvem, sendo os provedores de nuvem, nesse caso, responsáveis apenas por proteger a coleta e o processamento de dados; por isso, o usuário deve garantir a privacidade de comunicação de dados pessoais.

**Alternativas:**
- C) Certo <- ❌ Sua resposta
- E) Errado <- ✅ Gabarito

**Resolução do Professor:**

**Gabarito: ERRADO**

 

Antes de entrarmos no conteúdo, vamos ponderar uma informação sobre a banca Cebraspe. Quando ela aborda um tema e no meio da construção do item aplica palavras de cunho restritivo, tais como: apenas, deve, obrigatório, só, somente e similares, devemos ligar o sinal de alerta, pois há grande chance do item estar errado.

 

Quando a banca utiliza dois elementos de restrição no mesmo item, como foi o caso do nosso item acima, a chance do gabarito ser errado é ainda maior, portanto, devemos ficar atentos a estes pequenos detalhes na cobrança desta banca.

 

Seguindo um pouco mais, vamos analisar o conteúdo do item, o qual afirma que somente o usuário é o responsável pela privacidade dos dados, o que é falso. Pense que você está utilizando uma plataforma que não precisa se preocupar em proteger os seus dados após a coleta e antes do processamento, ou seja, os seus dados ficam soltos, pois o provedor não é o responsável pela sua privicidade, acredito que você não iria querer continuar utilizando-a, não é verdade?

 

Certamente que isso não faz sentido nenhum. Da mesma forma que o usuário é o responsável pela privacidade, o provedor dos serviços também deve ser responsável por isso, além de tomar todos os cuidados possíveis para proteger o dado enquanto ele estiver sob sua posse.

 

> Os provedores de serviços de nuvem (CSPs) geralmente seguem um modelo de responsabilidade compartilhada, o que significa que a implementação da segurança da computação em nuvem é responsabilidade do provedor de nuvem e você, *o cliente*.

 

Portanto, estamos diante um item **ERRADO**.

---

### Q1953 — Cloud Computing (Computação em Nuvem)

- **Banca:** CEBRASPE (CESPE) | **Órgão:** Ministério Público do Estado do Tocantins | **Ano:** ?
- **Primeiro Erro:** 2026-06-08 | **Última Tentativa:** 2026-06-08
- **Tentativas de Erro:** 1
- **Sua última resposta:** `C` | **Gabarito oficial:** `E`
- **Link no TEC Concursos:** [Questão TEC 2847918](https://www.tecconcursos.com.br/questoes/2847918)

**Enunciado:**

Julgue o próximo item, relativo a conceitos de computação em nuvem.

 

Tratando-se de SaaS, o provedor é responsável por provisionar e fornecer ferramentas de desenvolvimento, com vistas a gerenciar o processamento físico e o armazenamento para permitir que o usuário utilize o serviço.

**Alternativas:**
- C) Certo <- ❌ Sua resposta
- E) Errado <- ✅ Gabarito

**Resolução do Professor:**

**ITEM ERRADO**. *Software as a Service* (SaaS) é um modelo de serviço em que as aplicações são hospedadas pelo provedor de serviço e disponibilizadas aos usuários pela internet. No modelo SaaS, o provedor é responsável pela gestão completa da aplicação, incluindo a infraestrutura subjacente, o sistema operacional, o middleware e a própria aplicação.

 

No entanto, a afirmação de que o provedor de SaaS é responsável por "*provisionar e fornecer ferramentas de desenvolvimento*" está incorreta. Essa descrição se aplica mais corretamente ao modelo *Platform as a Service* (PaaS), onde o provedor oferece uma plataforma que inclui ferramentas de desenvolvimento, banco de dados, sistemas operacionais e serviços de middleware, permitindo que os usuários desenvolvam, executem e gerenciem suas próprias aplicações.

 

Em SaaS, o usuário final geralmente **não tem acesso ao ambiente de desenvolvimento** ou às ferramentas de desenvolvimento fornecidas pelo provedor. O usuário simplesmente utiliza a aplicação pronta e gerenciada pelo provedor, sem se preocupar com o desenvolvimento ou a manutenção da infraestrutura.

 

Portanto, a afirmação está incorreta, pois confunde as responsabilidades e características do modelo SaaS com as do modelo PaaS.

---

### Q1960 — Cloud Computing (Computação em Nuvem)

- **Banca:** VUNESP | **Órgão:** Tribunal Regional Federal da 3ª Região | **Ano:** ?
- **Primeiro Erro:** 2026-06-08 | **Última Tentativa:** 2026-06-08
- **Tentativas de Erro:** 1
- **Sua última resposta:** `B` | **Gabarito oficial:** `C`
- **Link no TEC Concursos:** [Questão TEC 2773987](https://www.tecconcursos.com.br/questoes/2773987)

**Enunciado:**

Os tipos de serviço de computação em nuvem disponíveis para contratação costumam ser agrupados por meio de acrônimos que remetem ao tipo de serviço oferecido. O aluguel de uma instância de máquina virtual na nuvem é um serviço do tipo

**Alternativas:**
- A) SaaS.
- B) PaaS. <- ❌ Sua resposta
- C) IaaS. <- ✅ Gabarito
- D) BaaS.
- E) TaaS.

**Resolução do Professor:** (sem resolução cadastrada)

---
