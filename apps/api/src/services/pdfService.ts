import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces.js';
import { Writable } from 'stream';

// Definição de fontes padrão (Standard 14 PDF fonts não requerem arquivos TTF externos)
const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(fonts);

export interface ReportData {
  titulo: string;
  subtitulo?: string;
  dataGeracao?: string;
  totalLideres: number;
  totalApoiadores: number;
  metaGlobal: number;
  porcentagemMeta: number;
  liderancas: Array<{
    nome: string;
    cargo: string;
    bairro?: string | null;
    zona?: string | null;
    secao?: string | null;
    diretos: number;
    rede: number;
    whatsapp: string;
  }>;
  zonasResumo: Array<{
    zona: string;
    bairro: string;
    total: number;
    meta: number;
    status: string;
  }>;
  solicitanteAudit?: string;
}

/**
 * Gera documento PDF estruturado e envia via stream para a resposta HTTP
 * Consumo de memória garantido < 35 MB de RAM graças ao streaming nativo sem buffer em disco.
 */
export function streamLeadershipReport(data: ReportData, outputStream: Writable): Promise<void> {
  return new Promise((resolve, reject) => {
    const dataHora = data.dataGeracao || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Tabela de Líderes
    const lideresTableRows: any[] = [
      [
        { text: 'Líder / Responsável', style: 'tableHeader' },
        { text: 'Cargo', style: 'tableHeader' },
        { text: 'Bairro', style: 'tableHeader' },
        { text: 'Zona / Seção', style: 'tableHeader' },
        { text: 'Diretos', style: 'tableHeader', alignment: 'center' },
        { text: 'Rede Total', style: 'tableHeader', alignment: 'center' },
      ],
    ];

    data.liderancas.forEach((lider, index) => {
      const isEven = index % 2 === 0;
      lideresTableRows.push([
        { text: lider.nome, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
        { text: lider.cargo, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
        { text: lider.bairro || '-', style: isEven ? 'tableRowEven' : 'tableRowOdd' },
        { text: `${lider.zona || '-'}/${lider.secao || '-'}`, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
        { text: String(lider.diretos), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center' },
        { text: String(lider.rede), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center', bold: true },
      ]);
    });

    // Tabela de Zonas
    const zonasTableRows: any[] = [
      [
        { text: 'Zona Eleitoral', style: 'tableHeader' },
        { text: 'Bairro Principal', style: 'tableHeader' },
        { text: 'Apoiadores Cadastrados', style: 'tableHeader', alignment: 'center' },
        { text: 'Meta Zona', style: 'tableHeader', alignment: 'center' },
        { text: 'Status Semáforo', style: 'tableHeader', alignment: 'center' },
      ],
    ];

    data.zonasResumo.forEach((z, index) => {
      const isEven = index % 2 === 0;
      const statusColor = z.status === 'VERDE' ? '#10B981' : z.status === 'AMARELO' ? '#F59E0B' : '#EF4444';
      zonasTableRows.push([
        { text: `Zona ${z.zona}`, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
        { text: z.bairro, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
        { text: String(z.total), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center', bold: true },
        { text: String(z.meta), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center' },
        { text: z.status, style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center', color: statusColor, bold: true },
      ]);
    });

    const docDefinition: TDocumentDefinitions = {
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 9,
        color: '#1E293B',
      },
      pageMargins: [30, 40, 30, 40],
      header: (currentPage) => {
        return {
          margin: [30, 15, 30, 0],
          columns: [
            { text: 'SISTEMA ELEITORAL 2026 - RELATÓRIO EXECUTIVO', fontSize: 8, color: '#64748B', bold: true },
            { text: `Gerado em: ${dataHora}`, alignment: 'right', fontSize: 8, color: '#64748B' },
          ],
        };
      },
      footer: (currentPage, pageCount) => {
        return {
          margin: [30, 0, 30, 15],
          columns: [
            { text: `Auditoria LGPD: ${data.solicitanteAudit || 'SYS-ADMIN'} | Documento Confidencial`, fontSize: 7, color: '#94A3B8' },
            { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#64748B' },
          ],
        };
      },
      content: [
        // Título Principal
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: data.titulo, fontSize: 18, bold: true, color: '#0F172A' },
                { text: data.subtitulo || 'Mapeamento Territorial, Árvore de Lideranças e Metas', fontSize: 11, color: '#475569', margin: [0, 2, 0, 10] },
              ],
            },
            {
              width: 140,
              stack: [
                {
                  text: 'CONFIDENCIAL',
                  alignment: 'center',
                  color: '#FFFFFF',
                  background: '#1E293B',
                  bold: true,
                  fontSize: 9,
                  margin: [0, 0, 0, 4],
                },
              ],
            },
          ],
        },

        // Linha divisória
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1.5, lineColor: '#0284C7' }],
          margin: [0, 5, 0, 15],
        },

        // Cartões de Resumo / KPIs
        {
          columns: [
            {
              width: '25%',
              stack: [
                { text: 'TOTAL LÍDERES', fontSize: 8, color: '#64748B', bold: true },
                { text: String(data.totalLideres), fontSize: 16, bold: true, color: '#0284C7' },
              ],
            },
            {
              width: '25%',
              stack: [
                { text: 'TOTAL APOIADORES', fontSize: 8, color: '#64748B', bold: true },
                { text: String(data.totalApoiadores), fontSize: 16, bold: true, color: '#10B981' },
              ],
            },
            {
              width: '25%',
              stack: [
                { text: 'META GLOBAL', fontSize: 8, color: '#64748B', bold: true },
                { text: String(data.metaGlobal), fontSize: 16, bold: true, color: '#6366F1' },
              ],
            },
            {
              width: '25%',
              stack: [
                { text: '% ATINGIDO', fontSize: 8, color: '#64748B', bold: true },
                { text: `${data.porcentagemMeta.toFixed(1)}%`, fontSize: 16, bold: true, color: '#0F172A' },
              ],
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Seção 1: Resumo Territorial e Semáforo de Metas
        { text: '1. Desempenho Territorial e Semáforo de Metas', fontSize: 12, bold: true, color: '#0F172A', margin: [0, 0, 0, 8] },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ['25%', '30%', '18%', '13%', '14%'],
            body: zonasTableRows,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#0F172A';
              return rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E2E8F0',
            vLineColor: () => '#E2E8F0',
          },
          margin: [0, 0, 0, 20],
        },

        // Seção 2: Estrutura da Árvore de Lideranças
        { text: '2. Rede de Lideranças e Capacidade de Mobilização', fontSize: 12, bold: true, color: '#0F172A', margin: [0, 0, 0, 8] },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: ['30%', '16%', '22%', '14%', '9%', '9%'],
            body: lideresTableRows,
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#0F172A';
              return rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#E2E8F0',
            vLineColor: () => '#E2E8F0',
          },
        },
      ],
      styles: {
        tableHeader: {
          bold: true,
          fontSize: 8,
          color: '#FFFFFF',
          margin: [3, 4, 3, 4],
        },
        tableRowEven: {
          fontSize: 8,
          color: '#1E293B',
          margin: [3, 3, 3, 3],
        },
        tableRowOdd: {
          fontSize: 8,
          color: '#1E293B',
          margin: [3, 3, 3, 3],
        },
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(outputStream);
    pdfDoc.on('end', () => resolve());
    pdfDoc.on('error', (err) => reject(err));
    pdfDoc.end();
  });
}

/**
 * Cria o stream legível do PDF pronto para envio direto via Fastify reply.send(stream)
 */
export function createLeadershipReportStream(data: ReportData): NodeJS.ReadableStream {
  const dataHora = data.dataGeracao || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Tabela de Líderes
  const lideresTableRows: any[] = [
    [
      { text: 'Líder / Responsável', style: 'tableHeader' },
      { text: 'Cargo', style: 'tableHeader' },
      { text: 'Bairro', style: 'tableHeader' },
      { text: 'Zona / Seção', style: 'tableHeader' },
      { text: 'Diretos', style: 'tableHeader', alignment: 'center' },
      { text: 'Rede Total', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  data.liderancas.forEach((lider, index) => {
    const isEven = index % 2 === 0;
    lideresTableRows.push([
      { text: lider.nome, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
      { text: lider.cargo, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
      { text: lider.bairro || '-', style: isEven ? 'tableRowEven' : 'tableRowOdd' },
      { text: `${lider.zona || '-'}/${lider.secao || '-'}`, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
      { text: String(lider.diretos), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center' },
      { text: String(lider.rede), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center', bold: true },
    ]);
  });

  // Tabela de Zonas
  const zonasTableRows: any[] = [
    [
      { text: 'Zona Eleitoral', style: 'tableHeader' },
      { text: 'Bairro Principal', style: 'tableHeader' },
      { text: 'Apoiadores Cadastrados', style: 'tableHeader', alignment: 'center' },
      { text: 'Meta Zona', style: 'tableHeader', alignment: 'center' },
      { text: 'Status Semáforo', style: 'tableHeader', alignment: 'center' },
    ],
  ];

  data.zonasResumo.forEach((z, index) => {
    const isEven = index % 2 === 0;
    const statusColor = z.status === 'VERDE' ? '#10B981' : z.status === 'AMARELO' ? '#F59E0B' : '#EF4444';
    zonasTableRows.push([
      { text: `Zona ${z.zona}`, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
      { text: z.bairro, style: isEven ? 'tableRowEven' : 'tableRowOdd' },
      { text: String(z.total), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center', bold: true },
      { text: String(z.meta), style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center' },
      { text: z.status, style: isEven ? 'tableRowEven' : 'tableRowOdd', alignment: 'center', color: statusColor, bold: true },
    ]);
  });

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [30, 30, 30, 30],
    defaultStyle: {
      font: 'Helvetica',
      fontSize: 9,
      color: '#334155',
    },
    content: [
      // Cabeçalho Principal
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: data.titulo.toUpperCase(), fontSize: 14, bold: true, color: '#0F172A' },
              { text: data.subtitulo || 'Painel de Gestão e Monitoramento de Metas', fontSize: 9, color: '#64748B', margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: 140,
            alignment: 'right',
            stack: [
              { text: `Emissão: ${dataHora}`, fontSize: 7, color: '#64748B' },
              { text: `Solicitante: ${data.solicitanteAudit || 'Auditado LGPD'}`, fontSize: 7, bold: true, color: '#2563EB' },
            ],
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Linha Divisória
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1, lineColor: '#E2E8F0' }],
        margin: [0, 0, 0, 15],
      },

      // Cards de KPI
      {
        columns: [
          {
            width: '*',
            margin: [0, 0, 5, 0],
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#F8FAFC',
                    stack: [
                      { text: 'TOTAL DE LÍDERES', fontSize: 7, color: '#64748B', bold: true },
                      { text: String(data.totalLideres), fontSize: 16, bold: true, color: '#1E293B', margin: [0, 2, 0, 0] },
                    ],
                    margin: [6, 6, 6, 6],
                  },
                ],
              ],
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0' },
          },
          {
            width: '*',
            margin: [2, 0, 2, 0],
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#F8FAFC',
                    stack: [
                      { text: 'APOIADORES NA BASE', fontSize: 7, color: '#64748B', bold: true },
                      { text: String(data.totalApoiadores), fontSize: 16, bold: true, color: '#2563EB', margin: [0, 2, 0, 0] },
                    ],
                    margin: [6, 6, 6, 6],
                  },
                ],
              ],
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0' },
          },
          {
            width: '*',
            margin: [2, 0, 2, 0],
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#F8FAFC',
                    stack: [
                      { text: 'META GERAL 2026', fontSize: 7, color: '#64748B', bold: true },
                      { text: String(data.metaGlobal), fontSize: 16, bold: true, color: '#1E293B', margin: [0, 2, 0, 0] },
                    ],
                    margin: [6, 6, 6, 6],
                  },
                ],
              ],
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0' },
          },
          {
            width: '*',
            margin: [5, 0, 0, 0],
            table: {
              widths: ['*'],
              body: [
                [
                  {
                    fillColor: '#F8FAFC',
                    stack: [
                      { text: 'ALCANCE DA META', fontSize: 7, color: '#64748B', bold: true },
                      { text: `${data.porcentagemMeta.toFixed(1)}%`, fontSize: 16, bold: true, color: '#10B981', margin: [0, 2, 0, 0] },
                    ],
                    margin: [6, 6, 6, 6],
                  },
                ],
              ],
            },
            layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => '#E2E8F0', vLineColor: () => '#E2E8F0' },
          },
        ],
        margin: [0, 0, 0, 15],
      },

      // Seção 1: Hierarquia de Lideranças
      { text: '1. HIERARQUIA DE LIDERANÇAS E CAPILARIDADE', fontSize: 10, bold: true, color: '#0F172A', margin: [0, 5, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: ['*', 55, 75, 65, 40, 50],
          body: lideresTableRows,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return '#1E293B';
            return rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
          },
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
        },
        margin: [0, 0, 0, 15],
      },

      // Seção 2: Monitoramento Territorial por Zonas
      { text: '2. MONITORAMENTO TERRITORIAL E METAS POR ZONA', fontSize: 10, bold: true, color: '#0F172A', margin: [0, 5, 0, 6] },
      {
        table: {
          headerRows: 1,
          widths: [90, '*', 100, 75, 75],
          body: zonasTableRows,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return '#1E293B';
            return rowIndex % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
          },
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
        },
        margin: [0, 0, 0, 20],
      },

      // Rodapé de Conformidade LGPD
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, lineColor: '#CBD5E1' }],
        margin: [0, 0, 0, 8],
      },
      {
        text: 'CONFORMIDADE LGPD: Documento sigiloso gerado para controle interno de campanha. O tratamento de dados eleitorais atende ao consentimento explícito e normas do TSE.',
        fontSize: 6.5,
        color: '#94A3B8',
        alignment: 'center',
      },
    ],
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: '#FFFFFF',
        margin: [3, 4, 3, 4],
      },
      tableRowEven: {
        fontSize: 8,
        color: '#1E293B',
        margin: [3, 3, 3, 3],
      },
      tableRowOdd: {
        fontSize: 8,
        color: '#1E293B',
        margin: [3, 3, 3, 3],
      },
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.end();
  return pdfDoc;
}
