'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { Send, Search, X, Gift, Calendar, Ticket } from 'lucide-react';

export default function Home() {
  const [raffle, setRaffle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [randomCount, setRandomCount] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    paymentMethod: 'nequi'
  });

  useEffect(() => {
    fetchRaffle();
  }, []);

  const fetchRaffle = async () => {
    try {
      const res = await fetch('/api/raffle');
      const data = await res.json();
      if (!res.ok || data.error) {
        setRaffle(null);
      } else {
        setRaffle(data);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const toggleNumber = (num) => {
    if (num.status !== 'AVAILABLE') return;
    setCart(prev => {
      const exists = prev.find(item => item.id === num.id);
      if (exists) return prev.filter(item => item.id !== num.id);
      else return [...prev, num];
    });
  };

  const handleRandomPick = () => {
    const availableNumbers = raffle.numbers.filter(n => n.status === 'AVAILABLE' && !cart.find(c => c.id === n.id));
    if (availableNumbers.length < randomCount) {
      alert(`Solo hay ${availableNumbers.length} números disponibles.`);
      return;
    }
    
    // Shuffle and pick
    const shuffled = [...availableNumbers].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, randomCount);
    
    setCart(prev => [...prev, ...picked]);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Selecciona al menos un número.");
    if (!formData.name || !formData.phone) return alert("Completa tus datos.");

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          numbers: cart.map(n => n.value),
          raffleId: raffle.id
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Error al apartar números");
        return;
      }
      
      const pData = await res.json();
      const ticketId = `TCK-${String(pData.id).padStart(4, '0')}`;
      const total = cart.length * raffle.pricePerNumber;
      
      // Formatting numbers to string with correct padding
      const padLength = raffle.digits || 2;
      const formattedNumbers = cart.map(n => String(n.value).padStart(padLength, '0')).join(', ');
      
      // Formal Ticket message
      const message = `🎫 *TICKET DE COMPRA: ${ticketId}*\n` +
                      `----------------------------------\n` +
                      `🏆 *Sorteo:* ${raffle.prizes || raffle.name}\n` +
                      `🎲 *Lotería:* ${raffle.lotteryName}\n` +
                      `📅 *Fecha:* ${raffle.drawDate}\n` +
                      `----------------------------------\n` +
                      `👤 *Cliente:* ${formData.name}\n` +
                      `🔢 *Números:* ${formattedNumbers}\n` +
                      `💵 *Total:* $${total.toLocaleString('es-CO')}\n` +
                      `💳 *Método:* ${formData.paymentMethod.toUpperCase()}\n\n` +
                      `Por favor, envía tu comprobante de pago respondiendo a este mensaje para validar tu ticket. ¡Mucha suerte! 🍀`;
      
      const whatsappUrl = `https://wa.me/573000000000?text=${encodeURIComponent(message)}`;
      
      setCart([]);
      setShowCheckout(false);
      setFormData({ name: '', phone: '', paymentMethod: 'nequi' });
      await fetchRaffle();
      
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error.");
    }
  };

  if (loading) return <div style={{padding:40, textAlign:'center'}}>Cargando plataforma...</div>;
  if (!raffle) return <div className={styles.container}>No hay rifas activas.</div>;

  const totalAmount = cart.length * raffle.pricePerNumber;
  const winnersList = raffle.winners ? raffle.winners.split(',') : [];
  const padLength = raffle.digits || 2;

  const filteredNumbers = raffle.numbers.filter(num => {
    if (!search) return true;
    const strVal = String(num.value).padStart(padLength, '0');
    return strVal.includes(search);
  });

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{raffle.name}</h1>
        
        {raffle.prizes && (
          <div style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, #ff4d4d 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '16px',
            margin: '20px auto',
            maxWidth: '500px',
            boxShadow: '0 10px 25px rgba(255, 77, 77, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Gift size={32} />
              <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800, textTransform: 'uppercase' }}>Gran Premio</h2>
            </div>
            <p style={{ fontSize: '1.4rem', fontWeight: 600, margin: 0, textAlign: 'center' }}>
              {raffle.prizes}
            </p>
          </div>
        )}

        <div className={styles.lotteryInfo}>
          {raffle.lotteryName && <span className={styles.lotteryBadge}><Ticket size={16}/> Juega con: {raffle.lotteryName}</span>}
          {raffle.launchDate && <span className={styles.lotteryBadge}><Calendar size={16}/> Inicio: {raffle.launchDate}</span>}
          {raffle.drawDate && <span className={styles.lotteryBadge}><Calendar size={16}/> Sorteo: {raffle.drawDate}</span>}
        </div>
        <p style={{marginTop: 16, color: 'var(--text-secondary)', fontSize: '1.2rem'}}>
          Valor por número: <b style={{color: 'var(--text-primary)'}}>${raffle.pricePerNumber.toLocaleString('es-CO')}</b>
        </p>
      </header>

      {raffle.winningNumber && (
        <div style={{background:'rgba(245, 158, 11, 0.1)', border:'1px solid var(--warning)', padding:16, borderRadius:12, textAlign:'center', marginBottom:24}}>
          <h2 style={{color:'var(--warning)'}}>🎉 ¡Resultados del Sorteo! 🎉</h2>
          <p>El número ganador oficial de la lotería fue: <b>{raffle.winningNumber}</b></p>
        </div>
      )}

      <div className={styles.searchBar}>
        <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', maxWidth: '800px', justifyContent: 'center'}}>
          <div style={{position: 'relative', flex: '1 1 300px', minWidth: '250px'}}>
            <Search size={20} style={{position: 'absolute', left: 16, top: 14, color: 'var(--text-secondary)'}}/>
            <input 
              type="number" 
              placeholder="Buscar tu número de la suerte..." 
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{width: '100%'}}
            />
          </div>
          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
            <select 
              className={styles.searchInput} 
              style={{width: 'auto', paddingLeft: 16, cursor: 'pointer'}}
              value={randomCount}
              onChange={(e) => setRandomCount(Number(e.target.value))}
            >
              <option value={1}>1 al azar</option>
              <option value={2}>2 al azar</option>
              <option value={3}>3 al azar</option>
              <option value={5}>5 al azar</option>
              <option value={10}>10 al azar</option>
            </select>
            <button 
              className="btn-primary" 
              onClick={handleRandomPick}
              style={{padding: '12px 20px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8}}
            >
              <Gift size={18}/> ¡Sorpréndeme!
            </button>
          </div>
        </div>
      </div>

      <div className={styles.statusLegend}>
        <div className={styles.legendItem}><div className={`${styles.legendDot} ${styles['dot-available']}`}></div> Disponible</div>
        <div className={styles.legendItem}><div className={`${styles.legendDot} ${styles['dot-pending']}`}></div> Pendiente</div>
        <div className={styles.legendItem}><div className={`${styles.legendDot} ${styles['dot-paid']}`}></div> Pagado</div>
      </div>

      <div className={styles.grid}>
        {filteredNumbers.map(num => {
          const isSelected = cart.find(item => item.id === num.id);
          const isWinner = winnersList.includes(String(num.value));
          
          let btnClass = styles.numberBtn;
          if (isWinner) btnClass += ` ${styles.winner}`;
          else if (isSelected) btnClass += ` ${styles.selected}`;
          else if (num.status === 'AVAILABLE') btnClass += ` ${styles.available}`;
          else if (num.status === 'PENDING') btnClass += ` ${styles.pending}`;
          else if (num.status === 'PAID') btnClass += ` ${styles.paid}`;

          return (
            <button
              key={num.id}
              className={btnClass}
              onClick={() => toggleNumber(num)}
              disabled={num.status !== 'AVAILABLE'}
            >
              {String(num.value).padStart(padLength, '0')}
            </button>
          );
        })}
        {filteredNumbers.length === 0 && (
          <div style={{gridColumn:'1/-1', textAlign:'center', padding:40, color:'var(--text-secondary)'}}>
            No se encontró el número {search}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className={styles.bottomCart}>
          <div className={styles.cartContainer}>
            <div className={styles.cartInfo}>
              <span className={styles.cartItems}>{cart.length} número{cart.length > 1 ? 's' : ''}</span>
              <span className={styles.cartTotal}>${totalAmount.toLocaleString('es-CO')}</span>
            </div>
            <button className={styles.checkoutBtn} onClick={() => setShowCheckout(true)}>
              Pagar y Apartar
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Completar Reserva</h2>
              <button className={styles.closeBtn} onClick={() => setShowCheckout(false)}><X size={20}/></button>
            </div>
            
            <p style={{marginBottom: 16, color: 'var(--text-secondary)'}}>
              Estás llevando {cart.length} número(s): <b>{cart.map(n => String(n.value).padStart(padLength, '0')).join(', ')}</b>
            </p>

            <form onSubmit={handleCheckout}>
              <div className={styles.formGroup}>
                <label>Nombre Completo</label>
                <input required type="text" placeholder="Ej. Juan Pérez" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>WhatsApp</label>
                <input required type="tel" placeholder="300 123 4567" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className={styles.formGroup}>
                <label>Método de Pago</label>
                <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                  <option value="nequi">Transferencia Nequi</option>
                  <option value="efectivo">Pago en Efectivo</option>
                </select>
              </div>
              <button type="submit" className={styles.submitBtn}>
                <Send size={20}/> Generar Ticket por WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
