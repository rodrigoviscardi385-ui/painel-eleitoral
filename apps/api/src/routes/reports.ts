import { FastifyInstance } from 'fastify';
import { generateExecutiveReportStream } from '../services/pdfService.js';

export async function reportsRoutes(app: FastifyInstance) {
  // Streaming direto do relatório executivo em PDF (Memória < 35 MB)
  app.get('/api/reports/liderancas.pdf', async (request, reply) => {
    try {
      const pdfStream = await generateExecutiveReportStream();
      reply.header('Content-Type', 'application/pdf');
      reply.header(
        'Content-Disposition',
        `attachment; filename="relatorio_liderancas_${Date.now()}.pdf"`
      );
      return reply.send(pdfStream);
    } catch (err: any) {
      console.error('[Reports PDF Stream Error]', err);
      return reply.status(500).send({ error: 'Falha ao gerar relatório PDF.' });
    }
  });
}
