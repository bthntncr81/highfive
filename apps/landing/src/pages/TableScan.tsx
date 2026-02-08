import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../lib/cartStore';
import { orderApi } from '../lib/api';

export const TableScan = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { setTableSession } = useCart();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tableId) {
      fetchTableAndRedirect();
    } else {
      navigate('/menu');
    }
  }, [tableId]);

  const fetchTableAndRedirect = async () => {
    try {
      const response = await orderApi.getTable(tableId!);
      
      if (response.success && response.data?.table) {
        const table = response.data.table;
        // Save table session to context + localStorage (including session token)
        setTableSession({
          id: table.id,
          number: table.number,
          name: table.name,
          sessionToken: table.sessionToken || '', // Store session token for order validation
        });
        // Redirect to menu
        navigate('/menu');
      } else {
        setError('Masa bulunamadı. Lütfen QR kodu tekrar okutun.');
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-diner-cream flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-diner p-8 text-center max-w-md w-full shadow-retro"
        >
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="font-display text-2xl text-diner-chocolate mb-4">
            {error}
          </h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/menu')}
            className="btn-primary w-full"
          >
            Menüye Git
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-diner-cream flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="text-7xl mb-4"
        >
          🍕
        </motion.div>
        <p className="font-display text-xl text-diner-chocolate">
          Masa yükleniyor...
        </p>
      </motion.div>
    </div>
  );
};

