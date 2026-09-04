import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo ou foto foi enviado' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name || 'comprovante.jpg';
    const extension = path.extname(originalName).toLowerCase() || '.jpg';
    const baseName = path.basename(originalName, extension).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `recibo_${Date.now()}_${baseName}${extension}`;

    // Diretório público de comprovantes
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'gastos');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/gastos/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename: originalName,
      size: file.size,
    });
  } catch (error: any) {
    console.error('Erro no upload de foto de comprovante:', error);
    return NextResponse.json(
      { error: 'Falha ao processar upload da foto', detalhe: error?.message || String(error) },
      { status: 500 }
    );
  }
}
