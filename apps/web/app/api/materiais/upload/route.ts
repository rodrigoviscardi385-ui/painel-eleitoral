import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitizar nome do arquivo e adicionar timestamp único
    const originalName = file.name || 'material';
    const extension = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `${Date.now()}_${baseName}${extension}`;

    // Determinar tipo do material
    let tipo: 'PDF' | 'IMAGEM' | 'VIDEO' | 'LINK' = 'LINK';
    if (extension === '.pdf') {
      tipo = 'PDF';
    } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(extension)) {
      tipo = 'IMAGEM';
    } else if (['.mp4', '.mov', '.avi', '.webm', '.mkv'].includes(extension)) {
      tipo = 'VIDEO';
    }

    // Criar diretório público de uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'materiais');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/materiais/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: originalName,
      tipo,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Erro no upload de material:', error);
    return NextResponse.json({ error: 'Falha ao processar upload', detalhe: error?.message }, { status: 500 });
  }
}
