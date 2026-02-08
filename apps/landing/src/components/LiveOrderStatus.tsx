import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrderTracking, ORDER_STATUS_INFO } from '../hooks/useOrderTracking';

export const LiveOrderStatus = () => {
  const { activeOrder, isConnected, clearTracking } = useOrderTracking();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!activeOrder) return null;

  // Safety check - if status doesn't exist in ORDER_STATUS_INFO, use default
  const statusInfo = ORDER_STATUS_INFO[activeOrder.status] || {
    label: activeOrder.status || 'Bilinmiyor',
    emoji: '❓',
    color: 'bg-gray-500'
  };
  const isDelivery = activeOrder.type === 'DELIVERY';

  // Define order steps based on order type
  const steps = isDelivery
    ? ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']
    : ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'];

  const currentStepIndex = steps.indexOf(activeOrder.status);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className="relative">
      {/* Compact Badge */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusInfo.color} text-white text-sm font-display shadow-lg`}
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {statusInfo.emoji}
        </motion.span>
        <span className="hidden sm:inline">#{activeOrder.orderNumber}</span>
        <span>{statusInfo.label}</span>
        {isConnected && (
          <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse" title="Canlı bağlantı" />
        )}
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className={`${statusInfo.color} p-4 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">Sipariş</p>
                  <p className="text-2xl font-bold">#{activeOrder.orderNumber}</p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-4xl"
                >
                  {statusInfo.emoji}
                </motion.div>
              </div>
              <p className="mt-2 text-lg font-display">{statusInfo.label}</p>
            </div>

            {/* Progress Bar */}
            <div className="px-4 py-3 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>İlerleme</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className={`h-full ${statusInfo.color}`}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="p-4">
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const stepInfo = ORDER_STATUS_INFO[step as keyof typeof ORDER_STATUS_INFO] || {
                    label: step,
                    emoji: '❓',
                    color: 'bg-gray-500'
                  };
                  const isActive = index <= currentStepIndex;
                  const isCurrent = step === activeOrder.status;

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          isActive
                            ? isCurrent
                              ? `${statusInfo.color} text-white`
                              : 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isActive && !isCurrent ? '✓' : stepInfo.emoji}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            isActive ? 'text-gray-800' : 'text-gray-400'
                          }`}
                        >
                          {stepInfo.label}
                        </p>
                      </div>
                      {isCurrent && (
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="text-xs text-gray-500"
                        >
                          Şimdi
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {isConnected ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Canlı güncelleme</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span>Bağlanıyor...</span>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  clearTracking();
                  setIsExpanded(false);
                }}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Takibi Kapat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

