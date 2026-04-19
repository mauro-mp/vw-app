/**
 * Seed de FAQ — Fillmore
 *
 * Apaga e reinsere todos os itens de FAQ para cada unidade encontrada no banco.
 * Rodar: npx tsx prisma/seed-faq.ts
 */

import { config as loadDotenv } from "dotenv";
import path from "path";

loadDotenv({ path: path.resolve(process.cwd(), ".env.local") });
loadDotenv({ path: path.resolve(process.cwd(), ".env") });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const faqData: { category: string; question: string; answer: string }[] = [
  // ── Como identificar a mesa/comanda ────────────────────────────────────────
  { category: "Como identificar a mesa/comanda", question: "Como eu informo o número da minha mesa?", answer: "O atendimento via WhatsApp exige a identificação do número da mesa ou comanda." },
  { category: "Como identificar a mesa/comanda", question: "Onde encontro o número da mesa/comanda?", answer: "Normalmente o número está na mesa, no porta-comanda ou informado pela equipe. Se não encontrar, peça ajuda a um atendente." },
  { category: "Como identificar a mesa/comanda", question: "E se a minha mesa não tiver número visível?", answer: "Peça para a equipe informar o número correto ou a comanda associada, e então informe isso no WhatsApp." },
  { category: "Como identificar a mesa/comanda", question: "Posso trocar a mesa depois de iniciar o atendimento no WhatsApp?", answer: "Sim, mas é importante avisar a equipe ou atualizar o número da mesa no WhatsApp para evitar envio de pedidos para a mesa errada." },
  { category: "Como identificar a mesa/comanda", question: "Mais de uma pessoa pode usar o WhatsApp para a mesma mesa?", answer: "Em geral, sim. O ideal é que todos informem o mesmo número de mesa/comanda para centralizar o atendimento." },
  { category: "Como identificar a mesa/comanda", question: "O que fazer se eu informar a mesa errada?", answer: "Avise imediatamente no WhatsApp e chame um atendente para corrigir antes de qualquer preparo/lançamento." },
  { category: "Como identificar a mesa/comanda", question: "O garçom virtual confirma a mesa antes de registrar solicitações?", answer: "Ele pode solicitar confirmação do número informado. Se houver dúvida, a equipe pode validar presencialmente." },
  { category: "Como identificar a mesa/comanda", question: "Se eu mudar de mesa, meu pedido vai junto automaticamente?", answer: "Pode depender do sistema. Para garantir, informe a troca no WhatsApp e/ou à equipe para transferirem a comanda." },
  { category: "Como identificar a mesa/comanda", question: "Como funciona para mesas grandes (várias comandas)?", answer: "Se houver mais de uma comanda, informe no WhatsApp a comanda específica (ou peça orientação à equipe) para evitar lançamentos incorretos." },

  // ── Horários de funcionamento ───────────────────────────────────────────────
  { category: "Horários de funcionamento", question: "Qual é o horário de funcionamento da loja hoje?", answer: "Todos os dias, das 8h às 22h." },
  { category: "Horários de funcionamento", question: "A cozinha tem \"última chamada\"? Qual horário?", answer: "A cozinha aceita pedidos até as 22 horas." },
  { category: "Horários de funcionamento", question: "O bar/bebidas tem \"última chamada\"? Qual horário?", answer: "O bar aceita pedidos até as 22 horas." },
  { category: "Horários de funcionamento", question: "Em feriados, o horário muda?", answer: "Não muda, o horário é mantido exatamente igual." },
  { category: "Horários de funcionamento", question: "O atendimento no salão encerra em qual horário?", answer: "O atendimento de salão para novos pedidos se encerra as 22 horas, mas para outras informações não há limite de horário." },
  { category: "Horários de funcionamento", question: "Existe um horário limite para entrar e sentar?", answer: "Em geral, a entrada é até próximo ao fechamento, mas pode depender da operação do dia. Confirme com a equipe." },
  { category: "Horários de funcionamento", question: "O que acontece se eu estiver no salão próximo do fechamento?", answer: "A equipe pode orientar sobre última chamada e fechamento de conta para encerrar a operação com tranquilidade." },
  { category: "Horários de funcionamento", question: "Onde encontro o horário oficial atualizado?", answer: "Na página do Google da Fillmore." },

  // ── Localização e acesso ───────────────────────────────────────────────────
  { category: "Localização e acesso", question: "Qual é o endereço completo da loja?", answer: "Unidades: Ipiranga (Av. Nazaré, 1732, São Paulo) e Mooca (Av. Paes de Barros, 2468, São Paulo)." },
  { category: "Localização e acesso", question: "Tem estacionamento? É próprio, convênio ou na rua?", answer: "Há valet na porta para maior segurança e conforto. Outras opções de estacionamento podem variar por região." },
  { category: "Localização e acesso", question: "Tem valet? Quais horários e valores?", answer: "Há serviço de valet na porta. Horários e valores podem variar; confirme no local ou pelo WhatsApp." },
  { category: "Localização e acesso", question: "É acessível para cadeira de rodas?", answer: "As unidades são acessíveis e climatizadas." },
  { category: "Localização e acesso", question: "Tem bicicletário?", answer: "Não há informação oficial aqui. Se isso for importante para sua visita, confirme com a equipe antes de ir." },
  { category: "Localização e acesso", question: "Qual o melhor ponto de referência para chegar?", answer: "Use como referência as avenidas onde as unidades ficam localizadas (Ipiranga: Av. Nazaré; Mooca: Av. Paes de Barros). Para orientação mais precisa, consulte um app de mapas." },
  { category: "Localização e acesso", question: "Dá para chegar de transporte público?", answer: "Sim, ambas as regiões possuem acesso por transporte público. Para a melhor rota, consulte um app de mapas." },
  { category: "Localização e acesso", question: "Existe entrada alternativa?", answer: "Somente a entrada principal da loja, ambas com rampas de acessibilidade." },
  { category: "Localização e acesso", question: "Como entrar em contato se eu estiver com dificuldade para encontrar?", answer: "Use o WhatsApp oficial para pedir orientação e informar em qual unidade você está tentando chegar." },

  // ── Formas de pagamento aceitas ────────────────────────────────────────────
  { category: "Formas de pagamento aceitas", question: "Quais formas de pagamento vocês aceitam?", answer: "Aceita PIX (QR Code), débito, crédito e aproximação (NFC)." },
  { category: "Formas de pagamento aceitas", question: "Aceita aproximação (NFC)?", answer: "Sim, aceita aproximação (NFC)." },
  { category: "Formas de pagamento aceitas", question: "Aceita vale-refeição/vale-alimentação? Quais bandeiras?", answer: "Sim, a Fillmore aceitas todos os principais cartões de vale refeição, além de Ticket Alimentação." },
  { category: "Formas de pagamento aceitas", question: "Aceita pagamento na mesa ou é apenas no caixa?", answer: "Aceita pagamento na mesa e no caixa, como o cliente preferir." },
  { category: "Formas de pagamento aceitas", question: "Posso pagar parte em dinheiro e parte no cartão?", answer: "Sim, como preferir." },
  { category: "Formas de pagamento aceitas", question: "Existe valor mínimo para cartão?", answer: "Não há nenhum valor mínimo." },
  { category: "Formas de pagamento aceitas", question: "O pagamento via PIX é feito por QR Code?", answer: "Sim, PIX via QR Code." },
  { category: "Formas de pagamento aceitas", question: "Como funciona se o pagamento falhar?", answer: "Tente novamente ou utilize outra forma de pagamento (cartão/PIX). Se persistir, a equipe ajuda a concluir o pagamento." },
  { category: "Formas de pagamento aceitas", question: "Vocês aceitam pagamento por link?", answer: "Para consumo em loja, não aceitamos pagamento por link." },

  // ── Taxa de serviço e gorjeta ──────────────────────────────────────────────
  { category: "Taxa de serviço e gorjeta", question: "Vocês cobram taxa de serviço?", answer: "Sim. É opcional e pode ser ajustada a pedido do cliente." },
  { category: "Taxa de serviço e gorjeta", question: "A taxa de serviço é opcional? Como pedir para remover/adicionar?", answer: "Sim. Pode ser ajustada a pedido do cliente." },
  { category: "Taxa de serviço e gorjeta", question: "Qual é o percentual da taxa de serviço?", answer: "A taxa de serviço cobrada é de 11%, integralmente repassada a todos os colaboradores do restaurante, não só ao garçom que está prestando o atendimento." },
  { category: "Taxa de serviço e gorjeta", question: "A gorjeta pode ser adicionada além da taxa?", answer: "Sim, com certeza. Basta solicitar a equipe de atendimento." },
  { category: "Taxa de serviço e gorjeta", question: "Como informar um valor de gorjeta diferente?", answer: "Peça à equipe no momento do fechamento para ajustar a taxa/gorjeta conforme sua preferência." },
  { category: "Taxa de serviço e gorjeta", question: "A taxa/gorjeta pode ser dividida proporcionalmente ao dividir a conta?", answer: "Normalmente acompanha a divisão da conta (por itens ou em partes). Se quiser ajustar, solicite à equipe." },
  { category: "Taxa de serviço e gorjeta", question: "A taxa de serviço vale para todos os consumos?", answer: "Em geral, aplica-se ao consumo no salão. Em caso de dúvida, confira na conta e peça orientação à equipe." },
  { category: "Taxa de serviço e gorjeta", question: "Para grupos, existe regra diferente?", answer: "Não há informação oficial aqui. Para grupos, confirme com a equipe se há regras específicas." },

  // ── Política de divisão de conta ──────────────────────────────────────────
  { category: "Política de divisão de conta", question: "Vocês dividem a conta?", answer: "Sim. A conta pode ser dividida por itens ou em partes iguais." },
  { category: "Política de divisão de conta", question: "Dá para dividir por itens (cada um paga o seu) ou apenas em partes iguais?", answer: "Pode dividir por itens ou em partes iguais." },
  { category: "Política de divisão de conta", question: "Existe limite de quantas pessoas/partes para dividir?", answer: "Não há informação oficial aqui. Se houver limite operacional, a equipe orienta no momento do fechamento." },
  { category: "Política de divisão de conta", question: "Posso dividir em mais de um cartão?", answer: "Em geral, é possível usar mais de um meio de pagamento. Confirme com a equipe para organizar a melhor forma." },
  { category: "Política de divisão de conta", question: "Vocês separam a conta por comanda?", answer: "Se houver controle por comanda, a equipe pode orientar a separação. Também é possível dividir por itens ou em partes iguais." },
  { category: "Política de divisão de conta", question: "Como solicito a divisão da conta (antes, durante ou no final)?", answer: "Você pode solicitar no final ao pedir a conta. Em mesas grandes, avisar com antecedência ajuda a agilizar." },
  { category: "Política de divisão de conta", question: "A divisão pode incluir taxa de serviço separada?", answer: "Em geral, sim, acompanhando a divisão da conta. Se precisar de ajuste, solicite à equipe." },
  { category: "Política de divisão de conta", question: "O que acontece se alguém sair antes e quiser pagar antes?", answer: "Peça à equipe para fechar parte do consumo dessa pessoa antes de ela sair, para manter a organização da mesa." },

  // ── Nota fiscal / cupom fiscal ─────────────────────────────────────────────
  { category: "Nota fiscal / cupom fiscal", question: "Vocês emitem nota fiscal/cupom fiscal?", answer: "Sim, emitimos cupom/nota fiscal conforme a legislação. Se você precisar de CPF ou CNPJ na nota, informe no momento do pagamento." },
  { category: "Nota fiscal / cupom fiscal", question: "Como solicito a nota fiscal?", answer: "Solicite ao pedir a conta ou no momento do pagamento, informando os dados necessários (CPF/CNPJ)." },
  { category: "Nota fiscal / cupom fiscal", question: "Precisa informar CPF ou CNPJ?", answer: "Se você quiser a nota vinculada ao seu CPF/CNPJ, sim. Caso contrário, o cupom pode ser emitido sem esses dados, conforme procedimento do caixa." },
  { category: "Nota fiscal / cupom fiscal", question: "Posso informar CPF/CNPJ pelo WhatsApp?", answer: "Preferencialmente, informe no momento do pagamento para garantir a emissão correta. Se você enviar pelo WhatsApp, confirme com a equipe a forma segura de registro." },
  { category: "Nota fiscal / cupom fiscal", question: "A nota sai no nome de pessoa física ou empresa?", answer: "Pode sair como pessoa física (CPF) ou empresa (CNPJ), conforme os dados que você informar." },
  { category: "Nota fiscal / cupom fiscal", question: "A nota é entregue impressa ou digital?", answer: "É entregue impressa, em formato de cupom fiscal." },
  { category: "Nota fiscal / cupom fiscal", question: "Como corrigir dados se eu informar errado?", answer: "Avise imediatamente a equipe no momento do pagamento. Após emitida, correções podem depender do procedimento fiscal aplicável." },
  { category: "Nota fiscal / cupom fiscal", question: "Existe prazo para solicitar a nota depois do pagamento?", answer: "Conseguimos reimprimir cupons emitidos no mesmo dia. Em razão da legislação tributária, não conseguimos retroagir emissões." },
  { category: "Nota fiscal / cupom fiscal", question: "Vocês enviam comprovante pelo WhatsApp?", answer: "Não temos isso como regra, mas se for um pedido excepcional, por favor, contate a equipe de atendimento." },

  // ── Políticas do salão ─────────────────────────────────────────────────────
  { category: "Políticas do salão", question: "Vocês aceitam pets? Em quais áreas e com quais regras?", answer: "Sim, aceitamos pets e temos até um menu exclusivo para eles. Em razão da legislação sanitária, eles devem ficar em espaços indicados, onde não manipulamos alimentos." },
  { category: "Políticas do salão", question: "Precisa manter pet na guia?", answer: "Sim, os pets devem ser mantidos nas guias. Cães de tamanho grande e agressivos deverão ter atenção redobrada por seus tutores responsáveis." },
  { category: "Políticas do salão", question: "Vocês têm cadeirão para bebê?", answer: "Sim, temos cadeirões. Basta solicitar para a equipe de atendimento." },
  { category: "Políticas do salão", question: "Tem fraldário?", answer: "Sim, temos fraldário nos banheiros acessíveis das duas unidades." },
  { category: "Políticas do salão", question: "Vocês têm Wi‑Fi? Qual rede e senha?", answer: "Há disponibilidade de Wi‑Fi. A rede é 'clientes_fillmore' e a senha é 'euamocafe'." },
  { category: "Políticas do salão", question: "Existe limite de uso do Wi‑Fi?", answer: "Não há informação oficial aqui. Use de forma responsável para não impactar outros clientes." },
  { category: "Políticas do salão", question: "É permitido fumar? Apenas área externa?", answer: "Não é permitido fumar em nenhum local do restaurante." },
  { category: "Políticas do salão", question: "Existe dress code?", answer: "Não há informação oficial aqui. O ambiente é moderno e acolhedor; vista-se como se sentir confortável." },
  { category: "Políticas do salão", question: "Posso usar notebook no salão?", answer: "É permitido o uso do espaço para notebook e na maioria das mesas contamos com tomadas de apoio." },
  { category: "Políticas do salão", question: "Existe tempo máximo de permanência em horários de pico?", answer: "Não há tempo máximo, mas há a exigência do consumo de R$ 10,00 por hora de utilização da mesa." },

  // ── Alergias e restrições alimentares ─────────────────────────────────────
  { category: "Alergias e restrições alimentares", question: "Como informo alergias (ex.: glúten, lactose, castanhas)?", answer: "O cliente deve informar alergias graves para que a cozinha seja alertada." },
  { category: "Alergias e restrições alimentares", question: "Vocês conseguem adaptar itens para restrições alimentares?", answer: "Existem opções no cardápio alinhadas a algumas restrições e preferências. Para adaptações específicas, informe a restrição e peça confirmação com a cozinha." },
  { category: "Alergias e restrições alimentares", question: "Há risco de contaminação cruzada?", answer: "Sim. Existe risco de contaminação cruzada." },
  { category: "Alergias e restrições alimentares", question: "O garçom virtual confirma com a cozinha ou chama um humano?", answer: "Para alergias graves e casos sensíveis, o ideal é alertar a cozinha via equipe. O bot pode encaminhar a solicitação para um atendente." },
  { category: "Alergias e restrições alimentares", question: "Posso pedir para remover ingredientes específicos?", answer: "Pode ser possível dependendo do item. Informe a solicitação e confirme com a equipe/cozinha." },
  { category: "Alergias e restrições alimentares", question: "Vocês têm uma lista de alergênicos?", answer: "Não há informação oficial aqui. Para segurança, informe sua alergia e peça confirmação de ingredientes e preparo." },
  { category: "Alergias e restrições alimentares", question: "Como registrar \"sem glúten\"/\"sem lactose\" de forma correta no pedido?", answer: "Informe explicitamente a restrição no WhatsApp e, se for alergia grave, por favor não consuma pois há sim o risco de contaminação cruzada." },
  { category: "Alergias e restrições alimentares", question: "Em caso de alergia grave, qual é o procedimento recomendado?", answer: "Informar alergias graves para que a cozinha seja alertada. Existe risco de contaminação cruzada." },

  // ── Achados e perdidos ────────────────────────────────────────────────────
  { category: "Achados e perdidos", question: "Perdi um objeto na loja: como eu verifico se foi encontrado?", answer: "Avise a equipe no local ou chame pelo WhatsApp informando unidade, data/horário aproximado e onde estava sentado. A equipe verifica com o time do salão." },
  { category: "Achados e perdidos", question: "Quais informações preciso enviar para localizar?", answer: "Unidade, data/horário, número da mesa (se souber) e descrição do item." },
  { category: "Achados e perdidos", question: "Por quanto tempo vocês guardam objetos perdidos?", answer: "A Fillmore guarda o objeto por até 30 dias, sendo que após isso, o encaminha para doações." },
  { category: "Achados e perdidos", question: "Onde faço a retirada?", answer: "Na própria unidade, em horário de funcionamento, após confirmação com a equipe." },
  { category: "Achados e perdidos", question: "Vocês enviam por motoboy/correio?", answer: "Não há informação oficial aqui. Se necessário, combine diretamente com a unidade (custos e responsabilidade podem ser do cliente)." },
  { category: "Achados e perdidos", question: "Documentos (RG, cartão) têm procedimento especial?", answer: "Em geral, documentos são guardados com cuidado e exigem confirmação de identidade na retirada. Confirme com a unidade." },
  { category: "Achados e perdidos", question: "Como confirmar se o item realmente é meu?", answer: "Descreva características únicas do objeto e apresente documento/identificação quando necessário." },

  // ── Preferências alimentares e estilo de vida ──────────────────────────────
  { category: "Preferências alimentares e estilo de vida", question: "Vocês têm opções sem glúten?", answer: "Sim. Há opções sem glúten, por exemplo doces com farinha de amêndoas. Existe risco de contaminação cruzada." },
  { category: "Preferências alimentares e estilo de vida", question: "Vocês têm opções sem lactose?", answer: "O cardápio inclui opções funcionais e com ajustes (ex.: menos açúcar). Para opções sem lactose específicas, confirme com a equipe e informe sua restrição." },
  { category: "Preferências alimentares e estilo de vida", question: "Vocês têm opções veganas?", answer: "Sim. O cardápio inclui opções veganas." },
  { category: "Preferências alimentares e estilo de vida", question: "O que vocês consideram \"opções saudáveis\" aqui?", answer: "O cardápio inclui opções funcionais e com menos açúcar." },
  { category: "Preferências alimentares e estilo de vida", question: "Como eu peço para ver apenas opções dessas categorias?", answer: "Diga no WhatsApp sua preferência (ex.: \"vegano\", \"sem glúten\", \"menos açúcar\") e peça sugestões. Para segurança, confirme ingredientes e preparo." },
  { category: "Preferências alimentares e estilo de vida", question: "Os itens \"sem glúten/sem lactose/veganos\" são 100% garantidos?", answer: "Existe risco de contaminação cruzada. Para alergias graves, o cliente deve informar para que a cozinha seja alertada." },
  { category: "Preferências alimentares e estilo de vida", question: "Existe risco de contaminação cruzada nessas opções?", answer: "Sim. Existe risco de contaminação cruzada." },
  { category: "Preferências alimentares e estilo de vida", question: "Como confirmar ingredientes e modo de preparo?", answer: "Informe sua restrição e peça para confirmar com a cozinha. Para alergias graves, solicite que a cozinha seja alertada." },
  { category: "Preferências alimentares e estilo de vida", question: "O garçom virtual consegue recomendar opções por preferência?", answer: "Sim, você pode informar suas preferências (ex.: vegano, menos açúcar, sem glúten) e pedir sugestões. Para restrições severas, confirme com a equipe/cozinha." },

  // ── Reservas, ocupação e eventos (Get In) ──────────────────────────────────
  { category: "Reservas, ocupação e eventos (Get In)", question: "Vocês aceitam reservas de mesa?", answer: "Sim. Reservas podem ser feitas via sistema Get In." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Como faço uma reserva (Get In)? Onde está o link oficial?", answer: "As reservas são feitas pelo Get In: https://www.getin.app/sao-paulo/fillmore" },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Com quanta antecedência posso reservar?", answer: "Até 3 horas antes de ir para loja." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Existe reserva para grupos?", answer: "Sim, é possível reservar mesas e também espaços para eventos. Para grupos, consulte disponibilidade e condições via Get In/WhatsApp." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Vocês reservam espaço para eventos?", answer: "Sim. Há áreas reservadas para eventos e reuniões, e reservas podem ser feitas via Get In." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Quais horários/dias são permitidos para eventos?", answer: "Depende da disponibilidade da unidade e da operação do dia. Consulte a unidade pelo WhatsApp." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Existe consumo mínimo/pacote para evento?", answer: "Não há informação oficial aqui. Para eventos, condições podem variar; solicite proposta à equipe." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Qual política de cancelamento/remarcação de reservas/eventos?", answer: "Não há informação oficial aqui. Consulte as regras no Get In e confirme com a equipe." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Para eventos, é necessário sinal/depósito?", answer: "Não há informação oficial aqui. Pode haver sinal dependendo do formato do evento; confirme ao solicitar a reserva." },
  { category: "Reservas, ocupação e eventos (Get In)", question: "Quem eu chamo para negociar detalhes de evento?", answer: "Use o WhatsApp da unidade para ser direcionado ao responsável por eventos/reuniões." },

  // ── Encomendas e produtos especiais ───────────────────────────────────────
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Vocês fazem encomenda de sobremesas inteiras?", answer: "Sim, aceitamos encomendas de sobremesas inteiras mediante disponibilidade e antecedência. Consulte a unidade pelo WhatsApp para opções e prazos." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Quais tamanhos/formatos de sobremesa inteira existem?", answer: "Varia conforme a sobremesa e a unidade. Consulte pelo WhatsApp para opções disponíveis no dia e tamanhos." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Qual a antecedência mínima para encomendar?", answer: "Depende da sobremesa e da agenda da confeitaria. Recomenda-se solicitar com antecedência e confirmar prazos pelo WhatsApp." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Posso personalizar (nome, mensagem, decoração)?", answer: "Algumas personalizações podem ser possíveis. Envie sua solicitação pelo WhatsApp para confirmação com a confeitaria." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Como é feito o pagamento da encomenda? Precisa de sinal?", answer: "Pode haver pagamento antecipado e/ou sinal para garantir a produção. Confirme as condições no momento do pedido pelo WhatsApp." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Qual política de cancelamento e alterações de encomenda?", answer: "Cancelamentos e alterações dependem do estágio de produção. Para evitar custos, avise o quanto antes e confirme a política com a unidade." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "A retirada é em quais horários?", answer: "Dentro do horário de funcionamento da unidade, com agendamento prévio da retirada. Confirme no WhatsApp." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Vocês entregam ou é somente retirada?", answer: "Não há informação oficial aqui. Confirme com a unidade se há entrega disponível para encomendas ou apenas retirada." },
  { category: "Encomendas e produtos especiais (sobremesas inteiras)", question: "Como armazenar/transportar a sobremesa após retirar?", answer: "Transporte na embalagem original, mantenha em superfície plana e evite calor. Se a sobremesa exigir refrigeração, leve para geladeira o quanto antes." },

  // ── Celebrações na loja (aniversário) ─────────────────────────────────────
  { category: "Celebrações na loja (aniversário)", question: "Posso comemorar aniversário na loja?", answer: "Sim, é possível e inclusive oferecemos uma sobremesa cortesia para o aniversariante da mesa." },
  { category: "Celebrações na loja (aniversário)", question: "Precisa reservar mesa/avisar com antecedência?", answer: "Recomenda-se avisar com antecedência. Se desejar garantir mesa ou espaço, utilize o Get In conforme disponibilidade." },
  { category: "Celebrações na loja (aniversário)", question: "Vocês permitem decoração? O que é permitido e o que não é?", answer: "Confirme antes com a equipe ou por WhatsApp." },
  { category: "Celebrações na loja (aniversário)", question: "Posso levar bolo?", answer: "Não é permitida a entrada de bolos, doces ou bebidas de fora. Exceção geralmente aplicada: alimentos infantis, como papinhas." },
  { category: "Celebrações na loja (aniversário)", question: "Posso levar docinhos/bebidas de fora?", answer: "Não. Não é permitida a entrada de bolos, doces ou bebidas de fora (com exceção geralmente aplicada para alimentos infantis, como papinhas)." },
  { category: "Celebrações na loja (aniversário)", question: "Vocês fornecem vela/prato/faca para bolo?", answer: "Sim, oferecemos." },
  { category: "Celebrações na loja (aniversário)", question: "Pode cantar parabéns? Existe regra de horário/volume?", answer: "Claro que pode!" },
  { category: "Celebrações na loja (aniversário)", question: "Existe taxa para comemoração/aniversário?", answer: "Não há taxa nenhuma. Só recomendamos reserva antecipada para garantir o conforto dos convidados." },
  { category: "Celebrações na loja (aniversário)", question: "Qual o procedimento ideal para organizar sem atrapalhar o salão?", answer: "Avise com antecedência, chegue no horário combinado e siga as orientações da equipe sobre espaço, circulação e volume." },

  // ── Uso do espaço para conteúdo e mídia ───────────────────────────────────
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Posso fazer sessão de fotos na loja?", answer: "Ensaios profissionais exigem autorização prévia e podem estar sujeitos a taxas ou horários restritos. Consulte a loja pelo WhatsApp." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Preciso de autorização prévia?", answer: "Sim. Ensaios profissionais exigem autorização prévia." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Quais dias/horários são permitidos?", answer: "Pode haver horários restritos para não impactar a operação. Solicite autorização e confirme disponibilidade com a equipe." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Posso usar flash, tripé e iluminação?", answer: "Em ensaios profissionais, regras podem existir para segurança e circulação. Confirme no pedido de autorização." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Existe taxa para sessão fotográfica?", answer: "Pode estar sujeita a taxas ou permutas. Consulte a loja por WhatsApp." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Posso fotografar/filmar outras pessoas no salão?", answer: "Evite filmar outros clientes. Priorize enquadramentos no seu grupo e no ambiente, respeitando privacidade e orientações da equipe." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Quais áreas podem ser usadas para fotos?", answer: "Depende do fluxo do salão e das áreas permitidas no dia. A equipe orienta as áreas adequadas no momento da autorização." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Quantas pessoas/equipamentos são permitidos?", answer: "Depende da autorização e do impacto na operação. Informe equipe e equipamentos ao solicitar." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "O que acontece se a sessão atrapalhar o atendimento?", answer: "A equipe pode solicitar ajustes, mudança de local ou encerramento para manter a experiência de todos os clientes." },
  { category: "Uso do espaço para conteúdo e mídia (sessões fotográficas)", question: "Para fotos comerciais/profissionais, quem aprova?", answer: "Solicite via WhatsApp e a equipe direciona para o responsável pela autorização." },

  // ── Política de itens externos ────────────────────────────────────────────
  { category: "Política de itens externos", question: "Posso trazer bolo/doces de fora?", answer: "Não é permitida a entrada de bolos e doces de fora. Exceção geralmente aplicada: alimentos infantis, como papinhas." },
  { category: "Política de itens externos", question: "Posso trazer bebidas de fora?", answer: "Não é permitida a entrada de bebidas de fora." },
  { category: "Política de itens externos", question: "Posso trazer alimentos para crianças (ex.: papinha)?", answer: "Sim. A única exceção geralmente aplicada é para alimentos infantis, como papinhas." },
  { category: "Política de itens externos", question: "Existe alguma exceção para restrições alimentares?", answer: "Não há informação oficial aqui. Se houver necessidade médica, fale com a equipe antes para avaliar uma exceção caso a caso." },
  { category: "Política de itens externos", question: "Por que a loja não permite itens externos?", answer: "Para manter padrão de qualidade, segurança alimentar e experiência consistente para todos no salão." },
  { category: "Política de itens externos", question: "O que acontece se eu chegar com item de fora?", answer: "A equipe orientará a política e poderá pedir para não consumir o item no salão." },
  { category: "Política de itens externos", question: "Posso consumir item externo na área externa?", answer: "A regra padrão é não permitir entrada/consumo; confirme com a equipe." },
  { category: "Política de itens externos", question: "Como peço autorização em casos especiais?", answer: "Fale com a equipe pelo WhatsApp ou presencialmente antes de entrar com o item para avaliar exceções." },

  // ── Trabalhar na loja / política de permanência ───────────────────────────
  { category: "Trabalhar na loja / política de permanência", question: "Posso trabalhar/estudar na loja?", answer: "Sim. É permitido o uso do espaço para notebook." },
  { category: "Trabalhar na loja / política de permanência", question: "Existe consumo mínimo por tempo de permanência?", answer: "Sim. Vigora consumo mínimo de R$ 10,00 por hora de permanência por pessoa." },
  { category: "Trabalhar na loja / política de permanência", question: "Como funciona o consumo mínimo de R$ 10,00 por hora?", answer: "Consumo mínimo de R$ 10,00 por hora de permanência por pessoa." },
  { category: "Trabalhar na loja / política de permanência", question: "A contagem é por pessoa ou por mesa?", answer: "Por pessoa." },
  { category: "Trabalhar na loja / política de permanência", question: "Existe tolerância/intervalo de tempo (ex.: primeira hora)?", answer: "Não há informação oficial aqui. Para evitar dúvida, considere a regra válida desde o início da permanência." },
  { category: "Trabalhar na loja / política de permanência", question: "Em quais horários essa política vale (pico vs. fora de pico)?", answer: "Não há informação oficial aqui. Na ausência de exceções publicadas, considere que a política pode valer durante todo o funcionamento." },
  { category: "Trabalhar na loja / política de permanência", question: "Posso ficar várias horas seguidas? Como é calculado?", answer: "Sim, respeitando o consumo mínimo por hora por pessoa. O total acompanha o tempo de permanência." },
  { category: "Trabalhar na loja / política de permanência", question: "Vocês têm tomadas disponíveis?", answer: "Há tomadas espalhadas pela casa." },
  { category: "Trabalhar na loja / política de permanência", question: "Existe regra de volume (reuniões, chamadas)?", answer: "Reuniões e chamadas devem respeitar regras de volume para não incomodar outros clientes." },
  { category: "Trabalhar na loja / política de permanência", question: "O que acontece se eu não atingir o consumo mínimo?", answer: "A equipe pode orientar a complementar o consumo para adequação à política do espaço." },

  // ── Conceito da casa ──────────────────────────────────────────────────────
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "O que significa \"proposta inspirada em NYC\"?", answer: "A proposta é que você encontre uma experiência de menu e de ambiente similar ao que encontraria nos principais coffeeshops de NYC, adaptado com um toque de brasilidade." },
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "Qual é a experiência que vocês querem entregar com esse conceito?", answer: "Preencher a vida dos clientes com experiências gastronômicas superiores, com excelente relação custo x benefício, em um ambiente moderno com produtos artesanais de preços acessíveis." },
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "Isso impacta o serviço/ambiente de que forma?", answer: "Um espaço multifuncional e diferenciado, que pode servir de café da manhã a happy hour e acomodar diferentes necessidades (trabalho, família, pet, comemorações), mantendo estilo inspirado em Nova York." },
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "Existe alguma regra de convivência ligada ao conceito?", answer: "As principais regras são as políticas de convivência da casa (ex.: consumo mínimo para notebook e respeito a volume em chamadas), para manter a experiência de todos." },
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "Vocês têm um \"manifesto\"/texto institucional sobre a proposta?", answer: "Sim: a identidade se baseia no conceito de \"Eatery\" inspirado em NYC com brasilidade, com foco em excelência, honestidade, trabalho duro e custo x benefício." },
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "Qual é o melhor horário para vivenciar a experiência completa?", answer: "A proposta cobre qualquer momento do dia, do café da manhã ao happy hour. Escolha o horário conforme a experiência desejada." },
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "A casa tem alguma história/origem ligada a NYC?", answer: "O conceito é inspirado nos coffeeshops de Nova York, adaptado com brasilidade. A marca surgiu em 25 de janeiro de 2020, no aniversário de São Paulo, inicialmente focada em cafeteria e confeitaria americana." },
  { category: "Conceito da casa e posicionamento (\"proposta inspirada em NYC\")", question: "O conceito influencia eventos e sessões de fotos?", answer: "Indiretamente, sim: por ser um espaço multifuncional e com identidade forte, pode ser usado para eventos e conteúdo, respeitando as políticas de autorização e operação do salão." },
];

async function main() {
  const units = await prisma.unit.findMany({ select: { id: true, name: true } });

  if (units.length === 0) {
    console.error("Nenhuma unidade encontrada. Rode o seed principal primeiro.");
    process.exit(1);
  }

  for (const unit of units) {
    console.log(`\n→ Unidade: ${unit.name}`);

    // Apaga FAQs existentes da unidade para evitar duplicatas
    const deleted = await prisma.fAQItem.deleteMany({ where: { unitId: unit.id } });
    console.log(`  Removidos ${deleted.count} itens existentes.`);

    // Calcula sortOrder por categoria
    const sortCounters: Record<string, number> = {};
    const data = faqData.map((item) => {
      sortCounters[item.category] = (sortCounters[item.category] ?? 0) + 1;
      return {
        unitId: unit.id,
        category: item.category,
        question: item.question,
        answer: item.answer,
        sortOrder: sortCounters[item.category],
        isPublished: true,
      };
    });

    await prisma.fAQItem.createMany({ data });
    console.log(`  Inseridos ${data.length} itens de FAQ.`);
  }

  console.log("\n✓ FAQ seed concluído.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
