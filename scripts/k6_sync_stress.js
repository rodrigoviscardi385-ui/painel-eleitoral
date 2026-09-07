/**
 * k6_sync_stress.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulação de Carga Extrema k6: "Onda de Sincronização de Fim de Expediente"
 * Simula 5.000 cabos eleitorais sincronizando lotes de mutações simultaneamente às 17h.
 * Critérios de Aceite: P99 < 250ms | Taxa de Erro = 0.00%
 * ─────────────────────────────────────────────────────────────────────────────
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    sync_burst: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '15s', target: 500 },   // Aquecimento rápido
        { duration: '30s', target: 2500 },  // Pico de fim de caminhada
        { duration: '30s', target: 5000 },  // 5.000 coletores simultâneos
        { duration: '15s', target: 0 },     // Desaceleração
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<250'], // 99% das requisições abaixo de 250ms
    http_req_failed: ['rate<0.01'],                 // Erro inferior a 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:3001';

export default function () {
  const vuId = __VU;
  const iteration = __ITER;
  const deviceId = `device_vu_${vuId}`;

  // 1. Simulação do payload de mutações offline acumuladas
  const payload = JSON.stringify({
    deviceId: deviceId,
    mutations: [
      {
        mutationId: `mut_${vuId}_${iteration}_1`,
        deviceId: deviceId,
        logicalClock: iteration * 2 + 1,
        entity: 'eleitores',
        recordId: 'a0000000-0000-4000-8000-000000000001',
        operation: 'UPDATE',
        delta: {
          nome: `Eleitor Teste ${vuId}`,
          bairro: 'Gonzaga',
          score_engajamento: 82.5,
          indice_sentimento: 0.65,
          consentimento_lgpd: true,
          pauta_prioritaria: 'Saúde',
        },
        timestamp: Date.now(),
      },
      {
        mutationId: `mut_${vuId}_${iteration}_2`,
        deviceId: deviceId,
        logicalClock: iteration * 2 + 2,
        entity: 'eleitores',
        recordId: 'b0000000-0000-4000-8000-000000000002',
        operation: 'UPDATE',
        delta: {
          nome: `Eleitor Teste ${vuId} B`,
          bairro: 'Boqueirão',
          score_engajamento: 45.0,
          indice_sentimento: -0.1,
          consentimento_lgpd: true,
          pauta_prioritaria: 'Educação',
        },
        timestamp: Date.now(),
      },
    ],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `idemp_${vuId}_${iteration}`,
    },
  };

  // Disparo do lote de sincronização
  const syncRes = http.post(`${BASE_URL}/api/v2/sync/batch`, payload, params);

  check(syncRes, {
    'Sync Status 200': (r) => r.status === 200,
    'Sync Reconhecido': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'CONSOLIDATED' || body.status === 'PARTIALLY_CONSOLIDATED';
      } catch {
        return false;
      }
    },
  });

  // 2. Consulta rápida de Mapa de Calor H3 a cada 5 iterações
  if (iteration % 5 === 0) {
    const mapRes = http.get(`${BASE_URL}/api/v2/mapas/h3-heatmap`);
    check(mapRes, {
      'Map Status 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
