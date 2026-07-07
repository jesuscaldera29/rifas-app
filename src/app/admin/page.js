'use client';

import { useState, useEffect } from 'react';
import styles from './admin.module.css';
import { Users, LayoutGrid, Trophy, Settings, Ticket, Save, X } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [raffle, setRaffle] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState('participants'); // participants, draw, settings
  const [loading, setLoading] = useState(true);
  
  const [lotteryResult, setLotteryResult] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    name: '', lotteryName: '', drawDate: '', launchDate: '', prizes: '', digits: 2
  });
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/raffle');
      const data = await res.json();
      setRaffle(data);
      if (data) {
        setSettingsForm({
          name: data.name || '',
          lotteryName: data.lotteryName || '',
          drawDate: data.drawDate || '',
          launchDate: data.launchDate || '',
          prizes: data.prizes || '',
          digits: data.digits || 2
        });
      }

      if (data && data.id) {
        const pRes = await fetch(`/api/participants?raffleId=${data.id}`);
        const pData = await pRes.json();
        setParticipants(pData);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const updateStatus = async (numberId, newStatus) => {
    try {
      await fetch('/api/numbers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberIds: [numberId], status: newStatus })
      });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Error actualizando estado");
    }
  };

  const handleDrawWinners = async (e) => {
    e.preventDefault();
    if (!lotteryResult) return alert("Ingresa el número ganador de la lotería");
    if (!confirm(`¿Estás seguro de registrar el número ${lotteryResult} como ganador oficial de la lotería?`)) return;
    
    try {
      await fetch('/api/raffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DRAW_WINNERS', payload: { raffleId: raffle.id, winningNumber: lotteryResult } })
      });
      setLotteryResult('');
      fetchData();
      alert("Ganadores registrados correctamente.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/raffle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: raffle.id, ...settingsForm })
      });
      fetchData();
      alert("Ajustes guardados");
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    }
  };

  const handleGenerateNumbers = async () => {
    if (!confirm(`⚠️ ¡ADVERTENCIA! Vas a borrar TODOS los números actuales y sus reservaciones. Se generarán ${Math.pow(10, settingsForm.digits)} números nuevos. ¿Estás absolutamente seguro?`)) return;
    
    try {
      const res = await fetch('/api/raffle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GENERATE_NUMBERS', payload: { raffleId: raffle.id } })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      alert(`¡Talonarios regenerados! Se crearon ${data.generated} números.`);
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Error al regenerar talonarios: " + error.message);
    }
  };

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Cargando panel...</div>;
  if (!raffle) return <div>No hay rifas activas</div>;

  const totalCollected = raffle.numbers.filter(n => n.status === 'PAID').length * raffle.pricePerNumber;
  const pendingCount = raffle.numbers.filter(n => n.status === 'PENDING').length;
  const paidCount = raffle.numbers.filter(n => n.status === 'PAID').length;
  const padLength = raffle.digits || 2;

  return (
    <div className={styles.adminContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Administración - {raffle.name}</h1>
        <Link href="/" className="btn-primary" style={{background: 'var(--surface-color)', border: '1px solid rgba(255,255,255,0.1)'}}>
          <LayoutGrid size={18} /> Ver Tienda
        </Link>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Recaudado</span>
          <span className={styles.statValue} style={{color: 'var(--accent)'}}>${totalCollected.toLocaleString('es-CO')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Validados</span>
          <span className={styles.statValue}>{paidCount}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>En Revisión</span>
          <span className={styles.statValue} style={{color: 'var(--warning)'}}>{pendingCount}</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'participants' ? styles.tabActive : ''}`} onClick={() => setActiveTab('participants')}>
          <Users size={16} style={{display:'inline', marginRight: 8, marginBottom: '-2px'}}/> Participantes
        </button>
        <button className={`${styles.tab} ${activeTab === 'draw' ? styles.tabActive : ''}`} onClick={() => setActiveTab('draw')}>
          <Trophy size={16} style={{display:'inline', marginRight: 8, marginBottom: '-2px'}}/> Sorteo
        </button>
        <button className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={16} style={{display:'inline', marginRight: 8, marginBottom: '-2px'}}/> Ajustes
        </button>
      </div>

      {activeTab === 'participants' && (
        <div style={{overflowX: 'auto'}}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Números</th>
                <th>Ticket</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight: 600}}>{p.name}</td>
                  <td>
                    <a href={`https://wa.me/57${p.phone}`} target="_blank" className={styles.whatsappBtn}>
                      WA: {p.phone}
                    </a>
                  </td>
                  <td>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                      {p.numbers.map(n => (
                        <div key={n.id} style={{display: 'flex', alignItems: 'center', gap: 12}}>
                          <span className={`badge badge-${n.status.toLowerCase()}`}>
                            #{String(n.value).padStart(padLength, '0')} - {n.status === 'PAID' ? 'PAGADO' : (n.status === 'PENDING' ? 'PENDIENTE' : n.status)}
                          </span>
                          <select 
                            className={styles.actionSelect}
                            value={n.status}
                            onChange={(e) => updateStatus(n.id, e.target.value)}
                          >
                            <option value="PENDING">Pendiente de Pago</option>
                            <option value="PAID">Pagado (Confirmado)</option>
                            <option value="AVAILABLE">Cancelar / Liberar</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className={styles.ticketBtn} onClick={() => setSelectedTicket(p)}>
                      <Ticket size={16}/> Ver Ticket
                    </button>
                  </td>
                  <td style={{color: 'var(--text-secondary)'}}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: 40}}>No hay participantes aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className={styles.sectionBox}>
          <h2>Ajustes de la Rifa</h2>
          <form onSubmit={handleSaveSettings} style={{marginTop: 24}}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Nombre Principal de la Rifa</label>
                <input required type="text" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Lotería que Juega (Ej: Sinuano Noche)</label>
                <input required type="text" value={settingsForm.lotteryName} onChange={e => setSettingsForm({...settingsForm, lotteryName: e.target.value})} />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Premios a Sortear</label>
                <input required type="text" value={settingsForm.prizes} onChange={e => setSettingsForm({...settingsForm, prizes: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Fecha de Lanzamiento</label>
                <input type="text" placeholder="Ej: 1 de Junio" value={settingsForm.launchDate} onChange={e => setSettingsForm({...settingsForm, launchDate: e.target.value})} />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Fecha del Sorteo</label>
                <input required type="text" value={settingsForm.drawDate} onChange={e => setSettingsForm({...settingsForm, drawDate: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Cantidad de Cifras (Números)</label>
                <select value={settingsForm.digits} onChange={e => setSettingsForm({...settingsForm, digits: parseInt(e.target.value)})}>
                  <option value={2}>2 Cifras (00-99) - 100 Números</option>
                  <option value={3}>3 Cifras (000-999) - 1000 Números</option>
                  <option value={4}>4 Cifras (0000-9999) - 10000 Números</option>
                </select>
              </div>
            </div>
            
            <div style={{display: 'flex', gap: 16, marginTop: 24}}>
              <button type="submit" className="btn-primary" style={{flex: 1}}>
                <Save size={18}/> Guardar Cambios
              </button>
              <button type="button" onClick={handleGenerateNumbers} className="btn-primary" style={{flex: 1, backgroundColor: 'var(--warning)', borderColor: 'var(--warning)'}}>
                <Ticket size={18}/> Generar Talonarios
              </button>
            </div>
            <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8}}>
              * Para crear o actualizar los números de la tienda con la cantidad de cifras seleccionada, debes presionar "Generar Talonarios".
            </p>
          </form>
        </div>
      )}

      {activeTab === 'draw' && (
        <div className={styles.sectionBox} style={{textAlign: 'center'}}>
          <Trophy size={64} style={{color: 'var(--warning)', margin: '0 auto 24px'}} />
          <h2>Registrar Número Ganador Oficial</h2>
          <p style={{color: 'var(--text-secondary)', marginBottom: 24, marginTop: 8}}>
            Escribe el número completo que salió en la <b>{raffle.lotteryName}</b>. El sistema buscará a los participantes que tengan las últimas {padLength} cifras iguales y los declarará ganadores.
          </p>
          
          <form onSubmit={handleDrawWinners} style={{display: 'flex', gap: 16, justifyContent: 'center', maxWidth: 400, margin: '0 auto'}}>
            <input 
              type="number" 
              required
              placeholder="Ej. 4598"
              className={styles.actionSelect}
              style={{flex: 1, padding: '12px 16px', fontSize: '1.2rem'}}
              value={lotteryResult}
              onChange={e => setLotteryResult(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{padding: '12px 24px'}}>
              Confirmar
            </button>
          </form>

          {raffle.winningNumber && (
            <div className={styles.winnerBox}>
              <h3>Número de la Lotería: {raffle.winningNumber}</h3>
              <p style={{marginTop: 8}}>Los ganadores de la rifa son los que tengan los números: <b>{raffle.winners.split(',').map(w => `#${String(w).padStart(padLength, '0')}`).join(' ')}</b></p>
            </div>
          )}
        </div>
      )}

      {/* Ticket Modal */}
      {selectedTicket && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTicket(null)}>
          <div className={styles.ticketCard} onClick={e => e.stopPropagation()}>
            <button className={styles.closeModalBtn} onClick={() => setSelectedTicket(null)}><X size={16}/></button>
            <div className={styles.ticketHeader}>
              <h3>TICKET #{String(selectedTicket.id).padStart(4, '0')}</h3>
              <p style={{fontSize: '0.8rem', opacity: 0.8}}>{raffle.name}</p>
            </div>
            <div className={styles.ticketBody}>
              <div className={styles.ticketRow}><span>Cliente:</span> <b>{selectedTicket.name}</b></div>
              <div className={styles.ticketRow}><span>Teléfono:</span> <b>{selectedTicket.phone}</b></div>
              <div className={styles.ticketRow}><span>Fecha:</span> <b>{new Date(selectedTicket.createdAt).toLocaleDateString()}</b></div>
              <div className={styles.ticketRow}><span>Sorteo:</span> <b>{raffle.drawDate}</b></div>
              <div className={styles.ticketRow}><span>Lotería:</span> <b>{raffle.lotteryName}</b></div>
              
              <div className={styles.ticketNumbers}>
                {selectedTicket.numbers.map(n => String(n.value).padStart(padLength, '0')).join(' - ')}
              </div>
              
              <div className={styles.ticketTotal}>
                Total: ${(selectedTicket.numbers.length * raffle.pricePerNumber).toLocaleString('es-CO')}
              </div>
              <div className={styles.ticketFooter}>
                <b>Premios:</b> {raffle.prizes} <br/>
                ¡Conserva este comprobante!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
