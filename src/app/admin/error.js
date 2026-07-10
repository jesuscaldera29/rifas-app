'use client';

export default function AdminError({ error, reset }) {
  return (
    <div style={{
      maxWidth: 600,
      margin: '80px auto',
      padding: 40,
      textAlign: 'center',
      background: 'var(--surface-color)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: 16 }}>⚠️ Error al cargar el panel</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
        {error?.message || 'Ocurrió un error inesperado. Verifica la conexión a la base de datos.'}
      </p>
      <button
        onClick={() => reset()}
        style={{
          padding: '12px 32px',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
