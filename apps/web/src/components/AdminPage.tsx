import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Award,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  X,
  Vote,
  Settings,
  Building,
  MapPin,
  FileText,
  UserCheck,
  UserX,
  Upload,
  Link as LinkIcon,
  Camera,
  Loader2,
} from 'lucide-react';
import { api } from '../api.ts';

interface AdminPageProps {
  currentUser: any;
  onCandidateChanged: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ currentUser, onCandidateChanged }) => {
  const [activeTab, setActiveTab] = useState<'candidatos' | 'usuarios'>('candidatos');

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '30px' }}>
          <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>Acesso Restrito</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>
            Apenas o Administrador Geral do sistema (Rodrigo) tem permissão para cadastrar e gerenciar candidatos e governança de acessos.
          </p>
        </div>
      </div>
    );
  }
  const [candidatos, setCandidatos] = useState<any[]>([]);
  const [usuariosAuth, setUsuariosAuth] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Candidato
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<any>(null);

  // Form Candidato
  const [nomeUrna, setNomeUrna] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [numeroCandidato, setNumeroCandidato] = useState('');
  const [cargo, setCargo] = useState('Deputado Federal');
  const [partido, setPartido] = useState('');
  const [coligacao, setColigacao] = useState('');
  const [slogan, setSlogan] = useState('');
  const [cidade, setCidade] = useState('Santos');
  const [estado, setEstado] = useState('SP');
  const [cnpj, setCnpj] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoMode, setFotoMode] = useState<'upload' | 'url'>('upload');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [uploadErrorFoto, setUploadErrorFoto] = useState<string | null>(null);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Arquivo muito grande. Por favor selecione uma imagem de até 25MB.');
      return;
    }

    setIsUploadingFoto(true);
    setUploadErrorFoto(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await api.uploadFile(base64, file.name, 'candidato');
          if (res.url) {
            setFotoUrl(res.url);
          }
        } catch (err: any) {
          setUploadErrorFoto(err.message || 'Erro ao enviar imagem.');
        } finally {
          setIsUploadingFoto(false);
        }
      };
      reader.onerror = () => {
        setUploadErrorFoto('Erro ao processar imagem.');
        setIsUploadingFoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadErrorFoto(err.message);
      setIsUploadingFoto(false);
    }
  };

  const [corPrimaria, setCorPrimaria] = useState('#10b981');
  const [biografiaIa, setBiografiaIa] = useState('');
  const [propostasIa, setPropostasIa] = useState('');
  const [tornarAtivo, setTornarAtivo] = useState(false);
  const [isSubmittingCandidate, setIsSubmittingCandidate] = useState(false);

  // Modal Novo Usuário Auth
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userNome, setUserNome] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSenha, setUserSenha] = useState('');
  const [userWhatsapp, setUserWhatsapp] = useState('');
  const [userRole, setUserRole] = useState('OPERADOR');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setIsLoading(true);
      await Promise.allSettled([loadCandidatos(), loadUsuarios()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCandidatos = async () => {
    try {
      const data = await api.getCandidatos();
      setCandidatos(data || []);
    } catch (err) {
      console.error('Erro ao carregar candidatos:', err);
    }
  };

  const loadUsuarios = async () => {
    try {
      const data = await api.getUsuariosAuth();
      setUsuariosAuth(data || []);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const openNewCandidateModal = () => {
    setEditingCandidate(null);
    setNomeUrna('');
    setNomeCompleto('');
    setNumeroCandidato('');
    setCargo('Deputado Federal');
    setPartido('');
    setColigacao('');
    setSlogan('');
    setCidade('Santos');
    setEstado('SP');
    setCnpj('');
    setFotoUrl('');
    setCorPrimaria('#10b981');
    setBiografiaIa('');
    setPropostasIa('');
    setTornarAtivo(false);
    setIsCandidateModalOpen(true);
  };

  const openEditCandidateModal = (c: any) => {
    setEditingCandidate(c);
    setNomeUrna(c.nome_urna || '');
    setNomeCompleto(c.nome_completo || '');
    setNumeroCandidato(c.numero_candidato || '');
    setCargo(c.cargo || 'Deputado Federal');
    setPartido(c.partido || '');
    setColigacao(c.coligacao || '');
    setSlogan(c.slogan || '');
    setCidade(c.cidade || 'Santos');
    setEstado(c.estado || 'SP');
    setCnpj(c.cnpj_campanha || '');
    setFotoUrl(c.foto_url || '');
    setCorPrimaria(c.cor_primaria || '#10b981');
    setBiografiaIa(c.biografia_ia || '');
    setPropostasIa(c.propostas_ia || '');
    setTornarAtivo(Boolean(c.ativo));
    setIsCandidateModalOpen(true);
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeUrna.trim() || !numeroCandidato.trim() || !partido.trim()) {
      alert('Preencha os campos obrigatórios: Nome na Urna, Número e Partido.');
      return;
    }

    try {
      setIsSubmittingCandidate(true);
      const payload = {
        nome_urna: nomeUrna.trim(),
        nome_completo: nomeCompleto.trim() || nomeUrna.trim(),
        numero_candidato: numeroCandidato.trim(),
        cargo,
        partido: partido.trim().toUpperCase(),
        coligacao: coligacao.trim(),
        slogan: slogan.trim(),
        cidade: cidade.trim(),
        estado: estado.trim().toUpperCase(),
        cnpj_campanha: cnpj.trim() || null,
        foto_url: fotoUrl.trim() || null,
        cor_primaria: corPrimaria,
        biografia_ia: biografiaIa.trim(),
        propostas_ia: propostasIa.trim(),
        tornar_ativo: tornarAtivo,
      };

      if (editingCandidate) {
        await api.updateCandidato(editingCandidate.id, payload);
        if (tornarAtivo && !editingCandidate.ativo) {
          await api.ativarCandidato(editingCandidate.id);
        }
      } else {
        await api.createCandidato(payload);
      }

      await loadCandidatos();
      onCandidateChanged();
      setIsCandidateModalOpen(false);
      alert('Candidato salvo com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar candidato: ${err.message}`);
    } finally {
      setIsSubmittingCandidate(false);
    }
  };

  const handleAtivarCandidate = async (id: string, nome: string) => {
    if (!confirm(`Deseja ativar "${nome}" como o candidato oficial da campanha? O painel passará a operar com esta candidatura.`)) {
      return;
    }

    try {
      await api.ativarCandidato(id);
      await loadCandidatos();
      onCandidateChanged();
      alert(`Candidatura de "${nome}" ativada com sucesso!`);
    } catch (err: any) {
      alert(`Erro ao ativar: ${err.message}`);
    }
  };

  const handleDeleteCandidate = async (id: string, nome: string) => {
    if (candidatos.length <= 1) {
      alert('Não é possível excluir o único candidato cadastrado no sistema.');
      return;
    }

    if (!confirm(`Atenção: Deseja realmente excluir o candidato "${nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await api.deleteCandidato(id);
      await loadCandidatos();
      onCandidateChanged();
      alert('Candidato excluído com sucesso.');
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  // Gestão de Usuários
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNome.trim() || !userEmail.trim() || !userSenha) {
      alert('Preencha nome, e-mail e senha.');
      return;
    }

    try {
      setIsSubmittingUser(true);
      await api.createUsuarioAuth({
        nome: userNome.trim(),
        email: userEmail.trim(),
        senha: userSenha,
        whatsapp: userWhatsapp.trim() || null,
        role: userRole,
        permissoes: userRole === 'ADMIN' ? ['ALL', 'CHAT', 'LIDERANCAS', 'GASTOS', 'DISPAROS', 'ADM'] : ['CHAT', 'LIDERANCAS'],
      });
      await loadUsuarios();
      setIsUserModalOpen(false);
      setUserNome('');
      setUserEmail('');
      setUserSenha('');
      setUserWhatsapp('');
      alert('Novo usuário cadastrado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao criar usuário: ${err.message}`);
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (id: string, nome: string) => {
    if (!confirm(`Deseja revogar o acesso de "${nome}"?`)) return;
    try {
      await api.deleteUsuarioAuth(id);
      await loadUsuarios();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const candidatoAtivo = candidatos.find((c) => c.ativo) || candidatos[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner de Identidade ADM */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.6))',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
            }}
          >
            <ShieldCheck size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Painel Administrativo Central
              </h1>
              <span className="badge badge-verde" style={{ fontSize: '11px' }}>
                Super Admin
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Gestão multi-candidatos, controle de campanhas ativas e governança de acessos de operadores.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={openNewCandidateModal}
            className="btn btn-primary"
            style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Cadastrar Novo Candidato</span>
          </button>
        </div>
      </div>

      {/* Candidato Ativo Destaque */}
      {candidatoAtivo && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 800,
                color: '#10b981',
                overflow: 'hidden',
              }}
            >
              {candidatoAtivo.foto_url ? (
                <img src={candidatoAtivo.foto_url} alt={candidatoAtivo.nome_urna} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                candidatoAtivo.nome_urna.slice(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-verde" style={{ fontSize: '10px' }}>
                  CAMPANHA ATIVA OFICIAL
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {candidatoAtivo.cidade || 'Santos'}/{candidatoAtivo.estado || 'SP'}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', margin: '4px 0 2px 0' }}>
                {candidatoAtivo.nome_urna} ({candidatoAtivo.numero_candidato}) • {candidatoAtivo.partido}
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {candidatoAtivo.cargo} • {candidatoAtivo.slogan}
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={() => openEditCandidateModal(candidatoAtivo)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Pencil size={14} color="#38bdf8" />
              <span>Editar Campanha Ativa</span>
            </button>
          </div>
        </div>
      )}

      {/* Navegação de Abas Internas da ADM */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('candidatos')}
          className={`btn ${activeTab === 'candidatos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          <Vote size={15} />
          <span>Candidatos Registrados ({candidatos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('usuarios')}
          className={`btn ${activeTab === 'usuarios' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          <Users size={15} />
          <span>Usuários & Acessos RBAC ({usuariosAuth.length})</span>
        </button>
      </div>

      {/* ABA 1: LISTAGEM DE CANDIDATOS */}
      {activeTab === 'candidatos' && (
        <div>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando candidaturas...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {candidatos.map((c) => {
                const isAtivo = Boolean(c.ativo);
                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: isAtivo ? '2px solid #10b981' : '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: isAtivo ? '0 8px 24px rgba(16, 185, 129, 0.15)' : 'none',
                    }}
                  >
                    <div>
                      {/* Topo do Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: 'rgba(30, 41, 59, 0.8)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: 800,
                              color: c.cor_primaria || '#10b981',
                              overflow: 'hidden',
                            }}
                          >
                            {c.foto_url ? (
                              <img src={c.foto_url} alt={c.nome_urna} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              c.nome_urna.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>{c.nome_urna}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {c.nome_completo && c.nome_completo !== c.nome_urna ? c.nome_completo : c.cargo}
                            </div>
                          </div>
                        </div>

                        {isAtivo ? (
                          <span className="badge badge-verde" style={{ fontSize: '10px', padding: '3px 8px' }}>
                            Ativo
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', fontSize: '10px' }}>
                            Inativo
                          </span>
                        )}
                      </div>

                      {/* Informações da Candidatura */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px', fontSize: '12px' }}>
                        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>NÚMERO & PARTIDO</span>
                          <strong style={{ color: '#ffffff' }}>
                            {c.numero_candidato} • {c.partido}
                          </strong>
                        </div>
                        <div style={{ background: 'rgba(30, 41, 59, 0.4)', padding: '8px 10px', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', display: 'block' }}>CARGO ELEITORAL</span>
                          <strong style={{ color: '#ffffff' }}>{c.cargo}</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                        <em>"{c.slogan || 'Sem slogan definido'}"</em>
                      </div>
                    </div>

                    {/* Ações do Card */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', gap: '8px' }}>
                      {!isAtivo ? (
                        <button
                          onClick={() => handleAtivarCandidate(c.id, c.nome_urna)}
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '11px', flex: 1 }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Tornar Ativo</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> Campanha em Uso
                        </span>
                      )}

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditCandidateModal(c)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                          title="Editar dados deste candidato"
                        >
                          <Pencil size={13} color="#38bdf8" />
                        </button>

                        <button
                          onClick={() => handleDeleteCandidate(c.id, c.nome_urna)}
                          disabled={candidatos.length <= 1}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px', color: candidatos.length <= 1 ? '#64748b' : '#ef4444' }}
                          title="Excluir este candidato"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: LISTAGEM DE USUÁRIOS AUTH */}
      {activeTab === 'usuarios' && (
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', color: '#ffffff', margin: 0 }}>Usuários com Acesso ao Sistema</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Gerencie quem pode logar no painel e suas respectivas permissões de acesso.
              </p>
            </div>
            <button
              onClick={() => setIsUserModalOpen(true)}
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={14} />
              <span>Novo Usuário</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {usuariosAuth.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(30, 41, 59, 0.4)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>{u.nome}</span>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-verde' : 'badge-azul'}`} style={{ fontSize: '10px' }}>
                      {u.role}
                    </span>
                    {u.id === currentUser?.id && (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '10px' }}>
                        Você
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {u.email} {u.whatsapp ? `• ${u.whatsapp}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {u.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.nome)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '11px', color: '#ef4444' }}
                      title="Revogar Acesso"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CADASTRAR / EDITAR CANDIDATO */}
      {isCandidateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCandidateModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', width: '95%', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '10px', color: '#10b981' }}>
                  <Vote size={20} />
                </div>
                <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0, fontWeight: 800 }}>
                  {editingCandidate ? 'Editar Dados do Candidato' : 'Cadastrar Novo Candidato'}
                </h3>
              </div>
              <button
                onClick={() => setIsCandidateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCandidate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Nome na Urna *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={nomeUrna}
                    onChange={(e) => setNomeUrna(e.target.value)}
                    placeholder="Ex: Gustavo Reis"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Número do Candidato *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={numeroCandidato}
                    onChange={(e) => setNumeroCandidato(e.target.value)}
                    placeholder="Ex: 55955"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Cargo Disputado *
                  </label>
                  <select className="input-field" value={cargo} onChange={(e) => setCargo(e.target.value)}>
                    <option value="Deputado Federal">Deputado Federal</option>
                    <option value="Deputado Estadual">Deputado Estadual</option>
                    <option value="Prefeito">Prefeito</option>
                    <option value="Vereador">Vereador</option>
                    <option value="Senador">Senador</option>
                    <option value="Governador">Governador</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Partido *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={partido}
                    onChange={(e) => setPartido(e.target.value)}
                    placeholder="Ex: PSD"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Nome Completo do Candidato
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    placeholder="Ex: Gustavo Henrique Reis dos Santos"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Cor do Tema
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="color"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      style={{ width: '40px', height: '38px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      className="input-field"
                      value={corPrimaria}
                      onChange={(e) => setCorPrimaria(e.target.value)}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Slogan da Campanha
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Ex: Trabalho, honestidade e compromisso"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Cidade / UF
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      className="input-field"
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Cidade"
                      style={{ flex: 2 }}
                    />
                    <input
                      type="text"
                      className="input-field"
                      value={estado}
                      onChange={(e) => setEstado(e.target.value)}
                      placeholder="UF"
                      style={{ flex: 1, textTransform: 'uppercase' }}
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              {/* Upload de Foto (Arquivo/Câmera ou URL) */}
              <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                    Foto Oficial do Candidato
                  </label>
                  <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.25)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      onClick={() => setFotoMode('upload')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '5px',
                        border: 'none',
                        background: fotoMode === 'upload' ? '#10b981' : 'transparent',
                        color: fotoMode === 'upload' ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: fotoMode === 'upload' ? 700 : 500,
                      }}
                    >
                      <Upload size={11} /> Subir Arquivo / Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setFotoMode('url')}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        borderRadius: '5px',
                        border: 'none',
                        background: fotoMode === 'url' ? '#10b981' : 'transparent',
                        color: fotoMode === 'url' ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: fotoMode === 'url' ? 700 : 500,
                      }}
                    >
                      <LinkIcon size={11} /> Inserir URL
                    </button>
                  </div>
                </div>

                {fotoMode === 'upload' ? (
                  <div>
                    {fotoUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <img
                          src={fotoUrl}
                          alt="Foto"
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Foto Carregada</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {fotoUrl}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <label
                            htmlFor="admin-upload-foto"
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Camera size={13} /> Trocar
                          </label>
                          <button
                            type="button"
                            onClick={() => setFotoUrl('')}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}
                            title="Remover"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <input
                          id="admin-upload-foto"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleFotoUpload}
                        />
                      </div>
                    ) : (
                      <label
                        htmlFor="admin-upload-foto"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '18px 12px',
                          borderRadius: '8px',
                          border: '2px dashed var(--border-color)',
                          background: 'rgba(15, 23, 42, 0.2)',
                          cursor: isUploadingFoto ? 'not-allowed' : 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <input
                          id="admin-upload-foto"
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={isUploadingFoto}
                          onChange={handleFotoUpload}
                        />
                        {isUploadingFoto ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Loader2 size={20} className="animate-spin" color="#10b981" />
                            <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>Enviando imagem...</span>
                          </div>
                        ) : (
                          <>
                            <Camera size={20} color="#10b981" style={{ marginBottom: '6px' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Toque para escolher foto (Câmera ou Galeria)
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              JPG, PNG, WEBP de alta qualidade
                            </span>
                          </>
                        )}
                      </label>
                    )}
                    {uploadErrorFoto && (
                      <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                        {uploadErrorFoto}
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      className="input-field"
                      value={fotoUrl}
                      onChange={(e) => setFotoUrl(e.target.value)}
                      placeholder="https://exemplo.com/foto-candidato.jpg"
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                      Ou cole o link direto da imagem na web
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Biografia & Histórico (Alimenta as respostas da IA)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={biografiaIa}
                  onChange={(e) => setBiografiaIa(e.target.value)}
                  placeholder="Histórico, trajetória e formação do candidato..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Propostas Oficiais por Tema
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={propostasIa}
                  onChange={(e) => setPropostasIa(e.target.value)}
                  placeholder="SAÚDE: ...\nEDUCAÇÃO: ...\nSEGURANÇA: ..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30, 41, 59, 0.4)', padding: '12px', borderRadius: '8px' }}>
                <input
                  type="checkbox"
                  id="chk-tornar-ativo"
                  checked={tornarAtivo}
                  onChange={(e) => setTornarAtivo(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <label htmlFor="chk-tornar-ativo" style={{ fontSize: '13px', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>
                  Definir imediatamente como o candidato oficial ativo no painel
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCandidateModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 18px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCandidate}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 700 }}
                >
                  {isSubmittingCandidate ? 'Salvando...' : 'Salvar Candidato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO USUÁRIO AUTH */}
      {isUserModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsUserModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', width: '95%', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', color: '#ffffff', margin: 0, fontWeight: 800 }}>Novo Usuário de Acesso</h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome Completo *</label>
                <input
                  type="text"
                  className="input-field"
                  value={userNome}
                  onChange={(e) => setUserNome(e.target.value)}
                  placeholder="Nome do operador"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>E-mail *</label>
                <input
                  type="email"
                  className="input-field"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="email@campanha.com.br"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Senha Inicial *</label>
                <input
                  type="password"
                  className="input-field"
                  value={userSenha}
                  onChange={(e) => setUserSenha(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>WhatsApp (Opcional)</label>
                <input
                  type="text"
                  className="input-field"
                  value={userWhatsapp}
                  onChange={(e) => setUserWhatsapp(e.target.value)}
                  placeholder="13999998888"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nível de Permissão (Role)</label>
                <select className="input-field" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                  <option value="OPERADOR">OPERADOR (Chat e Visualização)</option>
                  <option value="COORDENADOR">COORDENADOR (Lideranças e Metas)</option>
                  <option value="ADMIN">ADMINISTRADOR TOTAL (Acesso Completo)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn btn-secondary" style={{ padding: '10px 18px' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmittingUser} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                  {isSubmittingUser ? 'Criando...' : 'Criar Acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
