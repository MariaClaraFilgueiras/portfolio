/* =========================================================
   IDIOMAS DO PORTFÓLIO: português (original), inglês e espanhol

   Como funciona: cada texto do site em português é a "chave".
   Ao trocar de idioma, o script procura essa chave aqui e troca
   pelo texto em inglês [0] ou em espanhol [1]. Voltando para PT,
   o texto original volta.

   Mudou um texto no site? Atualize a chave aqui também (o texto
   em português precisa ficar igualzinho ao do site).
   ========================================================= */
(function () {
  "use strict";

  var T = {
    // Menu e capa
    "Pular para o conteúdo": ["Skip to content", "Saltar al contenido"],
    "Sobre": ["About", "Sobre mí"],
    "Trabalhos": ["Work", "Trabajos"],
    "Como funciona": ["How it works", "Cómo funciona"],
    "Feedbacks": ["Feedback", "Opiniones"],
    "Trabalhe comigo": ["Work with me", "Trabaja conmigo"],
    "UGC Creator · São Paulo · Agenda aberta": ["UGC Creator · São Paulo · Now booking", "UGC Creator · São Paulo · Agenda abierta"],
    "Conteúdo real que": ["Real content that", "Contenido real que"],
    "conecta": ["connects", "conecta"],
    "e vende": ["and sells", "y vende"],
    "Sou a Maria Clara Filgueiras. Crio conteúdos com estratégia e autenticidade para a sua marca vender mais e conectar de verdade com o cliente ideal.": [
      "I'm Maria Clara Filgueiras. I create strategic, authentic content that helps your brand sell more and truly connect with its ideal customer.",
      "Soy Maria Clara Filgueiras. Creo contenidos con estrategia y autenticidad para que tu marca venda más y conecte de verdad con su cliente ideal."],
    "15 marcas parceiras": ["15 partner brands", "15 marcas aliadas"],
    "+100 marcas trabalhadas": ["100+ brands worked with", "+100 marcas trabajadas"],
    "+2MI views no Instagram": ["2M+ views on Instagram", "+2 M de views en Instagram"],
    "10 nichos": ["10 niches", "10 nichos"],
    "4 anos de marketing": ["4 years in marketing", "4 años de marketing"],
    "Quero criar com a Maria Clara": ["Create with Maria Clara", "Quiero crear con Maria Clara"],
    "Saiba mais →": ["Learn more →", "Saber más →"],
    "Roteiro aprovado": ["Script approved", "Guion aprobado"],
    "antes de gravar": ["before filming", "antes de grabar"],
    "Entrega em até 72h úteis": ["Delivery within 72 business hours", "Entrega en hasta 72 h hábiles"],
    "com uma alteração inclusa": ["with one revision included", "con un ajuste incluido"],
    "“Está em 15 centavos o clique, maravilhoso”": ["“It's at 15 cents per click, wonderful”", "“Está en 15 centavos por clic, maravilloso”"],
    "feedback de cliente": ["client feedback", "opinión de cliente"],
    "Vídeo UGC": ["UGC video", "Video UGC"],
    "Roteiros estratégicos": ["Strategic scripts", "Guiones estratégicos"],
    "Criativos para anúncio": ["Ad creatives", "Creativos para anuncios"],
    "Fotos do produto": ["Product photos", "Fotos del producto"],
    "Conteúdo para e-commerce": ["E-commerce content", "Contenido para e-commerce"],
    "Publicação no perfil": ["Posting on my profile", "Publicación en mi perfil"],
    "Marcas parceiras": ["Partner brands", "Marcas aliadas"],
    "Nichos atendidos": ["Niches served", "Nichos atendidos"],
    "De marketing digital": ["In digital marketing", "De marketing digital"],
    "Prazo de entrega": ["Delivery time", "Plazo de entrega"],

    // Sobre
    "Hey ... muito prazer !": ["Hey ... nice to meet you!", "¡Hey ... mucho gusto!"],
    "Sou uma maranhense inquieta que veio para São Paulo estudar. Trabalho com marketing digital há mais de 3 anos, onde atuo como": [
      "I'm a restless girl from Maranhão who moved to São Paulo to study. I've been working in digital marketing for over 3 years as a",
      "Soy una maranhense inquieta que llegó a São Paulo para estudiar. Trabajo en marketing digital hace más de 3 años, donde actúo como"],
    "e": ["and", "y"],
    ". Tenho Pós-Graduação em": [". I hold a postgraduate degree in", ". Tengo un posgrado en"],
    "Moda e Negócios": ["Fashion and Business", "Moda y Negocios"],
    ", e sou apaixonada por criar conteúdos reais, com estratégia e autenticidade.": [
      ", and I'm passionate about creating real content with strategy and authenticity.",
      ", y me apasiona crear contenidos reales, con estrategia y autenticidad."],
    "Hoje, como UGC Creator,": ["Today, as a UGC Creator,", "Hoy, como UGC Creator,"],
    "quero realçar as qualidades e diferenciais da sua marca, e posicioná-la da forma certa, tanto para vender mais, como para conectar com o cliente ideal.": [
      "I want to highlight your brand's strengths and differentiators, and position it the right way, both to sell more and to connect with the ideal customer.",
      "quiero resaltar las cualidades y diferenciales de tu marca, y posicionarla de la forma correcta, tanto para vender más como para conectar con el cliente ideal."],
    "O sucesso de quem trabalha comigo consiste na minha realização enquanto profissional.": [
      "The success of those who work with me is my fulfillment as a professional.",
      "El éxito de quienes trabajan conmigo es mi realización como profesional."],
    "Marcas que confiam no meu trabalho": ["Brands that trust my work", "Marcas que confían en mi trabajo"],

    // Conteúdo destaque
    "Conteúdo": ["Featured", "Contenido"],
    "destaque": ["content", "destacado"],
    "A": ["The", "La"],
    "estratégia": ["strategy", "estrategia"],
    "para um conteúdo UGC de sucesso, é fazer um": ["behind successful UGC content is a", "para un contenido UGC exitoso es hacer un"],
    "bom roteiro": ["good script", "buen guion"],
    ". A depender de onde será publicado, seja no": [". Depending on where it will be published, whether on", ". Según dónde se publique, ya sea en"],
    "Instagram, Tik Tok, Ads, ou E-commerce": ["Instagram, TikTok, Ads or E-commerce", "Instagram, TikTok, Ads o E-commerce"],
    ", a": [", the", ", el"],
    "linguagem precisa ser diferente": ["language has to be different", "lenguaje tiene que ser diferente"],
    "para cumprir seu objetivo, seja o de": ["to meet its goal, whether that's to", "para cumplir su objetivo, ya sea"],
    "educar, gerar conexão ou conversão.": ["educate, build connection or drive conversion.", "educar, generar conexión o conversión."],
    "Os conteúdos ao lado foram feitos para": ["The videos alongside were made for", "Los contenidos de al lado se hicieron para"],
    ", visando o que cada cliente queria, mostrar que existem outros tipos de cerveja sem álcool, além da tradicional verdinha, e avisar à todos os paulistas que a melhor kombucha já está disponível em São Paulo.": [
      ", focused on what each client wanted: showing that there are other kinds of alcohol-free beer beyond the classic green bottle, and letting everyone in São Paulo know that the best kombucha is now available in the city.",
      ", según lo que cada cliente quería: mostrar que existen otros tipos de cerveza sin alcohol además de la clásica botella verde, y avisar a todos en São Paulo que la mejor kombucha ya está disponible en la ciudad."],
    "capa 9:16": ["cover 9:16", "portada 9:16"],
    "Cerveja sem álcool": ["Alcohol-free beer", "Cerveza sin alcohol"],
    "Assistir ao vídeo (abre em nova aba)": ["Watch the video (opens in a new tab)", "Ver el video (se abre en una nueva pestaña)"],
    "Kombucha em São Paulo": ["Kombucha in São Paulo", "Kombucha en São Paulo"],

    // Trabalhos por nicho
    "Categorias": ["Categories", "Categorías"],
    "Que tipo de": ["What kind of", "¿Qué tipo de"],
    "conteúdo": ["content", "contenido"],
    "você precisa?": ["do you need?", "necesitas?"],
    "Navegue pelos nichos. Cada linha é uma especialidade: deslize pro lado para ver mais.": [
      "Browse the niches. Each row is a specialty: swipe sideways to see more.",
      "Explora los nichos. Cada fila es una especialidad: desliza hacia el lado para ver más."],
    "Todos": ["All", "Todos"],
    "Selfcare": ["Self-care", "Autocuidado"],
    "Moda": ["Fashion", "Moda"],
    "Beleza": ["Beauty", "Belleza"],
    "Fitness e nutrição": ["Fitness and nutrition", "Fitness y nutrición"],
    "Arte e cultura": ["Art and culture", "Arte y cultura"],
    "Casa e decoração": ["Home and decor", "Hogar y decoración"],
    "Empreendedorismo e negócios": ["Entrepreneurship and business", "Emprendimiento y negocios"],
    "Papelaria": ["Stationery", "Papelería"],
    "Gastronomia": ["Food", "Gastronomía"],
    "Diversos": ["Miscellaneous", "Varios"],
    "vídeos": ["videos", "videos"],
    "Skincare, bodycare, haircare e saúde íntima": ["Skincare, bodycare, haircare and intimate health", "Skincare, bodycare, haircare y salud íntima"],
    "Depoimento": ["Testimonial", "Testimonio"],
    "Experiência": ["Experience", "Experiencia"],
    "Saúde íntima": ["Intimate health", "Salud íntima"],
    "Outfits que contam história": ["Outfits that tell a story", "Outfits que cuentan historias"],
    "Roupas": ["Clothing", "Ropa"],
    "Bolsa": ["Handbag", "Bolso"],
    "Moda fitness": ["Activewear", "Moda fitness"],
    "Data especial": ["Special occasion", "Fecha especial"],
    "Acessórios": ["Accessories", "Accesorios"],
    "Produtos que viram ritual": ["Products that become a ritual", "Productos que se vuelven ritual"],
    "Unboxing e experiência": ["Unboxing and experience", "Unboxing y experiencia"],
    "Alinhador dos fios": ["Hair smoothing treatment", "Alisador del cabello"],
    "Maquiagem": ["Makeup", "Maquillaje"],
    "Alimentação e suplementos que viram rotina": ["Food and supplements that become routine", "Alimentación y suplementos que se vuelven rutina"],
    "Depoimento e educativo": ["Testimonial and educational", "Testimonio y educativo"],
    "Depoimento e experiência": ["Testimonial and experience", "Testimonio y experiencia"],
    "Experiência e depoimento": ["Experience and testimonial", "Experiencia y testimonio"],
    "Literatura, arquitetura, passeios e cinema": ["Literature, architecture, outings and cinema", "Literatura, arquitectura, paseos y cine"],
    "Livros": ["Books", "Libros"],
    "Passeio cultural": ["Cultural outing", "Paseo cultural"],
    "Cinema": ["Cinema", "Cine"],
    "Ambientes que inspiram": ["Spaces that inspire", "Ambientes que inspiran"],
    "Cozinha": ["Kitchen", "Cocina"],
    "Decoração": ["Decor", "Decoración"],
    "Tutorial e experiência": ["Tutorial and experience", "Tutorial y experiencia"],
    "Cama": ["Bedding", "Ropa de cama"],
    "Espaço físico, imobiliária, educação e cursos": ["Physical spaces, real estate, education and courses", "Espacios físicos, inmobiliaria, educación y cursos"],
    "Concurso público": ["Civil service exam prep", "Oposiciones"],
    "Aplicativo": ["App", "Aplicación"],
    "Serviço jurídico": ["Legal services", "Servicios jurídicos"],
    "Cadernos e acessórios": ["Notebooks and accessories", "Cuadernos y accesorios"],
    "Depoimento e modo de usar": ["Testimonial and how to use", "Testimonio y modo de uso"],
    "Cadernos": ["Notebooks", "Cuadernos"],
    "Papelaria cristã": ["Christian stationery", "Papelería cristiana"],
    "Comida que dá água na boca": ["Mouth-watering food", "Comida que hace agua la boca"],
    "Restaurante": ["Restaurant", "Restaurante"],
    "Receita": ["Recipe", "Receta"],
    "Supermercado": ["Supermarket", "Supermercado"],
    "Pet, saúde, aplicativos e locais físicos": ["Pets, health, apps and physical locations", "Mascotas, salud, aplicaciones y locales físicos"],
    "Pet": ["Pets", "Mascotas"],
    "Locais físicos": ["Physical locations", "Locales físicos"],
    "Educativo": ["Educational", "Educativo"],
    "Garrafa térmica": ["Thermos", "Termo"],
    "Tratamento odontológico": ["Dental treatment", "Tratamiento odontológico"],
    "Depoimento e ADS": ["Testimonial and ADS", "Testimonio y ADS"],
    "Saúde mental": ["Mental health", "Salud mental"],
    "Outros": ["Other", "Otros"],

    // Galeria e feedbacks
    "Galeria de fotos": ["Photo gallery", "Galería de fotos"],
    "\"Fotos que comunicam o seu produto da maneira certa, ganha o coração do cliente”": [
      "\"Photos that show your product the right way win the customer's heart”",
      "\"Las fotos que comunican tu producto de la manera correcta conquistan el corazón del cliente”"],
    "Cinco estrelas": ["Five stars", "Cinco estrellas"],

    // O que está incluso
    "O que está incluso": ["What's included", "Qué incluye"],
    "Alinhamento": ["Alignment", "Alineación"],
    "Compreensão das necessidades das suas necessidades como marca": ["Understanding your needs as a brand", "Comprender tus necesidades como marca"],
    "Primeiro passo é alinhar os objetivos através de um estudo aprofundado, para entender as reais necessidades da sua marca. Isso inclui compreensão do público alvo para poder focar em conteúdos mais estratégicos.": [
      "The first step is to align goals through an in-depth study to understand your brand's real needs. This includes understanding the target audience so we can focus on more strategic content.",
      "El primer paso es alinear los objetivos a través de un estudio profundo, para entender las necesidades reales de tu marca. Esto incluye comprender al público objetivo para enfocarnos en contenidos más estratégicos."],
    "Estratégia": ["Strategy", "Estrategia"],
    "Estratégia exclusiva de acordo com as necessidades previamente ditas": ["Exclusive strategy based on the needs discussed", "Estrategia exclusiva según las necesidades conversadas"],
    "Estratégia de roteiros totalmente personalizados que serão criados para a sua marca, baseado nas informações colhidas e estudadas previamente. Esse roteiro será enviado para aprovação.": [
      "Fully customized scripts created for your brand, based on the information gathered and studied beforehand. The script is sent to you for approval.",
      "Guiones totalmente personalizados creados para tu marca, basados en la información recopilada y estudiada previamente. El guion se envía para tu aprobación."],
    "Gravação + Edição": ["Filming + Editing", "Grabación + Edición"],
    "Mão na massa": ["Hands on", "Manos a la obra"],
    "Aqui é onde a mágica acontece, por meio da criação de vídeos de 30s a 60s, juntamente com outros materiais que foram acordados previamente.": [
      "This is where the magic happens: creating 30 to 60 second videos, along with any other materials agreed upon beforehand.",
      "Aquí es donde ocurre la magia: la creación de videos de 30 a 60 segundos, junto con otros materiales acordados previamente."],
    "Envio para aprovação": ["Sent for approval", "Envío para aprobación"],
    "Envio dos materiais assim que concluídos para aprovação": ["Materials sent for approval as soon as they're done", "Envío de los materiales para aprobación apenas estén listos"],
    "Assim que os materiais solicitados estiverem prontos, serão enviados para aprovação com marca d’água. Podendo ser feita até uma alteração por vídeo.": [
      "As soon as the requested materials are ready, they're sent for approval with a watermark. One revision per video is included.",
      "Apenas los materiales solicitados estén listos, se envían para aprobación con marca de agua. Se puede hacer un ajuste por video."],
    "Pagamento": ["Payment", "Pago"],
    "Após a aprovação final": ["After final approval", "Después de la aprobación final"],
    "O pagamento deve ser feito para a conta previamente dita no contrato, assim como o envio da nota fiscal para o CNPJ informado pela marca.": [
      "Payment is made to the account stated in the contract, and the invoice is issued to the company registration number provided by the brand.",
      "El pago se realiza a la cuenta indicada en el contrato, junto con la emisión de la factura a nombre de la empresa indicada por la marca."],
    "Envio final": ["Final delivery", "Entrega final"],
    "Sucesso com a parceria": ["A successful partnership", "Éxito en la alianza"],
    "Todos os conteúdos são enviados para a marca, podendo usá-los em tráfego pago, pelos meses pré-determinados no contrato, assim como redes sociais, sites e catálogos.": [
      "All content is delivered to the brand, which can use it in paid ads for the months set in the contract, as well as on social media, websites and catalogs.",
      "Todo el contenido se entrega a la marca, que puede usarlo en anuncios pagados durante los meses definidos en el contrato, además de redes sociales, sitios web y catálogos."],

    // Processo criativo
    "Processo criativo": ["Creative process", "Proceso creativo"],
    "Penso, em todos os detalhes antes de começar a produzir:": ["I think through every detail before I start producing:", "Pienso en todos los detalles antes de empezar a producir:"],
    "Como posso ser porta-voz da marca: Faço um briefing para entender os valores, diferenciais, tom de voz, formato de conteúdo, como se posiciona, qual mensagem quer passar, entre outros.": [
      "How I can be the brand's voice: I run a briefing to understand its values, differentiators, tone of voice, content format, positioning, the message it wants to convey, and more.",
      "Cómo puedo ser la voz de la marca: hago un briefing para entender sus valores, diferenciales, tono de voz, formato de contenido, cómo se posiciona, qué mensaje quiere transmitir, entre otros."],
    "Monto uma estrutura visual, entendendo o posicionamento da marca e harmonizando desde o cabelo, make, roupa, até o tom da unha.": [
      "I build a visual structure that fits the brand's positioning, harmonizing everything from hair, makeup and outfit to nail color.",
      "Armo una estructura visual entendiendo el posicionamiento de la marca y armonizando desde el cabello, el maquillaje y la ropa hasta el tono de las uñas."],
    "Quero que você tenha a melhor experiência possível, por isso me preocupo em conectar a sua marca com o seu público por meio da minha narrativa, trazendo pontos de identificação, ou até mesmo possibilidade de explorar novos oceanos azuis.": [
      "I want you to have the best possible experience, so I make sure to connect your brand with your audience through my storytelling, bringing relatable moments or even the chance to explore new blue oceans.",
      "Quiero que tengas la mejor experiencia posible, por eso me preocupo por conectar tu marca con tu público a través de mi narrativa, aportando puntos de identificación o incluso la posibilidad de explorar nuevos océanos azules."],

    // Mercado de UGC
    "UGC é o novo mercado mais lucrativo": ["UGC is the new most profitable market", "El UGC es el nuevo mercado más rentable"],
    "“O UGC é o cliente que sua marca quer alcançar”": ["“UGC is the customer your brand wants to reach”", "“El UGC es el cliente que tu marca quiere alcanzar”"],
    "O conteúdo UGC é aquele que conversa com o cliente da sua marca, mostrando a experiência do produto/ serviço por meio de uma narrativa que não só conecta, mas converte.": [
      "UGC is content that speaks to your brand's customer, showing the experience of the product or service through a story that doesn't just connect, it converts.",
      "El contenido UGC es el que conversa con el cliente de tu marca, mostrando la experiencia del producto o servicio a través de una narrativa que no solo conecta, sino que convierte."],
    "Fonte: Valor Econômico. (Clique para ler)": ["Source: Valor Econômico. (Click to read)", "Fuente: Valor Econômico. (Haz clic para leer)"],
    "Fonte: Propmark. (Clique para ler)": ["Source: Propmark. (Click to read)", "Fuente: Propmark. (Haz clic para leer)"],
    "Fonte: Abramark. (Clique para ler)": ["Source: Abramark. (Click to read)", "Fuente: Abramark. (Haz clic para leer)"],
    "Fonte: Acontecendo aqui (Clique para ler)": ["Source: Acontecendo Aqui (Click to read)", "Fuente: Acontecendo Aqui (Haz clic para leer)"],
    "Fonte: E-commerce Brasil. (Clique para ler)": ["Source: E-commerce Brasil. (Click to read)", "Fuente: E-commerce Brasil. (Haz clic para leer)"],
    "(abre em nova aba)": ["(opens in a new tab)", "(se abre en una nueva pestaña)"],

    // Por que investir em UGC
    "Por que investir em UGC ?": ["Why invest in UGC?", "¿Por qué invertir en UGC?"],
    "Com a crescente demanda por verdade, autenticidade e confiança (especialmente entre a geração Z) o User-Generated Content (UGC) surgiu como uma estratégia para humanizar as marcas. Esse tipo de conteúdo orgânico destaca diferenciais, benefícios e valores, fortalecendo a credibilidade e gerando maior engajamento com o público por meio de comunicações reais e autênticas.": [
      "With the growing demand for truth, authenticity and trust (especially among Gen Z), User-Generated Content (UGC) emerged as a strategy to humanize brands. This kind of organic content highlights differentiators, benefits and values, strengthening credibility and driving more engagement with the audience through real, authentic communication.",
      "Con la creciente demanda de verdad, autenticidad y confianza (especialmente en la generación Z), el User-Generated Content (UGC) surgió como una estrategia para humanizar las marcas. Este tipo de contenido orgánico destaca diferenciales, beneficios y valores, fortaleciendo la credibilidad y generando mayor engagement con el público a través de comunicaciones reales y auténticas."],
    "Mais de": ["Over", "Más del"],
    "dos clientes sentem mais": ["of customers feel more", "de los clientes sienten más"],
    "confiança": ["trust", "confianza"],
    "com conteúdo": ["in", "con contenido"],
    "UGC": ["UGC content", "UGC"],
    "do que anúncio tradicional de venda explícita.": ["than in traditional hard-sell ads.", "que con anuncios tradicionales de venta explícita."],
    "das pessoas sentem mais": ["of people feel more", "de las personas sienten más"],
    "em marcas que usam conteúdo": ["in brands that use", "en marcas que usan contenido"],
    "do que influenciadores digitais.": ["than in digital influencers.", "que en influencers digitales."],
    "Mais": ["More", "Más"],
    "engajamento": ["engagement", "engagement"],
    "mais vendas": ["more sales", "más ventas"],
    "Baixo custo": ["Low cost", "Bajo costo"],

    // Contato e rodapé
    "Contato": ["Contact", "Contacto"],
    "Vamos criar algo": ["Shall we create something", "¿Creamos algo"],
    "juntos": ["together", "juntos"],
    "Me conta um pouco sobre a sua marca e o que você quer alcançar. Respondo em até 1 dia útil.": [
      "Tell me a bit about your brand and what you want to achieve. I reply within 1 business day.",
      "Cuéntame un poco sobre tu marca y lo que quieres lograr. Respondo en hasta 1 día hábil."],
    "(Instagram, abre em nova aba)": ["(Instagram, opens in a new tab)", "(Instagram, se abre en una nueva pestaña)"],
    "(WhatsApp, abre em nova aba)": ["(WhatsApp, opens in a new tab)", "(WhatsApp, se abre en una nueva pestaña)"],
    "Nome": ["Name", "Nombre"],
    "E-mail": ["Email", "Correo"],
    "Marca ou empresa": ["Brand or company", "Marca o empresa"],
    "(opcional)": ["(optional)", "(opcional)"],
    "Conta sobre o projeto": ["Tell me about the project", "Cuéntame sobre el proyecto"],
    "Não preencha este campo": ["Do not fill in this field", "No completes este campo"],
    "Enviar mensagem ↗": ["Send message ↗", "Enviar mensaje ↗"],
    "Enviando...": ["Sending...", "Enviando..."],
    "Mensagem recebida!": ["Message received!", "¡Mensaje recibido!"],
    "Recebi sua mensagem e te respondo em breve.": ["I got your message and will reply soon.", "Recibí tu mensaje y te respondo pronto."],
    "Enviar outra mensagem": ["Send another message", "Enviar otro mensaje"],
    "Preencha este campo.": ["Please fill in this field.", "Completa este campo."],
    "Digite um e-mail válido.": ["Please enter a valid email.", "Escribe un correo válido."],
    "Não consegui enviar agora. Tente de novo em instantes ou me chame no e-mail mariaugclara@gmail.com.": [
      "I couldn't send it right now. Please try again in a moment or email me at mariaugclara@gmail.com.",
      "No pude enviarlo ahora. Inténtalo de nuevo en un momento o escríbeme a mariaugclara@gmail.com."],

    // Card do mídia kit
    "Vamos conversar?": ["Shall we talk?", "¿Hablamos?"],
    "Quer meu": ["Want my full", "¿Quieres mi"],
    "mídia kit": ["media kit", "media kit"],
    "completo?": ["?", "completo?"],
    "Deixa seu nome e seu e-mail que eu te envio o kit com formatos, valores e cases.": [
      "Leave your name and email and I'll send you the kit with formats, rates and case studies.",
      "Déjame tu nombre y tu correo y te envío el kit con formatos, precios y casos."],
    "Quero receber": ["Send it to me", "Quiero recibirlo"],
    "Sem spam, prometo.": ["No spam, I promise.", "Sin spam, lo prometo."],
    "Pedido anotado!": ["Request noted!", "¡Pedido anotado!"],
    "Em breve o mídia kit chega no seu e-mail.": ["Your media kit will be in your inbox soon.", "Pronto te llegará el media kit a tu correo."],
    "Voltar ao site": ["Back to the site", "Volver al sitio"],

    // Textos escondidos (leitor de tela), descrições de fotos e campos
    "Menu principal": ["Main menu", "Menú principal"],
    "Abrir menu": ["Open menu", "Abrir menú"],
    "Fechar menu": ["Close menu", "Cerrar menú"],
    "Fechar": ["Close", "Cerrar"],
    "Em números": ["In numbers", "En números"],
    "Minhas redes": ["My social media", "Mis redes"],
    "Filtrar trabalhos por nicho": ["Filter work by niche", "Filtrar trabajos por nicho"],
    "Assinatura: Maria Clara Filgueiras": ["Signature: Maria Clara Filgueiras", "Firma: Maria Clara Filgueiras"],
    "Seu nome": ["Your name", "Tu nombre"],
    "Seu e-mail": ["Your email", "Tu correo"],
    "voce@suamarca.com.br": ["you@yourbrand.com", "tu@tumarca.com"],
    "Nome da marca": ["Brand name", "Nombre de la marca"],
    "Qual é o produto, o objetivo e onde o conteúdo vai rodar?": ["What's the product, the goal and where will the content run?", "¿Cuál es el producto, el objetivo y dónde se publicará el contenido?"],
    "Maria Clara Filgueiras sorrindo, sentada numa cadeira de madeira, com vestido verde de tricô": ["Maria Clara Filgueiras smiling, sitting on a wooden chair in a green knit dress", "Maria Clara Filgueiras sonriendo, sentada en una silla de madera, con vestido verde de punto"],
    "Foto em preto e branco de Maria Clara Filgueiras sorrindo, olhando por cima do ombro, com a mão no cabelo": ["Black and white photo of Maria Clara Filgueiras smiling over her shoulder, hand in her hair", "Foto en blanco y negro de Maria Clara Filgueiras sonriendo, mirando por encima del hombro, con la mano en el cabello"],
    "Maria Clara Filgueiras deitada na grama, de olhos fechados, com flores amarelas no cabelo": ["Maria Clara Filgueiras lying on the grass with her eyes closed and yellow flowers in her hair", "Maria Clara Filgueiras recostada en el césped, con los ojos cerrados y flores amarillas en el cabello"],
    "Maria Clara de vestido longo vinho em frente a portas de madeira": ["Maria Clara in a long burgundy dress in front of wooden doors", "Maria Clara con vestido largo vino frente a puertas de madera"],
    "Maria Clara com brinco e colares dourados": ["Maria Clara wearing gold earrings and necklaces", "Maria Clara con aretes y collares dorados"],
    "Maria Clara servindo suco na varanda": ["Maria Clara pouring juice on the balcony", "Maria Clara sirviendo jugo en el balcón"],
    "Maria Clara segurando o gel de banho e o hidratante Rosas e Damasco": ["Maria Clara holding the Rosas e Damasco shower gel and body lotion", "Maria Clara sosteniendo el gel de baño y la crema Rosas e Damasco"],
    "Maria Clara segurando um perfume": ["Maria Clara holding a perfume", "Maria Clara sosteniendo un perfume"],
    "Maria Clara segurando o BioColl": ["Maria Clara holding BioColl", "Maria Clara sosteniendo BioColl"],
    "Maria Clara na praia com o body splash Solar Muse": ["Maria Clara at the beach with the Solar Muse body splash", "Maria Clara en la playa con el body splash Solar Muse"],
    "Maria Clara sorrindo com o Imunofem": ["Maria Clara smiling with Imunofem", "Maria Clara sonriendo con Imunofem"],
    "Maria Clara Filgueiras comemorando de braços para cima, segurando o celular e fazendo sinal de paz": ["Maria Clara Filgueiras celebrating with her arms up, holding her phone and making a peace sign", "Maria Clara Filgueiras celebrando con los brazos arriba, sosteniendo el celular y haciendo el signo de paz"],
    "Maria Clara Filgueiras entre girassóis, segurando um girassol perto do rosto": ["Maria Clara Filgueiras among sunflowers, holding one close to her face", "Maria Clara Filgueiras entre girasoles, sosteniendo uno cerca del rostro"],
    "Print do feedback: Campanha IAB, MCO Marketing Digital, 5 estrelas: elogia o profissionalismo, o roteiro para aprovação prévia e a entrega rápida e acima das expectativas": ["Feedback screenshot: IAB campaign, MCO Marketing Digital, 5 stars: praises the professionalism, the script sent for approval and the fast delivery that exceeded expectations", "Captura de opinión: campaña IAB, MCO Marketing Digital, 5 estrellas: elogia el profesionalismo, el guion para aprobación previa y la entrega rápida y por encima de las expectativas"],
    "Print do feedback: Suplemento Natural de Colostro para Cães, Collum, 5 estrelas: Adorei os conteúdos!": ["Feedback screenshot: natural colostrum supplement for dogs, Collum, 5 stars: I loved the content!", "Captura de opinión: suplemento natural de calostro para perros, Collum, 5 estrellas: ¡Me encantaron los contenidos!"],
    "Print do feedback: União Vegetal, UGCs Natural Tech, 5 estrelas: realizou um trabalho excelente e muito cuidadoso": ["Feedback screenshot: União Vegetal, UGCs Natural Tech, 5 stars: did excellent, very careful work", "Captura de opinión: União Vegetal, UGCs Natural Tech, 5 estrellas: hizo un trabajo excelente y muy cuidadoso"],
    "Print do feedback: Bf Med, 5 estrelas: ótima profissional, conseguiu transmitir a mensagem de forma precisa e objetiva": ["Feedback screenshot: Bf Med, 5 stars: great professional, delivered the message precisely and clearly", "Captura de opinión: Bf Med, 5 estrellas: excelente profesional, transmitió el mensaje de forma precisa y objetiva"],
    "Print do feedback: Campanha de Suplemento para Candidíase, Maxfem, 5 estrelas: rápida, criativa e com interesse real em entender a marca": ["Feedback screenshot: candidiasis supplement campaign, Maxfem, 5 stars: fast, creative and genuinely interested in understanding the brand", "Captura de opinión: campaña de suplemento para candidiasis, Maxfem, 5 estrellas: rápida, creativa y con interés real en entender la marca"],
    "Print do feedback: Mensagem no WhatsApp: ficou sensacional, nota 10 em copy, edição, roteiro e efeitos": ["Feedback screenshot: WhatsApp message: it turned out amazing, a 10 for copy, editing, script and effects", "Captura de opinión: mensaje de WhatsApp: quedó sensacional, nota 10 en copy, edición, guion y efectos"],
    "Manchete do Valor Econômico: Plataformas de UGC ganham força no mercado brasileiro": ["Valor Econômico headline: UGC platforms gain ground in the Brazilian market", "Titular de Valor Econômico: plataformas de UGC ganan fuerza en el mercado brasileño"],
    "Manchete da Abramark: Marcas do Grupo Boticário apostam em conteúdos produzidos por consumidores para fortalecer novas estratégias de marketing": ["Abramark headline: Grupo Boticário brands bet on consumer-made content to strengthen new marketing strategies", "Titular de Abramark: marcas del Grupo Boticário apuestan por contenidos creados por consumidores para fortalecer nuevas estrategias de marketing"],
    "Manchete do Acontecendo Aqui: ARTIGO, UGC: como as marcas driblam influenciadores para pagar menos por publicidade": ["Acontecendo Aqui headline: ARTICLE, UGC: how brands work around influencers to pay less for advertising", "Titular de Acontecendo Aqui: ARTÍCULO, UGC: cómo las marcas esquivan a los influencers para pagar menos por publicidad"],
    "Manchete do E-commerce Brasil: Os benefícios de ter clientes como embaixadores de marca através do UGC": ["E-commerce Brasil headline: The benefits of having customers as brand ambassadors through UGC", "Titular de E-commerce Brasil: los beneficios de tener clientes como embajadores de marca a través del UGC"],

    // Título da aba
    "Maria Clara Filgueiras | Portfólio UGC Creator": ["Maria Clara Filgueiras | UGC Creator Portfolio", "Maria Clara Filgueiras | Portafolio UGC Creator"]
  };

  // Textos que mudam com números ou nomes
  var PADROES = [
    [/^(\d+) anos$/, ["$1 years", "$1 años"]],
    [/^Mostrando todos os (\d+) trabalhos\.$/, ["Showing all $1 works.", "Mostrando los $1 trabajos."]],
    [/^Mostrando (\d+) trabalhos de (.+)\.$/, ["Showing $1 works in {2}.", "Mostrando $1 trabajos de {2}."]],
    [/^Obrigada, (.+)! Recebi sua mensagem e te respondo em até 1 dia útil\.$/, ["Thank you, $1! I got your message and will reply within 1 business day.", "¡Gracias, $1! Recibí tu mensaje y te respondo en hasta 1 día hábil."]],
    [/^Obrigada, (.+)! Em breve o mídia kit chega no seu e-mail\.$/, ["Thank you, $1! Your media kit will be in your inbox soon.", "¡Gracias, $1! Pronto te llegará el media kit a tu correo."]],
    [/^Voltar vídeos de (.+)$/, ["Previous {1} videos", "Videos anteriores de {1}"]],
    [/^Ver mais vídeos de (.+)$/, ["More {1} videos", "Ver más videos de {1}"]],
    [/^Capa do vídeo: (.+)$/, ["Video cover: {1}", "Portada del video: {1}"]]
  ];

  var ATRIBUTOS = ["alt", "aria-label", "placeholder", "title"];
  var CHAVE = "idioma";
  var idioma = "pt";
  var originais = new WeakMap();   // texto original de cada pedaço de texto
  var aplicando = false;

  function limpar(t) { return t.replace(/\s+/g, " ").trim(); }

  function traduzirFrase(pt, i) {
    var chave = limpar(pt);
    if (!chave) return null;
    if (T[chave]) return T[chave][i];
    for (var k = 0; k < PADROES.length; k++) {
      var m = chave.match(PADROES[k][0]);
      if (m) {
        return PADROES[k][1][i].replace(/\$(\d)/g, function (_, n) { return m[n]; })
          .replace(/\{(\d)\}/g, function (_, n) { return T[m[n]] ? T[m[n]][i] : m[n]; });
      }
    }
    return null;
  }

  function traduzirTexto(no) {
    if (!originais.has(no)) originais.set(no, no.nodeValue);
    var pt = originais.get(no);
    if (idioma === "pt") { if (no.nodeValue !== pt) no.nodeValue = pt; return; }
    var trad = traduzirFrase(pt, idioma === "en" ? 0 : 1);
    if (trad === null) return;
    // mantém os espaços do começo e do fim do texto original
    var antes = pt.match(/^\s*/)[0], depois = pt.match(/\s*$/)[0];
    var novo = antes + trad + depois;
    if (no.nodeValue !== novo) no.nodeValue = novo;
  }

  function traduzirAtributos(el) {
    ATRIBUTOS.forEach(function (a) {
      if (!el.hasAttribute(a)) return;
      var guardado = "data-pt-" + a;
      var atual = el.getAttribute(a);
      // se o próprio site trocou o texto (ex.: "Abrir menu" virou "Fechar menu"), guarda o novo original
      if (!el.hasAttribute(guardado) || (traduzirFrase(atual, 0) !== null)) el.setAttribute(guardado, atual);
      var pt = el.getAttribute(guardado);
      var novo = idioma === "pt" ? pt : (traduzirFrase(pt, idioma === "en" ? 0 : 1) || pt);
      if (atual !== novo) el.setAttribute(a, novo);
    });
  }

  function percorrer(raiz) {
    if (raiz.nodeType === 3) { traduzirTexto(raiz); return; }
    if (raiz.nodeType !== 1 || raiz.closest("script, style, .idiomas")) return;
    traduzirAtributos(raiz);
    var andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) return n.closest("script, style, .idiomas") ? 2 : 1;
        return n.nodeValue.trim() ? 1 : 3;
      }
    });
    var n;
    while ((n = andar.nextNode())) {
      if (n.nodeType === 3) traduzirTexto(n); else traduzirAtributos(n);
    }
  }

  function aplicar(novo) {
    idioma = novo;
    aplicando = true;
    document.documentElement.lang = novo === "pt" ? "pt-BR" : novo;
    percorrer(document.body);
    var tituloPt = "Maria Clara Filgueiras | Portfólio UGC Creator";
    document.title = novo === "pt" ? tituloPt : T[tituloPt][novo === "en" ? 0 : 1];
    document.querySelectorAll(".idiomas button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-idioma") === novo));
    });
    aplicando = false;
    try { localStorage.setItem(CHAVE, novo); } catch (e) {}
  }

  // Textos que o site escreve depois (vídeos do painel, mensagens do formulário, contadores)
  new MutationObserver(function (mudancas) {
    if (aplicando) return;
    mudancas.forEach(function (m) {
      if (m.type === "childList") m.addedNodes.forEach(percorrer);
      else if (m.type === "attributes" && ATRIBUTOS.indexOf(m.attributeName) > -1 && idioma !== "pt") {
        var el = m.target, atual = el.getAttribute(m.attributeName);
        if (traduzirFrase(atual, 0) !== null) { // o site colocou um texto novo em português
          el.setAttribute("data-pt-" + m.attributeName, atual);
          el.setAttribute(m.attributeName, traduzirFrase(atual, idioma === "en" ? 0 : 1));
        }
      }
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATRIBUTOS });

  // Botões PT | EN | ES
  document.querySelectorAll(".idiomas button").forEach(function (b) {
    b.addEventListener("click", function () { aplicar(b.getAttribute("data-idioma")); });
  });

  // Idioma inicial: ?lang=en no link, ou o último escolhido, ou português
  var inicial = "pt";
  var daUrl = new URLSearchParams(location.search).get("lang");
  if (daUrl && /^(pt|en|es)$/.test(daUrl)) inicial = daUrl;
  else { try { var salvo = localStorage.getItem(CHAVE); if (salvo && /^(pt|en|es)$/.test(salvo)) inicial = salvo; } catch (e) {} }
  if (inicial !== "pt") aplicar(inicial);
})();
