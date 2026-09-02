import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cockpit Eleitoral 2026 | Gestão de Lideranças & Disparador',
  description: 'Painel Central de Gestão Eleitoral, Árvore de Lideranças, Ingestão Groq WhatsApp e Metas de Campanha.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-cyan-500 selection:text-white transition-colors duration-200">
        <div className="relative min-h-screen flex flex-col">
          {/* Subtle Ambient Background Gradients */}
          <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-600/10 blur-[120px] pointer-events-none" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-emerald-600/10 blur-[140px] pointer-events-none" />

          {children}
        </div>
      </body>
    </html>
  );
}
