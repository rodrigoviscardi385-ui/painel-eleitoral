import PdfPrinter from 'pdfmake';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { sql, desc } from 'drizzle-orm';
import { Readable } from 'stream';

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

/**
 * Gera relatório executivo da campanha em PDF com baixo consumo de memória (stream)
 */
export async function generateExecutiveReportStream(): Promise<NodeJS.ReadableStream> {
  // 1. Busca dados da campanha
  const config = await db.select().from(schema.campanhaConfig).limit(1).then((r) => r[0]);

  // 2. Busca totais de eleitores e lideranças
  const [counts] = await db
    .select({
      totalEleitores: sql<number>`count(*)`,
      totalLideres: sql<number>`count(*) filter (where cargo in ('LIDER', 'GESTOR'))`,
      totalApoiadores: sql<number>`count(*) filter (where cargo = 'APOIADOR')`,
    })
    .from(schema.usuarios);

  // 3. Busca top 10 lideranças
  const topLideres = await db
    .select({
      nome: schema.usuarios.nome,
      whatsapp: schema.usuarios.whatsapp,
      bairro: schema.usuarios.bairro,
      diretos: schema.usuarios.total_indicados_diretos,
      rede: schema.usuarios.total_indicados_rede,
    })
    .from(schema.usuarios)
    .orderBy(desc(schema.usuarios.total_indicados_rede))
    .limit(10);

  // 4. Busca resumo de gastos por categoria
  const gastosPorCategoria = await db
    .select({
      categoria: schema.gastosCampanha.categoria,
      total: sql<string>`sum(valor)`,
      qtd: sql<number>`count(*)`,
    })
    .from(schema.gastosCampanha)
    .groupBy(schema.gastosCampanha.categoria);

  const totalGeralGastos = gastosPorCategoria.reduce((acc, curr) => acc + Number(curr.total || 0), 0);

  // 5. Monta tabela de lideranças para o PDF
  const lideresRows = [
    [
      { text: 'Liderança', bold: true, fillColor: '#f3f4f6' },
      { text: 'Bairro', bold: true, fillColor: '#f3f4f6' },
      { text: 'Diretos', bold: true, fillColor: '#f3f4f6', alignment: 'center' },
      { text: 'Rede Total', bold: true, fillColor: '#f3f4f6', alignment: 'center' },
    ],
  ];

  for (const l of topLideres) {
    lideresRows.push([
      { text: l.nome, bold: false, fillColor: '#ffffff' },
      { text: l.bairro || 'Geral', bold: false, fillColor: '#ffffff' },
      { text: String(l.diretos), bold: false, fillColor: '#ffffff', alignment: 'center' },
      { text: String(l.rede), bold: true, fillColor: '#ffffff', alignment: 'center' },
    ]);
  }

  if (topLideres.length === 0) {
    lideresRows.push([
      { text: 'Nenhuma liderança cadastrada até o momento', bold: false, fillColor: '#ffffff' },
      { text: '-', bold: false, fillColor: '#ffffff' },
      { text: '-', bold: false, fillColor: '#ffffff', alignment: 'center' },
      { text: '-', bold: false, fillColor: '#ffffff', alignment: 'center' },
    ]);
  }

  // 6. Monta tabela de despesas para o PDF
  const gastosRows = [
    [
      { text: 'Categoria TSE', bold: true, fillColor: '#f3f4f6' },
      { text: 'Lançamentos', bold: true, fillColor: '#f3f4f6', alignment: 'center' },
      { text: 'Total (R$)', bold: true, fillColor: '#f3f4f6', alignment: 'right' },
    ],
  ];

  for (const g of gastosPorCategoria) {
    gastosRows.push([
      { text: g.categoria, bold: false, fillColor: '#ffffff' },
      { text: String(g.qtd), bold: false, fillColor: '#ffffff', alignment: 'center' },
      { text: `R$ ${Number(g.total).toFixed(2)}`, bold: false, fillColor: '#ffffff', alignment: 'right' },
    ]);
  }

  // 7. Definição do Documento PDF
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    content: [
      {
        text: `RELATÓRIO ESTRATÉGICO EXECUTIVO - ELEIÇÕES 2026`,
        style: 'header',
        color: '#0f172a',
      },
      {
        text: `Campanha Oficial: ${config?.nome_urna || 'Gustavo Reis'} | Número: ${config?.numero_candidato || '55955'} (${config?.partido || 'PSD'})`,
        style: 'subheader',
        color: '#059669',
      },
      {
        text: `Cargo: ${config?.cargo || 'Deputado Federal'} | Município/Estado: ${config?.cidade || 'Santos'}-${config?.estado || 'SP'}`,
        fontSize: 10,
        color: '#64748b',
        margin: [0, 0, 0, 15],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: '#10b981' }],
        margin: [0, 0, 0, 15],
      },

      // Quadro Resumo de Métricas (Cockpit)
      { text: '1. INDICADORES GERAIS DA BASE ELEITORAL', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              { text: `Total de Contatos Cadastrados\n\n${counts.totalEleitores}`, alignment: 'center', bold: true, fillColor: '#ecfdf5', margin: [5, 8, 5, 8] },
              { text: `Lideranças Ativas\n\n${counts.totalLideres}`, alignment: 'center', bold: true, fillColor: '#eff6ff', margin: [5, 8, 5, 8] },
              { text: `Apoiadores de Base\n\n${counts.totalApoiadores}`, alignment: 'center', bold: true, fillColor: '#fefce8', margin: [5, 8, 5, 8] },
            ],
          ],
        },
        margin: [0, 0, 0, 20],
      },

      // Tabela de Top Lideranças
      { text: '2. TOP 10 LIDERANÇAS E CAPILARIDADE DE REDE', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', 60, 70],
          body: lideresRows,
        },
        margin: [0, 0, 0, 20],
      },

      // Tabela de Gastos
      { text: '3. PRESTAÇÃO DE CONTAS E CONTROLE FINANCEIRO (TSE)', style: 'sectionTitle' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 100, 120],
          body: gastosRows,
        },
        margin: [0, 0, 0, 10],
      },
      {
        text: `Total Geral de Despesas Registradas: R$ ${totalGeralGastos.toFixed(2)}`,
        bold: true,
        alignment: 'right',
        color: '#0f172a',
        margin: [0, 0, 0, 25],
      },

      // Rodapé de Auditoria e LGPD
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#cbd5e1' }],
        margin: [0, 0, 0, 10],
      },
      {
        text: `Documento gerado automaticamente pelo Painel Eleitoral 2026 em ${new Date().toLocaleString('pt-BR')}. Em conformidade com a LGPD e resoluções do Tribunal Superior Eleitoral (TSE). Dados confidenciais do comitê de campanha.`,
        fontSize: 8,
        color: '#94a3b8',
        alignment: 'center',
      },
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        margin: [0, 0, 0, 4],
      },
      subheader: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 2],
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: '#1e293b',
        margin: [0, 10, 0, 6],
      },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9,
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.end();
  return pdfDoc;
}
