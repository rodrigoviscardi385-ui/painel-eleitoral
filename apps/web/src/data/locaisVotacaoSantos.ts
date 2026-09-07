export interface LocalVotacaoItem {
  id: string;
  nome_escola: string;
  bairro: string;
  zona_eleitoral: string;
  endereco: string;
  secoes: number[];
}

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const LOCAIS_SANTOS_BASE: LocalVotacaoItem[] = [
  // ─── 118ª Zona Eleitoral (Centro, Morros e Zona Noroeste) ───────────────────
  {
    id: 'santos-118-01',
    nome_escola: 'E.E. Barnabé',
    bairro: 'Vila Matias',
    zona_eleitoral: '118',
    endereco: 'Rua Lucas Fortunato, 48',
    secoes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    id: 'santos-118-02',
    nome_escola: 'SESI da Zona Noroeste',
    bairro: 'Jardim Castelo',
    zona_eleitoral: '118',
    endereco: 'Av. Nossa Senhora de Fátima, 366',
    secoes: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26],
  },
  {
    id: 'santos-118-03',
    nome_escola: 'Colégio Sênior',
    bairro: 'Centro',
    zona_eleitoral: '118',
    endereco: 'Rua Amador Bueno, 192',
    secoes: [27, 28, 29, 30, 31, 32, 33, 34],
  },
  {
    id: 'santos-118-04',
    nome_escola: 'UME Vereador Ary Silva',
    bairro: 'Areia Branca',
    zona_eleitoral: '118',
    endereco: 'Rua Francisco de Paula Ribeiro, 50',
    secoes: [35, 36, 37, 38, 39, 40, 41, 42, 43],
  },
  {
    id: 'santos-118-05',
    nome_escola: 'UME Professora Maria Luiza Alonso Silva',
    bairro: 'Rádio Clube',
    zona_eleitoral: '118',
    endereco: 'Praça Jerônimo La Terza, s/n',
    secoes: [44, 45, 46, 47, 48, 49, 50, 51],
  },
  {
    id: 'santos-118-06',
    nome_escola: 'UME Morro Nova Cintra',
    bairro: 'Morro Nova Cintra',
    zona_eleitoral: '118',
    endereco: 'Av. Santista, 750',
    secoes: [52, 53, 54, 55, 56, 57],
  },
  {
    id: 'santos-118-07',
    nome_escola: 'UME José Bonifácio',
    bairro: 'Morro São Bento',
    zona_eleitoral: '118',
    endereco: 'Rua São Roque, s/n',
    secoes: [58, 59, 60, 61, 62],
  },
  {
    id: 'santos-118-08',
    nome_escola: 'E.E. Suetônio Bittencourt',
    bairro: 'Saboó',
    zona_eleitoral: '118',
    endereco: 'Rua Maria Mercedes Féa, 114',
    secoes: [63, 64, 65, 66, 67, 68],
  },
  {
    id: 'santos-118-09',
    nome_escola: 'UME Cidade de Santos',
    bairro: 'Embaré / Macuco',
    zona_eleitoral: '118',
    endereco: 'Av. Senador Feijó, 213',
    secoes: [69, 70, 71, 72, 73],
  },

  // ─── 272ª Zona Eleitoral (Zona Leste / Orla e Intermediária) ─────────────────
  {
    id: 'santos-272-01',
    nome_escola: 'Colégio Stella Maris',
    bairro: 'Ponta da Praia',
    zona_eleitoral: '272',
    endereco: 'Rua General Rondon, 8',
    secoes: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112],
  },
  {
    id: 'santos-272-02',
    nome_escola: 'Colégio Coração de Maria',
    bairro: 'Ponta da Praia',
    zona_eleitoral: '272',
    endereco: 'Av. Bartolomeu de Gusmão, 114',
    secoes: [113, 114, 115, 116, 117, 118, 119, 120, 121, 122],
  },
  {
    id: 'santos-272-03',
    nome_escola: 'Colégio São José',
    bairro: 'Embaré',
    zona_eleitoral: '272',
    endereco: 'Rua Conselheiro Lafaiete, 54',
    secoes: [123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133],
  },
  {
    id: 'santos-272-04',
    nome_escola: 'E.E. Canadá',
    bairro: 'Aparecida',
    zona_eleitoral: '272',
    endereco: 'Rua Frei Francisco Sampaio, 255',
    secoes: [134, 135, 136, 137, 138, 139, 140, 141, 142, 143],
  },
  {
    id: 'santos-272-05',
    nome_escola: 'E.E. Marquês de São Vicente',
    bairro: 'Macuco',
    zona_eleitoral: '272',
    endereco: 'Rua Silva Jardim, 381',
    secoes: [144, 145, 146, 147, 148, 149, 150, 151],
  },
  {
    id: 'santos-272-06',
    nome_escola: 'UME Professor Samuel Leão de Moura',
    bairro: 'Estuário',
    zona_eleitoral: '272',
    endereco: 'Rua Vereador Henrique Soler, 251',
    secoes: [152, 153, 154, 155, 156, 157, 158],
  },
  {
    id: 'santos-272-07',
    nome_escola: 'Colégio Jean Piaget',
    bairro: 'Aparecida',
    zona_eleitoral: '272',
    endereco: 'Av. Epitácio Pessoa, 214',
    secoes: [159, 160, 161, 162],
  },

  // ─── 273ª Zona Eleitoral (Zona Central e Orla Intermediária) ────────────────
  {
    id: 'santos-273-01',
    nome_escola: 'E.E. Martim Afonso',
    bairro: 'Gonzaga',
    zona_eleitoral: '273',
    endereco: 'Av. Ana Costa, 369',
    secoes: [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214],
  },
  {
    id: 'santos-273-02',
    nome_escola: 'E.E. Primo Ferreira',
    bairro: 'Vila Belmiro',
    zona_eleitoral: '273',
    endereco: 'Rua Dom Pedro I, 90 (ao lado do Estádio Urbano Caldeira)',
    secoes: [215, 216, 217, 218, 219, 220, 221, 222, 223],
  },
  {
    id: 'santos-273-03',
    nome_escola: 'Colégio Objetivo - Unidade Conselheiro',
    bairro: 'Campo Grande',
    zona_eleitoral: '273',
    endereco: 'Av. Conselheiro Nébias, 726',
    secoes: [224, 225, 226, 227, 228, 229, 230, 231, 232],
  },
  {
    id: 'santos-273-04',
    nome_escola: 'Colégio Santista',
    bairro: 'Marapé',
    zona_eleitoral: '273',
    endereco: 'Rua Euclides da Cunha, 122',
    secoes: [233, 234, 235, 236, 237, 238, 239],
  },
  {
    id: 'santos-273-05',
    nome_escola: 'UME Padre Waldemar Valle Martins',
    bairro: 'Pompeia',
    zona_eleitoral: '273',
    endereco: 'Praça Benedito Calixto, 22',
    secoes: [240, 241, 242, 243, 244, 245, 246, 247],
  },
  {
    id: 'santos-273-06',
    nome_escola: 'E.E. Marquês de Olinda',
    bairro: 'José Menino',
    zona_eleitoral: '273',
    endereco: 'Rua Euclides da Cunha, 310',
    secoes: [248, 249, 250, 251, 252, 253],
  },
  {
    id: 'santos-273-07',
    nome_escola: 'Colégio Universitas',
    bairro: 'Campo Grande',
    zona_eleitoral: '273',
    endereco: 'Rua Galeão Carvalhal, 45',
    secoes: [254, 255, 256, 257],
  }
];

export function buscarLocaisSantos(termo: string): LocalVotacaoItem[] {
  if (!termo || !termo.trim()) return LOCAIS_SANTOS_BASE;
  const q = normalizeText(termo);
  return LOCAIS_SANTOS_BASE.filter(
    (l) =>
      normalizeText(l.nome_escola).includes(q) ||
      normalizeText(l.bairro).includes(q) ||
      normalizeText(l.endereco).includes(q) ||
      l.zona_eleitoral.includes(q) ||
      l.secoes.some((s) => String(s) === q)
  );
}
